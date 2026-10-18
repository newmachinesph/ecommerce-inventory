import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { PERMISSIONS, sanitizePermissions } from "@/lib/rbac";

export async function listRoles() {
  const rows = await db.select().from(roles).orderBy(roles.label);
  const counts = await db
    .select({ role: users.role })
    .from(users);
  const byRole = counts.reduce<Record<string, number>>((acc, r) => {
    acc[r.role] = (acc[r.role] ?? 0) + 1;
    return acc;
  }, {});
  return rows.map((r) => ({ ...r, userCount: byRole[r.key] ?? 0 }));
}

/** The full permission catalogue, for the role editor UI. */
export function allPermissions() {
  return [...PERMISSIONS];
}

export async function createRole(input: { key: string; label: string; permissions: string[] }) {
  const key = input.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  if (!key) throw new BusinessRuleError("Role key is required.");
  const [row] = await db
    .insert(roles)
    .values({ key, label: input.label.trim(), permissions: sanitizePermissions(input.permissions), isSystem: false })
    .returning();
  return row;
}

export async function updateRole(key: string, input: { label?: string; permissions?: string[] }) {
  // ADMIN is locked to full access — never editable, so it can't lock everyone out.
  if (key === "ADMIN") throw new BusinessRuleError("The Administrator role cannot be edited.");
  const patch: Record<string, unknown> = {};
  if (input.label !== undefined) patch.label = input.label.trim();
  if (input.permissions !== undefined) patch.permissions = sanitizePermissions(input.permissions);
  const [row] = await db.update(roles).set(patch).where(eq(roles.key, key)).returning();
  if (!row) throw new NotFoundError("Role");
  return row;
}

export async function deleteRole(key: string) {
  const [role] = await db.select().from(roles).where(eq(roles.key, key));
  if (!role) throw new NotFoundError("Role");
  if (role.isSystem) throw new BusinessRuleError("Built-in roles cannot be deleted.");
  const [inUse] = await db.select({ id: users.id }).from(users).where(eq(users.role, key)).limit(1);
  if (inUse) throw new BusinessRuleError("Role is assigned to users; reassign them first.");
  await db.delete(roles).where(eq(roles.key, key));
}
