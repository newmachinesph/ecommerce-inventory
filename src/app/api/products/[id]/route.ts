import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { getProduct, updateProduct } from "@/lib/services/products";

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  brand: z.string().trim().max(120).nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const GET = handler(async (_req, ctx) => {
  await requirePermission("product:read");
  const { id } = await ctx.params;
  return ok(await getProduct(id));
});

export const PATCH = handler(async (req, ctx) => {
  await requirePermission("product:write");
  const { id } = await ctx.params;
  const body = await parseBody(req, patchSchema);
  return ok(await updateProduct(id, body));
});
