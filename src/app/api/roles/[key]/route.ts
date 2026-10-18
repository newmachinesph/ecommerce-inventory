import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { deleteRole, updateRole } from "@/lib/services/roles";

const schema = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  permissions: z.array(z.string()).optional(),
});

export const PATCH = handler(async (req, ctx) => {
  await requirePermission("role:write");
  const { key } = await ctx.params;
  const body = await parseBody(req, schema);
  return ok(await updateRole(key, body));
});

export const DELETE = handler(async (_req, ctx) => {
  await requirePermission("role:write");
  const { key } = await ctx.params;
  await deleteRole(key);
  return ok({ deleted: key });
});
