import { headers } from "next/headers";
import { z } from "zod";
import { created, handler, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { createSale } from "@/lib/services/sales";
import { moneySchema } from "@/lib/validation";

const schema = z.object({
  customerName: z.string().trim().max(160).optional().nullable(),
  discount: moneySchema.optional(),
  items: z
    .array(z.object({ variantId: z.string().uuid(), qty: z.coerce.number().int().positive() }))
    .min(1, "Add at least one item."),
});

export const POST = handler(async (req) => {
  const user = await requirePermission("sale:create");
  const body = await parseBody(req, schema);
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const sale = await createSale({
    employeeId: user.id,
    employeeEmail: user.email,
    customerName: body.customerName,
    discount: body.discount,
    items: body.items,
    ipAddress: ip,
  });
  return created(sale);
});
