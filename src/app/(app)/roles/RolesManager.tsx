"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/lib/store/toast";
import { api } from "@/components/ui/api";
import { cn } from "@/components/ui/cn";

interface Role {
  key: string;
  label: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

function PermGrid({
  all,
  selected,
  onToggle,
  disabled,
}: {
  all: string[];
  selected: Set<string>;
  onToggle: (p: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {all.map((p) => (
        <label
          key={p}
          className={cn(
            "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs",
            selected.has(p) ? "border-ink-soft bg-surface-2 text-ink" : "border-line text-muted",
            disabled ? "opacity-60" : "cursor-pointer hover:border-ink-soft",
          )}
        >
          <input
            type="checkbox"
            checked={selected.has(p)}
            onChange={() => onToggle(p)}
            disabled={disabled}
            className="accent-ink"
          />
          <span className="tabular">{p}</span>
        </label>
      ))}
    </div>
  );
}

function RoleCard({ role, allPerms, canWrite }: { role: Role; allPerms: string[]; canWrite: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const locked = role.key === "ADMIN";
  const [selected, setSelected] = useState<Set<string>>(new Set(role.permissions));
  const [busy, setBusy] = useState(false);
  const editable = canWrite && !locked;

  function toggle(p: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    const res = await api.patch(`/api/roles/${role.key}`, { permissions: [...selected] });
    setBusy(false);
    if (res.ok) {
      toast.success("Role updated.");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete role "${role.label}"?`)) return;
    const res = await api.del(`/api/roles/${role.key}`);
    if (res.ok) {
      toast.success("Role deleted.");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{role.label}</h3>
            {role.isSystem ? <StatusBadge value="DRAFT" label="Built-in" tone="muted" /> : null}
            {locked ? <Lock className="size-3.5 text-muted" /> : null}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {role.key} · {role.userCount} {role.userCount === 1 ? "user" : "users"}
          </p>
        </div>
        {canWrite && !role.isSystem ? (
          <button type="button" onClick={remove} className="text-muted hover:text-alert" aria-label="Delete role">
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>

      {locked ? (
        <p className="text-xs text-muted">Administrator always has full access — permissions are not editable.</p>
      ) : (
        <PermGrid all={allPerms} selected={locked ? new Set(allPerms) : selected} onToggle={toggle} disabled={!editable} />
      )}

      {editable ? (
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save permissions"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function RolesManager({ roles, allPerms, canWrite }: { roles: Role[]; allPerms: string[]; canWrite: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggle(p: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await api.post("/api/roles", { key, label, permissions: [...selected] });
    setBusy(false);
    if (res.ok) {
      toast.success("Role created.");
      setKey("");
      setLabel("");
      setSelected(new Set());
      setShowNew(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canWrite ? (
        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => setShowNew((v) => !v)}>
            <Plus className="size-4" /> New role
          </Button>
        </div>
      ) : null}

      {showNew ? (
        <form onSubmit={create} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Key" htmlFor="rkey" hint="e.g. SUPERVISOR — uppercase" required>
              <Input id="rkey" value={key} onChange={(e) => setKey(e.target.value)} required />
            </Field>
            <Field label="Label" htmlFor="rlabel" required>
              <Input id="rlabel" value={label} onChange={(e) => setLabel(e.target.value)} required />
            </Field>
          </div>
          <PermGrid all={allPerms} selected={selected} onToggle={toggle} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create role"}
            </Button>
          </div>
        </form>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {roles.map((r) => (
          <RoleCard key={r.key} role={r} allPerms={allPerms} canWrite={canWrite} />
        ))}
      </div>
    </div>
  );
}
