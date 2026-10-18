import "server-only";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { productVariants, saleItems, sales, users } from "@/db/schema";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { applyMovement } from "./stock";
import { writeAudit } from "./audit";

const toCents = (v: string | number): number => Math.round(Number(v) * 100);
const fromCents = (c: number): string => (c / 100).toFixed(2);

export interface SaleLineInput {
  variantId: string;
  qty: number;
}

export interface CreateSaleInput {
  employeeId: string;
  employeeEmail: string;
  customerName?: string | null;
  discount?: string; // money, defaults "0"
  items: SaleLineInput[];
  ipAddress?: string | null;
}

/**
 * Ring up a sale: within one transaction, lock and deduct each variant's stock
 * (rejecting oversell), snapshot price/sku/name onto the line, write the sale
 * and its items, and audit it. The whole thing is atomic — a failure on line 3
 * rolls back the deductions from lines 1 and 2.
 */
export async function createSale(input: CreateSaleInput) {
  if (input.items.length === 0) throw new BusinessRuleError("A sale needs at least one item.");

  return db.transaction(async (tx) => {
    let subtotalCents = 0;
    const lines: { variantId: string; sku: string; name: string; unitPrice: string; qty: number; lineTotal: string }[] = [];

    for (const item of input.items) {
      if (item.qty <= 0) throw new BusinessRuleError("Item quantity must be positive.");

      // Snapshot the sellable details. FOR UPDATE happens inside applyMovement,
      // but we read the price here (same row, same tx) for the line snapshot.
      const [variant] = await tx
        .select({
          sku: productVariants.sku,
          variantName: productVariants.variantName,
          price: productVariants.price,
        })
        .from(productVariants)
        .where(eq(productVariants.id, item.variantId));
      if (!variant) throw new NotFoundError("Variant");

      const priceCents = toCents(variant.price);
      if (priceCents <= 0) throw new BusinessRuleError(`${variant.sku} has no selling price set.`);

      const lineCents = priceCents * item.qty;
      subtotalCents += lineCents;

      // Deduct stock (locks the row, guards negative).
      await applyMovement(tx, {
        variantId: item.variantId,
        delta: -item.qty,
        reason: "SALE",
        refType: "sale",
        createdBy: input.employeeId,
      });

      lines.push({
        variantId: item.variantId,
        sku: variant.sku,
        name: variant.variantName,
        unitPrice: variant.price,
        qty: item.qty,
        lineTotal: fromCents(lineCents),
      });
    }

    const discountCents = toCents(input.discount ?? "0");
    if (discountCents < 0) throw new BusinessRuleError("Discount cannot be negative.");
    if (discountCents > subtotalCents) throw new BusinessRuleError("Discount cannot exceed the subtotal.");
    const totalCents = subtotalCents - discountCents;

    const [sale] = await tx
      .insert(sales)
      .values({
        employeeId: input.employeeId,
        customerName: input.customerName?.trim() || null,
        subtotal: fromCents(subtotalCents),
        discount: fromCents(discountCents),
        total: fromCents(totalCents),
        status: "COMPLETED",
      })
      .returning();

    await tx.insert(saleItems).values(lines.map((l) => ({ ...l, saleId: sale.id })));

    await writeAudit(tx, {
      actorId: input.employeeId,
      actorEmail: input.employeeEmail,
      action: "SALE_CREATE",
      entity: "sale",
      entityId: sale.id,
      detail: { saleNumber: sale.saleNumber, total: sale.total, lines: lines.length },
      ipAddress: input.ipAddress,
    });

    return sale;
  });
}

/** Void a completed sale: return every line's stock and mark it VOID. */
export async function voidSale(params: {
  saleId: string;
  reason: string;
  userId: string;
  userEmail: string;
  ipAddress?: string | null;
}) {
  return db.transaction(async (tx) => {
    const [sale] = await tx.select().from(sales).where(eq(sales.id, params.saleId)).for("update");
    if (!sale) throw new NotFoundError("Sale");
    if (sale.status === "VOID") throw new BusinessRuleError("Sale is already voided.");

    const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, sale.id));
    for (const item of items) {
      await applyMovement(tx, {
        variantId: item.variantId,
        delta: item.qty,
        reason: "SALE_VOID",
        refType: "sale",
        refId: sale.id,
        note: `Void: ${params.reason}`,
        createdBy: params.userId,
      });
    }

    const [updated] = await tx
      .update(sales)
      .set({ status: "VOID", voidReason: params.reason, voidedBy: params.userId, voidedAt: new Date() })
      .where(eq(sales.id, sale.id))
      .returning();

    await writeAudit(tx, {
      actorId: params.userId,
      actorEmail: params.userEmail,
      action: "SALE_VOID",
      entity: "sale",
      entityId: sale.id,
      detail: { saleNumber: sale.saleNumber, reason: params.reason },
      ipAddress: params.ipAddress,
    });

    return updated;
  });
}

export interface SaleListRow {
  id: string;
  saleNumber: number;
  employeeName: string;
  customerName: string | null;
  total: string;
  status: (typeof sales.status.enumValues)[number];
  createdAt: Date;
}

export async function listSales(filters?: { from?: Date; to?: Date; employeeId?: string }): Promise<SaleListRow[]> {
  const conds = [];
  if (filters?.from) conds.push(gte(sales.createdAt, filters.from));
  if (filters?.to) conds.push(lte(sales.createdAt, filters.to));
  if (filters?.employeeId) conds.push(eq(sales.employeeId, filters.employeeId));

  return db
    .select({
      id: sales.id,
      saleNumber: sales.saleNumber,
      employeeName: users.fullName,
      customerName: sales.customerName,
      total: sales.total,
      status: sales.status,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .innerJoin(users, eq(users.id, sales.employeeId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(sales.createdAt))
    .limit(500);
}

export async function getSale(id: string) {
  const [sale] = await db
    .select({
      id: sales.id,
      saleNumber: sales.saleNumber,
      employeeName: users.fullName,
      customerName: sales.customerName,
      subtotal: sales.subtotal,
      discount: sales.discount,
      total: sales.total,
      status: sales.status,
      voidReason: sales.voidReason,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .innerJoin(users, eq(users.id, sales.employeeId))
    .where(eq(sales.id, id));
  if (!sale) throw new NotFoundError("Sale");
  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
  return { ...sale, items };
}
