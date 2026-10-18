"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/lib/store/toast";
import { api } from "@/components/ui/api";

interface StoreSettings {
  storeName: string;
  currency: string;
  currencySymbol: string;
}

export function SettingsForm({ settings, canWrite }: { settings: StoreSettings; canWrite: boolean }) {
  const toast = useToast();
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof StoreSettings>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await api.patch("/api/settings", form);
    setBusy(false);
    if (res.ok) toast.success("Settings saved.");
    else toast.error(res.error);
  }

  return (
    <form onSubmit={save} className="flex max-w-md flex-col gap-4 rounded-card border border-line bg-surface p-6">
      <Field label="Store name" htmlFor="storeName">
        <Input id="storeName" value={form.storeName} onChange={(e) => set("storeName", e.target.value)} disabled={!canWrite} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Currency" htmlFor="currency" hint="e.g. PHP, USD">
          <Input id="currency" value={form.currency} onChange={(e) => set("currency", e.target.value)} disabled={!canWrite} />
        </Field>
        <Field label="Symbol" htmlFor="symbol" hint="e.g. ₱, $">
          <Input id="symbol" value={form.currencySymbol} onChange={(e) => set("currencySymbol", e.target.value)} disabled={!canWrite} />
        </Field>
      </div>
      {canWrite ? (
        <Button type="submit" disabled={busy} className="self-start">
          {busy ? "Saving…" : "Save settings"}
        </Button>
      ) : (
        <p className="text-xs text-muted">You have read-only access to settings.</p>
      )}
    </form>
  );
}
