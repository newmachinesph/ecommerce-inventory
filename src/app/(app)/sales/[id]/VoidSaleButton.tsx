"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { useToast } from "@/lib/store/toast";
import { api } from "@/components/ui/api";

/** Void returns every line's stock. Requires a reason (audit trail). */
export function VoidSaleButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (reason.trim().length < 3) {
      toast.error("Give a reason (min 3 characters).");
      return;
    }
    setBusy(true);
    const res = await api.post(`/api/sales/${saleId}/void`, { reason: reason.trim() });
    setBusy(false);
    if (res.ok) {
      toast.success("Sale voided; stock returned.");
      setOpen(false);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  if (!open) {
    return (
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        Void sale
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for void"
        className="h-8 w-56"
        autoFocus
      />
      <Button variant="danger" size="sm" onClick={submit} disabled={busy}>
        {busy ? "Voiding…" : "Confirm"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </span>
  );
}
