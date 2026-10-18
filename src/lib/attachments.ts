import { randomUUID } from "node:crypto";
import type { Permission } from "@/lib/rbac";

/**
 * Pure attachment rules — no server-only imports, so unit-testable.
 * The R2 client (`r2.ts`) and the API routes build on these.
 */

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

export const ALLOWED_TYPES = Object.keys(EXT_BY_TYPE);
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export function extForType(contentType: string): string {
  return EXT_BY_TYPE[contentType] ?? "bin";
}

export function isImageType(contentType: string): boolean {
  return contentType.startsWith("image/");
}

/** Deterministic, collision-proof object key: `entity/entityId/uuid.ext`. */
export function buildObjectKey(entity: string, entityId: string, contentType: string): string {
  const safeEntity = entity.replace(/[^a-z0-9_-]/gi, "");
  const safeId = entityId.replace(/[^a-z0-9_-]/gi, "");
  return `${safeEntity}/${safeId}/${randomUUID()}.${extForType(contentType)}`;
}

export type UploadCheck = { ok: true } | { ok: false; error: string };

export function validateUpload(contentType: string, sizeBytes: number): UploadCheck {
  if (!ALLOWED_TYPES.includes(contentType)) {
    return { ok: false, error: `Unsupported file type: ${contentType || "unknown"}. Images or PDF only.` };
  }
  if (sizeBytes <= 0) return { ok: false, error: "Empty file." };
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File too large. Max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.` };
  }
  return { ok: true };
}

/** Which entities may carry attachments, and the permissions that gate them. */
export const ATTACHMENT_ENTITIES = {
  product: { read: "product:read", write: "product:write" },
} as const satisfies Record<string, { read: Permission; write: Permission }>;

export type AttachmentEntity = keyof typeof ATTACHMENT_ENTITIES;

export function isAttachmentEntity(v: string): v is AttachmentEntity {
  return Object.prototype.hasOwnProperty.call(ATTACHMENT_ENTITIES, v);
}

/** App route that streams an attachment's bytes (auth-gated). */
export function attachmentUrl(id: string): string {
  return `/api/attachments/${id}/raw`;
}
