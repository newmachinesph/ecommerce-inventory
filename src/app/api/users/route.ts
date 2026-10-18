import { z } from "zod";
import { created, handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { createUser, listUsers } from "@/lib/services/users";
import { checkPasswordPolicy } from "@/lib/auth/password";
import { ValidationError } from "@/lib/errors";
import { writeAudit } from "@/lib/services/audit";
import { db } from "@/db";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  fullName: z.string().trim().min(1).max(160),
  role: z.string().trim().min(1),
  password: z.string().min(1),
});

export const GET = handler(async () => {
  await requirePermission("user:read");
  return ok(await listUsers());
});

export const POST = handler(async (req) => {
  const actor = await requirePermission("user:write");
  const body = await parseBody(req, schema);
  const policy = checkPasswordPolicy(body.password);
  if (!policy.ok) throw new ValidationError("Weak password.", { password: policy.errors });

  const user = await createUser(body);
  await writeAudit(db, {
    actorId: actor.id,
    actorEmail: actor.email,
    action: "USER_CREATE",
    entity: "user",
    entityId: user.id,
    detail: { email: user.email, role: user.role },
  });
  return created(user);
});
