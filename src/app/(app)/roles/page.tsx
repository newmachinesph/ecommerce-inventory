import { requirePermissionPage, can } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { allPermissions, listRoles } from "@/lib/services/roles";
import { RolesManager } from "./RolesManager";

export default async function RolesPage() {
  await requirePermissionPage("role:read");
  const [roles, canWrite] = await Promise.all([listRoles(), can("role:write")]);

  return (
    <>
      <PageHeader title="Roles" description="What each role can do. Compose from the permission catalogue." />
      <RolesManager
        roles={roles.map((r) => ({
          key: r.key,
          label: r.label,
          permissions: r.permissions,
          isSystem: r.isSystem,
          userCount: r.userCount,
        }))}
        allPerms={allPermissions()}
        canWrite={canWrite}
      />
    </>
  );
}
