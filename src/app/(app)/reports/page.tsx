import { requirePermissionPage } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { StatTile } from "@/components/ui/StatTile";
import { Table, TableWrap, TBody, Td, Th, THead, Tr, EmptyRow } from "@/components/ui/Table";
import { employeePerformance, salesSummary } from "@/lib/services/salesReport";
import { getStoreSettings } from "@/lib/services/settings";
import { formatMoney } from "@/lib/format";

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requirePermissionPage("report:read");
  const sp = await searchParams;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const fromYmd = sp.from ?? toYmd(monthStart);
  const toYmdStr = sp.to ?? toYmd(now);

  const from = new Date(`${fromYmd}T00:00:00`);
  const to = new Date(`${toYmdStr}T23:59:59`);

  const [summary, perf, settings] = await Promise.all([
    salesSummary(from, to),
    employeePerformance(from, to),
    getStoreSettings(),
  ]);
  const sym = settings.currencySymbol;

  const exportRows = perf.map((p, i) => ({
    rank: i + 1,
    employee: p.employeeName,
    sales: p.saleCount,
    revenue: p.revenue,
  }));

  return (
    <>
      <PageHeader title="Sales performance" description="Per-employee sales over a date range.">
        <ExportCsvButton
          filename={`sales-performance-${fromYmd}_to_${toYmdStr}`}
          rows={exportRows}
          columns={[
            { key: "rank", label: "Rank" },
            { key: "employee", label: "Employee" },
            { key: "sales", label: "Sales" },
            { key: "revenue", label: "Revenue" },
          ]}
        />
      </PageHeader>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">From</span>
          <input
            type="date"
            name="from"
            defaultValue={fromYmd}
            className="h-10 rounded-md border border-line-strong bg-surface px-3 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">To</span>
          <input
            type="date"
            name="to"
            defaultValue={toYmdStr}
            className="h-10 rounded-md border border-line-strong bg-surface px-3 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
          />
        </label>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-md">
        <StatTile label="Total sales" value={summary.saleCount} />
        <StatTile label="Revenue" value={formatMoney(summary.revenue, sym)} />
      </div>

      <TableWrap>
        <Table>
          <THead>
            <Th numeric>#</Th>
            <Th>Employee</Th>
            <Th numeric>Sales</Th>
            <Th numeric>Revenue</Th>
          </THead>
          <TBody>
            {perf.length === 0 ? (
              <EmptyRow colSpan={4}>No employees found.</EmptyRow>
            ) : (
              perf.map((p, i) => (
                <Tr key={p.employeeId}>
                  <Td numeric muted>{i + 1}</Td>
                  <Td>{p.employeeName}</Td>
                  <Td numeric>{p.saleCount}</Td>
                  <Td numeric>{formatMoney(p.revenue, sym)}</Td>
                </Tr>
              ))
            )}
          </TBody>
        </Table>
      </TableWrap>
    </>
  );
}
