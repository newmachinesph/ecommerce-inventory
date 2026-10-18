import { z } from "zod";
import { created, handler, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { addVariant } from "@/lib/services/products";
import { moneySchema } from "@/lib/validation";

const schema = z.object({
  sku: z.string().trim().min(1).max(64),
  variantName: z.string().trim().max(120).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  barcode: z.string().trim().max(64).nullable().optional(),
  price: moneySchema,
  cost: moneySchema.optional(),
  stockQty: z.coerce.number().int().min(0).optional(),
  reorderPoint: z.coerce.number().int().min(0).optional(),
});

export const POST = handler(async (req, ctx) => {
  const user = await requirePermission("product:write");
  const { id } = await ctx.params;
  const body = await parseBody(req, schema);
  return created(await addVariant(id, body, user.id));
});
