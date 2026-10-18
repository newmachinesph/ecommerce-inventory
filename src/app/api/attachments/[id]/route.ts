import { fail, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { ATTACHMENT_ENTITIES, isAttachmentEntity } from "@/lib/attachments";
import { deleteAttachment, getAttachment } from "@/lib/services/attachments";
import { ValidationError } from "@/lib/errors";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const row = await getAttachment(id);
    if (!isAttachmentEntity(row.entity)) throw new ValidationError("Unknown attachment entity.");
    await requirePermission(ATTACHMENT_ENTITIES[row.entity].write);
    await deleteAttachment(id);
    return ok({ deleted: id });
  } catch (err) {
    return fail(err);
  }
}
