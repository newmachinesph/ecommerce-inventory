import { z } from "zod";
import { created, handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { createRole, listRoles } from "@/lib/services/roles";

const schema = z.object({
  key: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(80),
  permissions: z.array(z.string()).default([]),
});

export const GET = handler(async () => {
  await requirePermission("role:read");
  return ok(await listRoles());
});

export const POST = handler(async (req) => {
  await requirePermission("role:write");
  const body = await parseBody(req, schema);
  return created(await createRole(body));
});
