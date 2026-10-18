import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, type Db } from "@/db";
import { auditLog } from "@/db/schema";

/** A live db handle or an open transaction — both expose the same insert API. */
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

export interface AuditInput {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string; // LOGIN, SALE_CREATE, STOCK_ADJUST, ...
  entity?: string | null;
  entityId?: string | null;
  detail?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/** Append one immutable audit row. Pass the tx when auditing inside a mutation. */
export async function writeAudit(client: DbOrTx, input: AuditInput): Promise<void> {
  await client.insert(auditLog).values({
    actorId: input.actorId ?? null,
    actorEmail: input.actorEmail ?? null,
    action: input.action,
    entity: input.entity ?? null,
    entityId: input.entityId ?? null,
    detail: input.detail ?? null,
    ipAddress: input.ipAddress ?? null,
  });
}

export interface AuditRow {
  id: string;
  actorEmail: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  detail: Record<string, unknown> | null;
  createdAt: Date;
}

/** Most-recent-first audit trail for the log page. */
export async function listAudit(limit = 200): Promise<AuditRow[]> {
  return db
    .select({
      id: auditLog.id,
      actorEmail: auditLog.actorEmail,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      detail: auditLog.detail,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}

/** Trail for a single entity (e.g. one sale's history). */
export async function listAuditFor(entity: string, entityId: string): Promise<AuditRow[]> {
  return db
    .select({
      id: auditLog.id,
      actorEmail: auditLog.actorEmail,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      detail: auditLog.detail,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(eq(auditLog.entityId, entityId))
    .orderBy(desc(auditLog.createdAt))
    .limit(100);
}
