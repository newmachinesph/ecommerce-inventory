import { created, fail, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { ValidationError } from "@/lib/errors";
import { ATTACHMENT_ENTITIES, isAttachmentEntity } from "@/lib/attachments";
import { listAttachments, uploadAttachment } from "@/lib/services/attachments";

/** GET /api/attachments?entity=product&entityId=... — list an entity's files. */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const entity = url.searchParams.get("entity") ?? "";
    const entityId = url.searchParams.get("entityId") ?? "";
    if (!isAttachmentEntity(entity)) throw new ValidationError("Unknown attachment entity.");
    await requirePermission(ATTACHMENT_ENTITIES[entity].read);
    return ok(await listAttachments(entity, entityId));
  } catch (err) {
    return fail(err);
  }
}

/** POST multipart: fields entity, entityId, file. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const entity = String(form.get("entity") ?? "");
    const entityId = String(form.get("entityId") ?? "");
    const file = form.get("file");

    if (!isAttachmentEntity(entity)) throw new ValidationError("Unknown attachment entity.");
    const user = await requirePermission(ATTACHMENT_ENTITIES[entity].write);
    if (!(file instanceof File)) throw new ValidationError("No file provided.");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const row = await uploadAttachment({
      entity,
      entityId,
      filename: file.name,
      contentType: file.type,
      bytes,
      userId: user.id,
    });
    return created(row);
  } catch (err) {
    return fail(err);
  }
}
