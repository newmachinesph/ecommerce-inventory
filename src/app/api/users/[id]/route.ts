import { z } from "zod";
import { eq } from "drizzle-orm";
import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { assertNotLastAdmin, updateUser } from "@/lib/services/users";
import { checkPasswordPolicy } from "@/lib/auth/password";
import { ValidationError } from "@/lib/errors";
import { writeAudit } from "@/lib/services/audit";
import { db } from "@/db";
import { users } from "@/db/schema";

const schema = z.object({
  fullName: z.string().trim().min(1).max(160).optional(),
  role: z.string().trim().min(1).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(1).optional(),
});

export const PATCH = handler(async (req, ctx) => {
  const actor = await requirePermission("user:write");
  const { id } = await ctx.params;
  const body = await parseBody(req, schema);

  if (body.password) {
    const policy = checkPasswordPolicy(body.password);
    if (!policy.ok) throw new ValidationError("Weak password.", { password: policy.errors });
  }

  // Don't let the last admin be demoted or deactivated (would lock everyone out).
  const target = await db.query.users.findFirst({ where: eq(users.id, id) });
  const losingAdmin = target?.role === "ADMIN" && (body.isActive === false || (body.role && body.role !== "ADMIN"));
  if (losingAdmin) await assertNotLastAdmin(id);

  const user = await updateUser(id, body);
  await writeAudit(db, {
    actorId: actor.id,
    actorEmail: actor.email,
    action: "USER_UPDATE",
    entity: "user",
    entityId: id,
    detail: { role: user.role, isActive: user.isActive },
  });
  return ok(user);
});
