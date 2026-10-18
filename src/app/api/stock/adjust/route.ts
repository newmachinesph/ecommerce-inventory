import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { setStockCount } from "@/lib/services/stock";
import { writeAudit } from "@/lib/services/audit";
import { db } from "@/db";

const schema = z.object({
  variantId: z.string().uuid(),
  targetQty: z.coerce.number().int().min(0),
  note: z.string().trim().max(500).optional(),
});

export const POST = handler(async (req) => {
  const user = await requirePermission("stock:adjust");
  const body = await parseBody(req, schema);
  const balance = await setStockCount({ ...body, userId: user.id });
  await writeAudit(db, {
    actorId: user.id,
    actorEmail: user.email,
    action: "STOCK_ADJUST",
    entity: "variant",
    entityId: body.variantId,
    detail: { targetQty: body.targetQty, note: body.note },
  });
  return ok({ stockQty: balance });
});
