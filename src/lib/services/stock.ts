import "server-only";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { productVariants, products, stockMovements } from "@/db/schema";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import type { DbOrTx } from "./audit";

type Reason = (typeof stockMovements.reason.enumValues)[number];

export interface MovementInput {
  variantId: string;
  delta: number; // + in, - out
  reason: Reason;
  refType?: string | null;
  refId?: string | null;
  note?: string | null;
  createdBy?: string | null;
}

/**
 * Apply one stock delta atomically: lock the variant row, guard against going
 * negative, update the running quantity, and append the ledger movement.
 * Sales and adjustments both funnel through here so the ledger never lies.
 * MUST be called inside a transaction (it takes FOR UPDATE on the variant).
 */
export async function applyMovement(tx: DbOrTx, input: MovementInput): Promise<number> {
  const [variant] = await tx
    .select({ id: productVariants.id, stockQty: productVariants.stockQty })
    .from(productVariants)
    .where(eq(productVariants.id, input.variantId))
    .for("update");

  if (!variant) throw new NotFoundError("Variant");

  const balanceAfter = variant.stockQty + input.delta;
  if (balanceAfter < 0) {
    throw new BusinessRuleError(
      `Not enough stock: have ${variant.stockQty}, need ${Math.abs(input.delta)}.`,
    );
  }

  await tx
    .update(productVariants)
    .set({ stockQty: balanceAfter, updatedAt: new Date() })
    .where(eq(productVariants.id, input.variantId));

  await tx.insert(stockMovements).values({
    variantId: input.variantId,
    delta: input.delta,
    balanceAfter,
    reason: input.reason,
    refType: input.refType ?? null,
    refId: input.refId ?? null,
    note: input.note ?? null,
    createdBy: input.createdBy ?? null,
  });

  return balanceAfter;
}

/** Manual correction: set the on-hand count to `targetQty`. Records the delta. */
export async function setStockCount(params: {
  variantId: string;
  targetQty: number;
  note?: string | null;
  userId: string;
}): Promise<number> {
  return db.transaction(async (tx) => {
    const [variant] = await tx
      .select({ stockQty: productVariants.stockQty })
      .from(productVariants)
      .where(eq(productVariants.id, params.variantId))
      .for("update");
    if (!variant) throw new NotFoundError("Variant");

    const delta = params.targetQty - variant.stockQty;
    if (delta === 0) return variant.stockQty;

    return applyMovement(tx, {
      variantId: params.variantId,
      delta,
      reason: "ADJUSTMENT",
      note: params.note,
      createdBy: params.userId,
    });
  });
}

/** Add stock (receiving new pieces). */
export async function restock(params: {
  variantId: string;
  qty: number;
  note?: string | null;
  userId: string;
}): Promise<number> {
  if (params.qty <= 0) throw new BusinessRuleError("Restock quantity must be positive.");
  return db.transaction((tx) =>
    applyMovement(tx, {
      variantId: params.variantId,
      delta: params.qty,
      reason: "RESTOCK",
      note: params.note,
      createdBy: params.userId,
    }),
  );
}

export interface StockRow {
  variantId: string;
  sku: string;
  variantName: string;
  productName: string;
  price: string;
  stockQty: number;
  reorderPoint: number;
  isLow: boolean;
}

function stockSelect() {
  return db
    .select({
      variantId: productVariants.id,
      sku: productVariants.sku,
      variantName: productVariants.variantName,
      productName: products.name,
      price: productVariants.price,
      stockQty: productVariants.stockQty,
      reorderPoint: productVariants.reorderPoint,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId));
}

/** Every variant with its on-hand count, for the stock page. */
export async function listStock(): Promise<StockRow[]> {
  const rows = await stockSelect().orderBy(products.name, productVariants.variantName);
  return rows.map((r) => ({ ...r, isLow: r.stockQty <= r.reorderPoint }));
}

/** Variants at or below their reorder point (reorder point > 0). */
export async function lowStock(): Promise<StockRow[]> {
  const rows = await stockSelect()
    .where(and(sql`${productVariants.reorderPoint} > 0`, lte(productVariants.stockQty, productVariants.reorderPoint)))
    .orderBy(productVariants.stockQty);
  return rows.map((r) => ({ ...r, isLow: true }));
}

export async function lowStockCount(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(productVariants)
    .where(and(sql`${productVariants.reorderPoint} > 0`, lte(productVariants.stockQty, productVariants.reorderPoint)));
  return row?.n ?? 0;
}

export interface MovementRow {
  id: string;
  delta: number;
  balanceAfter: number;
  reason: Reason;
  note: string | null;
  createdAt: Date;
}

export async function listMovements(variantId: string, limit = 100): Promise<MovementRow[]> {
  return db
    .select({
      id: stockMovements.id,
      delta: stockMovements.delta,
      balanceAfter: stockMovements.balanceAfter,
      reason: stockMovements.reason,
      note: stockMovements.note,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .where(eq(stockMovements.variantId, variantId))
    .orderBy(desc(stockMovements.createdAt))
    .limit(limit);
}
