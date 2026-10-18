import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/dal";
import { getStoreSettings, updateStoreSettings } from "@/lib/services/settings";

const schema = z.object({
  storeName: z.string().trim().min(1).max(120).optional(),
  currency: z.string().trim().min(1).max(8).optional(),
  currencySymbol: z.string().trim().min(1).max(4).optional(),
});

export const GET = handler(async () => {
  await requirePermission("settings:read");
  return ok(await getStoreSettings());
});

export const PATCH = handler(async (req) => {
  await requirePermission("settings:write");
  const body = await parseBody(req, schema);
  return ok(await updateStoreSettings(body));
});
