"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/store/toast";
import { api } from "@/components/ui/api";
import { formatDateTime } from "@/lib/format";

export function ClockCard({ isOpen, openedAt }: { isOpen: boolean; openedAt: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const res = await api.post("/api/attendance/clock", { action: isOpen ? "out" : "in" });
    setBusy(false);
    if (res.ok) {
      toast.success(isOpen ? "Clocked out." : "Clocked in.");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-card border border-line bg-surface p-5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <span className={`flex size-10 items-center justify-center rounded-full ${isOpen ? "bg-ink text-paper" : "bg-surface-3 text-muted"}`}>
          <Clock className="size-5" />
        </span>
        <div>
          <div className="text-sm font-medium text-ink">{isOpen ? "Clocked in" : "Clocked out"}</div>
          <div className="text-xs text-muted">
            {isOpen && openedAt ? `Since ${formatDateTime(openedAt)}` : "You are not on a shift right now."}
          </div>
        </div>
      </div>
      <Button onClick={toggle} disabled={busy} variant={isOpen ? "danger" : "primary"}>
        {busy ? "…" : isOpen ? "Clock out" : "Clock in"}
      </Button>
    </div>
  );
}
