import { z } from "zod";
import { created, handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { createCategory, listCategories } from "@/lib/services/products";

export const GET = handler(async () => {
  await requirePermission("category:read");
  return ok(await listCategories());
});

export const POST = handler(async (req) => {
  await requirePermission("category:write");
  const { name } = await parseBody(req, z.object({ name: z.string().trim().min(1).max(120) }));
  return created(await createCategory(name));
});
