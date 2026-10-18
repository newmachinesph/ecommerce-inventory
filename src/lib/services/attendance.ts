import "server-only";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendance, users } from "@/db/schema";
import { BusinessRuleError } from "@/lib/errors";

/** The user's currently-open shift, or null. */
export async function currentOpenShift(userId: string) {
  const [row] = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.userId, userId), isNull(attendance.clockOut)))
    .limit(1);
  return row ?? null;
}

export async function clockIn(userId: string, note?: string | null) {
  const open = await currentOpenShift(userId);
  if (open) throw new BusinessRuleError("You are already clocked in.");
  const [row] = await db.insert(attendance).values({ userId, note: note ?? null }).returning();
  return row;
}

export async function clockOut(userId: string) {
  const open = await currentOpenShift(userId);
  if (!open) throw new BusinessRuleError("You are not clocked in.");
  const [row] = await db
    .update(attendance)
    .set({ clockOut: new Date() })
    .where(eq(attendance.id, open.id))
    .returning();
  return row;
}

export interface ShiftRow {
  id: string;
  userId: string;
  employeeName: string;
  clockIn: Date;
  clockOut: Date | null;
  note: string | null;
}

function shiftSelect() {
  return db
    .select({
      id: attendance.id,
      userId: attendance.userId,
      employeeName: users.fullName,
      clockIn: attendance.clockIn,
      clockOut: attendance.clockOut,
      note: attendance.note,
    })
    .from(attendance)
    .innerJoin(users, eq(users.id, attendance.userId));
}

/** A user's own recent shifts. */
export async function listMyShifts(userId: string, limit = 60): Promise<ShiftRow[]> {
  return shiftSelect().where(eq(attendance.userId, userId)).orderBy(desc(attendance.clockIn)).limit(limit);
}

/** All shifts since `from` (managers). Defaults to everything recent. */
export async function listAllShifts(from?: Date, limit = 300): Promise<ShiftRow[]> {
  return shiftSelect()
    .where(from ? gte(attendance.clockIn, from) : undefined)
    .orderBy(desc(attendance.clockIn))
    .limit(limit);
}

/** How many employees are clocked in right now (dashboard). */
export async function countClockedIn(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(attendance)
    .where(isNull(attendance.clockOut));
  return row?.n ?? 0;
}
