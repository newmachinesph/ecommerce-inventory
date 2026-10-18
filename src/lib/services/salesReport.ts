import "server-only";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { sales, users } from "@/db/schema";

export interface EmployeeSalesRow {
  employeeId: string;
  employeeName: string;
  saleCount: number;
  revenue: string;
}

/** Sales performance per employee over a window (COMPLETED sales only). */
export async function employeePerformance(from?: Date, to?: Date): Promise<EmployeeSalesRow[]> {
  const conds = [eq(sales.status, "COMPLETED")];
  if (from) conds.push(gte(sales.createdAt, from));
  if (to) conds.push(lte(sales.createdAt, to));

  return db
    .select({
      employeeId: users.id,
      employeeName: users.fullName,
      saleCount: sql<number>`count(${sales.id})::int`,
      revenue: sql<string>`coalesce(sum(${sales.total}), 0)::numeric(14,2)`,
    })
    .from(users)
    .leftJoin(sales, and(eq(sales.employeeId, users.id), ...conds))
    .groupBy(users.id)
    .orderBy(desc(sql`coalesce(sum(${sales.total}), 0)`));
}

export interface SalesSummary {
  saleCount: number;
  revenue: string;
}

/** Aggregate revenue + count for a window (COMPLETED only). */
export async function salesSummary(from?: Date, to?: Date): Promise<SalesSummary> {
  const conds = [eq(sales.status, "COMPLETED")];
  if (from) conds.push(gte(sales.createdAt, from));
  if (to) conds.push(lte(sales.createdAt, to));

  const [row] = await db
    .select({
      saleCount: sql<number>`count(*)::int`,
      revenue: sql<string>`coalesce(sum(${sales.total}), 0)::numeric(14,2)`,
    })
    .from(sales)
    .where(and(...conds));

  return { saleCount: row?.saleCount ?? 0, revenue: row?.revenue ?? "0.00" };
}
