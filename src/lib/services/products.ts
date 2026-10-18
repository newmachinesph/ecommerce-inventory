import "server-only";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, productVariants, products } from "@/db/schema";
import { NotFoundError } from "@/lib/errors";
import { applyMovement } from "./stock";

/* ------------------------------ categories ---------------------------- */

export async function listCategories() {
  return db.select().from(categories).orderBy(categories.name);
}

export async function createCategory(name: string) {
  const [row] = await db.insert(categories).values({ name }).returning();
  return row;
}

/* ------------------------------- products ----------------------------- */

export interface ProductListRow {
  id: string;
  name: string;
  brand: string | null;
  categoryName: string | null;
  isActive: boolean;
  variantCount: number;
  totalStock: number;
}

export async function listProducts(): Promise<ProductListRow[]> {
  return db
    .select({
      id: products.id,
      name: products.name,
      brand: products.brand,
      categoryName: categories.name,
      isActive: products.isActive,
      variantCount: sql<number>`count(${productVariants.id})::int`,
      totalStock: sql<number>`coalesce(sum(${productVariants.stockQty}), 0)::int`,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .groupBy(products.id, categories.name)
    .orderBy(products.name);
}

export interface VariantInput {
  sku: string;
  variantName?: string;
  attributes?: Record<string, string>;
  barcode?: string | null;
  price: string;
  cost?: string;
  stockQty?: number;
  reorderPoint?: number;
}

export interface CreateProductInput {
  name: string;
  description?: string | null;
  brand?: string | null;
  categoryId?: string | null;
  variants: VariantInput[];
  userId: string;
}

/** Create a product with its variants; opening stock becomes an INITIAL movement. */
export async function createProduct(input: CreateProductInput) {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .insert(products)
      .values({
        name: input.name,
        description: input.description ?? null,
        brand: input.brand ?? null,
        categoryId: input.categoryId ?? null,
      })
      .returning();

    for (const v of input.variants) {
      const [variant] = await tx
        .insert(productVariants)
        .values({
          productId: product.id,
          sku: v.sku,
          variantName: v.variantName?.trim() || "Default",
          attributes: v.attributes ?? {},
          barcode: v.barcode ?? null,
          price: v.price,
          cost: v.cost ?? "0",
          reorderPoint: v.reorderPoint ?? 0,
          stockQty: 0, // set via the ledger below so opening stock is auditable
        })
        .returning();

      if (v.stockQty && v.stockQty > 0) {
        await applyMovement(tx, {
          variantId: variant.id,
          delta: v.stockQty,
          reason: "INITIAL",
          note: "Opening stock",
          createdBy: input.userId,
        });
      }
    }

    return product;
  });
}

export async function getProduct(id: string) {
  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) throw new NotFoundError("Product");
  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, id))
    .orderBy(productVariants.variantName);
  return { ...product, variants };
}

export async function updateProduct(
  id: string,
  fields: Partial<{ name: string; description: string | null; brand: string | null; categoryId: string | null; isActive: boolean }>,
) {
  const [row] = await db
    .update(products)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(products.id, id))
    .returning();
  if (!row) throw new NotFoundError("Product");
  return row;
}

/** Add a variant to an existing product. Opening stock is ledgered. */
export async function addVariant(productId: string, v: VariantInput, userId: string) {
  return db.transaction(async (tx) => {
    const [variant] = await tx
      .insert(productVariants)
      .values({
        productId,
        sku: v.sku,
        variantName: v.variantName?.trim() || "Default",
        attributes: v.attributes ?? {},
        barcode: v.barcode ?? null,
        price: v.price,
        cost: v.cost ?? "0",
        reorderPoint: v.reorderPoint ?? 0,
        stockQty: 0,
      })
      .returning();
    if (v.stockQty && v.stockQty > 0) {
      await applyMovement(tx, {
        variantId: variant.id,
        delta: v.stockQty,
        reason: "INITIAL",
        note: "Opening stock",
        createdBy: userId,
      });
    }
    return variant;
  });
}

/** Edit variant fields. Does NOT touch stock_qty — use the stock service for that. */
export async function updateVariant(
  id: string,
  fields: Partial<{ sku: string; variantName: string; attributes: Record<string, string>; barcode: string | null; price: string; cost: string; reorderPoint: number; isActive: boolean }>,
) {
  const [row] = await db
    .update(productVariants)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(productVariants.id, id))
    .returning();
  if (!row) throw new NotFoundError("Variant");
  return row;
}

/* --------------------------- POS sellable search ---------------------- */

export interface SellableVariant {
  variantId: string;
  sku: string;
  label: string; // "Product — Variant"
  price: string;
  stockQty: number;
}

/** Active, in-stock variants matching a query (sku, barcode, product name). */
export async function listSellableVariants(query: string): Promise<SellableVariant[]> {
  const q = query.trim();
  const like = `%${q}%`;
  const rows = await db
    .select({
      variantId: productVariants.id,
      sku: productVariants.sku,
      productName: products.name,
      variantName: productVariants.variantName,
      price: productVariants.price,
      stockQty: productVariants.stockQty,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .where(
      and(
        eq(productVariants.isActive, true),
        eq(products.isActive, true),
        q
          ? or(ilike(productVariants.sku, like), ilike(productVariants.barcode, like), ilike(products.name, like))
          : undefined,
      ),
    )
    .orderBy(desc(productVariants.stockQty))
    .limit(20);

  return rows.map((r) => ({
    variantId: r.variantId,
    sku: r.sku,
    label: r.variantName === "Default" ? r.productName : `${r.productName} — ${r.variantName}`,
    price: r.price,
    stockQty: r.stockQty,
  }));
}
