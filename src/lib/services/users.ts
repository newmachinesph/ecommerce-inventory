import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { destroyAllSessionsFor } from "@/lib/auth/session";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";

export interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roleLabel: string;
  isActive: boolean;
  lastLoginAt: Date | null;
}

export async function listUsers(): Promise<UserRow[]> {
  return db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      roleLabel: roles.label,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .innerJoin(roles, eq(roles.key, users.role))
    .orderBy(users.fullName);
}

export async function createUser(input: { email: string; fullName: string; role: string; password: string }) {
  const [row] = await db
    .insert(users)
    .values({
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    })
    .returning({ id: users.id, email: users.email, fullName: users.fullName, role: users.role });
  return row;
}

export async function updateUser(
  id: string,
  fields: Partial<{ fullName: string; role: string; isActive: boolean; password: string }>,
) {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (fields.fullName !== undefined) patch.fullName = fields.fullName;
  if (fields.role !== undefined) patch.role = fields.role;
  if (fields.isActive !== undefined) patch.isActive = fields.isActive;
  if (fields.password) patch.passwordHash = await hashPassword(fields.password);

  const [row] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
  if (!row) throw new NotFoundError("User");

  // A role change or deactivation must kill live sessions so it takes effect now.
  if (fields.role !== undefined || fields.isActive === false) {
    await destroyAllSessionsFor(id);
  }
  return { id: row.id, email: row.email, fullName: row.fullName, role: row.role, isActive: row.isActive };
}

/** Guard: never let the last active admin be removed / demoted / deactivated. */
export async function assertNotLastAdmin(userId: string) {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "ADMIN"));
  const activeAdmins = admins.filter((a) => a.id !== userId);
  if (activeAdmins.length === 0) {
    throw new BusinessRuleError("Cannot remove the last administrator.");
  }
}
