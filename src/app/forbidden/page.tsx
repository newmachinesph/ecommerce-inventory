import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-paper px-6 py-16">
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-alert/10 text-alert">
          <ShieldX className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">No access</h1>
        <p className="mt-1 text-sm text-muted">
          Your role does not have permission to view that page. Ask an administrator if you need it.
        </p>
        <Link href="/dashboard" className="mt-6 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
