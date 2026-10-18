import { headers } from "next/headers";
import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { voidSale } from "@/lib/services/sales";

export const POST = handler(async (req, ctx) => {
  const user = await requirePermission("sale:void");
  const { id } = await ctx.params;
  const { reason } = await parseBody(req, z.object({ reason: z.string().trim().min(3).max(500) }));
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  return ok(await voidSale({ saleId: id, reason, userId: user.id, userEmail: user.email, ipAddress: ip }));
});
