import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { updateVariant } from "@/lib/services/products";
import { moneySchema } from "@/lib/validation";

const schema = z.object({
  sku: z.string().trim().min(1).max(64).optional(),
  variantName: z.string().trim().max(120).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  barcode: z.string().trim().max(64).nullable().optional(),
  price: moneySchema.optional(),
  cost: moneySchema.optional(),
  reorderPoint: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = handler(async (req, ctx) => {
  await requirePermission("product:write");
  const { id } = await ctx.params;
  const body = await parseBody(req, schema);
  return ok(await updateVariant(id, body));
});
