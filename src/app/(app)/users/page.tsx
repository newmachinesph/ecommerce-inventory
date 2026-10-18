import { requirePermissionPage, can } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { listUsers } from "@/lib/services/users";
import { listRoles } from "@/lib/services/roles";
import { UsersManager } from "./UsersManager";

export default async function UsersPage() {
  await requirePermissionPage("user:read");
  const [users, roles, canWrite] = await Promise.all([listUsers(), listRoles(), can("user:write")]);

  return (
    <>
      <PageHeader title="Employees" description="Staff accounts, roles and access." />
      <UsersManager
        users={users.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null }))}
        roles={roles.map((r) => ({ key: r.key, label: r.label }))}
        canWrite={canWrite}
      />
    </>
  );
}
