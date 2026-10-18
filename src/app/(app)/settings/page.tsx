import { requirePermissionPage, can } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { getStoreSettings } from "@/lib/services/settings";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  await requirePermissionPage("settings:read");
  const [settings, canWrite] = await Promise.all([getStoreSettings(), can("settings:write")]);

  return (
    <>
      <PageHeader title="Settings" description="Store name and currency." />
      <SettingsForm settings={settings} canWrite={canWrite} />
    </>
  );
}
