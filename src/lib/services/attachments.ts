import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { buildObjectKey, validateUpload, type AttachmentEntity } from "@/lib/attachments";
import { deleteObject, getObject, isR2Configured, putObject } from "@/lib/r2";

export interface UploadInput {
  entity: AttachmentEntity;
  entityId: string;
  filename: string;
  contentType: string;
  bytes: Uint8Array;
  userId: string;
}

export async function uploadAttachment(input: UploadInput) {
  if (!isR2Configured()) throw new BusinessRuleError("File storage is not configured.");
  const check = validateUpload(input.contentType, input.bytes.byteLength);
  if (!check.ok) throw new BusinessRuleError(check.error);

  const key = buildObjectKey(input.entity, input.entityId, input.contentType);
  await putObject(key, input.bytes, input.contentType);

  const [row] = await db
    .insert(attachments)
    .values({
      entity: input.entity,
      entityId: input.entityId,
      r2Key: key,
      filename: input.filename.slice(0, 200),
      contentType: input.contentType,
      sizeBytes: input.bytes.byteLength,
      uploadedBy: input.userId,
    })
    .returning();
  return row;
}

export async function listAttachments(entity: string, entityId: string) {
  return db
    .select()
    .from(attachments)
    .where(and(eq(attachments.entity, entity), eq(attachments.entityId, entityId)))
    .orderBy(attachments.createdAt);
}

export async function getAttachment(id: string) {
  const [row] = await db.select().from(attachments).where(eq(attachments.id, id));
  if (!row) throw new NotFoundError("Attachment");
  return row;
}

/** Fetch the raw bytes for streaming. */
export async function readAttachmentBytes(id: string) {
  const row = await getAttachment(id);
  const obj = await getObject(row.r2Key);
  if (!obj) throw new NotFoundError("File");
  return { row, ...obj };
}

export async function deleteAttachment(id: string) {
  const row = await getAttachment(id);
  await deleteObject(row.r2Key);
  await db.delete(attachments).where(eq(attachments.id, id));
}
