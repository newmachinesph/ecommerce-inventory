import { requirePermissionPage } from "@/lib/auth/dal";
import { getStoreSettings } from "@/lib/services/settings";
import { PosTerminal } from "./PosTerminal";

export default async function PosPage() {
  await requirePermissionPage("sale:create");
  const settings = await getStoreSettings();
  return <PosTerminal symbol={settings.currencySymbol} />;
}
