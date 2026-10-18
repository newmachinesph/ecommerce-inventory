import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { restock } from "@/lib/services/stock";
import { writeAudit } from "@/lib/services/audit";
import { db } from "@/db";

const schema = z.object({
  variantId: z.string().uuid(),
  qty: z.coerce.number().int().positive(),
  note: z.string().trim().max(500).optional(),
});

export const POST = handler(async (req) => {
  const user = await requirePermission("stock:adjust");
  const body = await parseBody(req, schema);
  const balance = await restock({ ...body, userId: user.id });
  await writeAudit(db, {
    actorId: user.id,
    actorEmail: user.email,
    action: "STOCK_RESTOCK",
    entity: "variant",
    entityId: body.variantId,
    detail: { qty: body.qty, note: body.note },
  });
  return ok({ stockQty: balance });
});
