import { z } from "zod";
import { created, handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { writeAudit } from "@/lib/services/audit";
import { createProduct, listProducts } from "@/lib/services/products";
import { db } from "@/db";
import { moneySchema } from "@/lib/validation";

const variantSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  variantName: z.string().trim().max(120).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  barcode: z.string().trim().max(64).optional().nullable(),
  price: moneySchema,
  cost: moneySchema.optional(),
  stockQty: z.coerce.number().int().min(0).optional(),
  reorderPoint: z.coerce.number().int().min(0).optional(),
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  brand: z.string().trim().max(120).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  variants: z.array(variantSchema).min(1, "Add at least one variant."),
});

export const GET = handler(async () => {
  await requirePermission("product:read");
  return ok(await listProducts());
});

export const POST = handler(async (req) => {
  const user = await requirePermission("product:write");
  const body = await parseBody(req, createSchema);
  const product = await createProduct({ ...body, userId: user.id });
  await writeAudit(db, {
    actorId: user.id,
    actorEmail: user.email,
    action: "PRODUCT_CREATE",
    entity: "product",
    entityId: product.id,
    detail: { name: product.name },
  });
  return created(product);
});
