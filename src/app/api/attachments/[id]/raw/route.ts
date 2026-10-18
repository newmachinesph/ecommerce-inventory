import { fail } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { ATTACHMENT_ENTITIES, isAttachmentEntity } from "@/lib/attachments";
import { readAttachmentBytes } from "@/lib/services/attachments";
import { ValidationError } from "@/lib/errors";

/** Stream an attachment's bytes, auth-gated. The bucket is private. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const { row, body, contentType } = await readAttachmentBytes(id);
    if (!isAttachmentEntity(row.entity)) throw new ValidationError("Unknown attachment entity.");
    await requirePermission(ATTACHMENT_ENTITIES[row.entity].read);

    return new Response(body as BodyInit, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(body.byteLength),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return fail(err);
  }
}
