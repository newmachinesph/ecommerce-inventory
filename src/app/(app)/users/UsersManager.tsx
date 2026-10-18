"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Power, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, FormError } from "@/components/ui/Field";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableWrap, TBody, Td, Th, THead, Tr, EmptyRow } from "@/components/ui/Table";
import { useToast } from "@/lib/store/toast";
import { api } from "@/components/ui/api";
import { formatDate } from "@/lib/format";

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roleLabel: string;
  isActive: boolean;
  lastLoginAt: string | null;
}
interface RoleOpt {
  key: string;
  label: string;
}

export function UsersManager({ users, roles, canWrite }: { users: UserRow[]; roles: RoleOpt[]; canWrite: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState(roles[0]?.key ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const res = await api.post("/api/users", { email, fullName, role, password });
    setBusy(false);
    if (res.ok) {
      toast.success("Employee added.");
      setEmail("");
      setFullName("");
      setPassword("");
      router.refresh();
    } else {
      setErrors(res.fieldErrors ?? {});
      toast.error(res.error);
    }
  }

  async function patch(id: string, body: Record<string, unknown>, ok: string) {
    const res = await api.patch(`/api/users/${id}`, body);
    if (res.ok) {
      toast.success(ok);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function resetPassword(id: string) {
    const pw = window.prompt("New password (min 12 chars, a letter and a number):");
    if (!pw) return;
    await patch(id, { password: pw }, "Password reset.");
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <TableWrap>
        <Table>
          <THead>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Last login</Th>
            {canWrite ? <Th>Actions</Th> : null}
          </THead>
          <TBody>
            {users.length === 0 ? (
              <EmptyRow colSpan={canWrite ? 6 : 5}>No employees yet.</EmptyRow>
            ) : (
              users.map((u) => (
                <Tr key={u.id}>
                  <Td className="font-medium text-ink">{u.fullName}</Td>
                  <Td muted>{u.email}</Td>
                  <Td>
                    {canWrite ? (
                      <Select
                        value={u.role}
                        onChange={(e) => patch(u.id, { role: e.target.value }, "Role updated.")}
                        className="h-8 text-xs"
                      >
                        {roles.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      u.roleLabel
                    )}
                  </Td>
                  <Td>
                    <StatusBadge value={u.isActive ? "ACTIVE" : "ON_HOLD"} label={u.isActive ? "Active" : "Inactive"} />
                  </Td>
                  <Td muted>{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</Td>
                  {canWrite ? (
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title={u.isActive ? "Deactivate" : "Activate"}
                          onClick={() => patch(u.id, { isActive: !u.isActive }, u.isActive ? "Deactivated." : "Activated.")}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
                        >
                          <Power className="size-4" />
                        </button>
                        <button
                          type="button"
                          title="Reset password"
                          onClick={() => resetPassword(u.id)}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
                        >
                          <KeyRound className="size-4" />
                        </button>
                      </div>
                    </Td>
                  ) : null}
                </Tr>
              ))
            )}
          </TBody>
        </Table>
      </TableWrap>

      {canWrite ? (
        <form onSubmit={create} className="flex h-fit flex-col gap-4 rounded-card border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
            <UserPlus className="size-4" /> New employee
          </h2>
          <Field label="Full name" htmlFor="fullName" required error={errors.fullName?.[0]}>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Email" htmlFor="email" required error={errors.email?.[0]}>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Role" htmlFor="role" required>
            <Select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Password"
            htmlFor="password"
            required
            hint="Min 12 characters, with a letter and a number."
            error={errors.password?.[0]}
          >
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {errors._form ? <FormError>{errors._form[0]}</FormError> : null}
          <Button type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add employee"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
