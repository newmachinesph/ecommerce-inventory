import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { listSellableVariants } from "@/lib/services/products";

export const GET = handler(async (req) => {
  await requirePermission("sale:create");
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return ok(await listSellableVariants(q));
});
