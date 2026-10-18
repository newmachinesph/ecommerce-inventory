import Link from "next/link";
import { AlertTriangle, Clock, Receipt, Wallet } from "lucide-react";
import { requirePermissionPage } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { Table, TableWrap, TBody, Td, Th, THead, Tr, EmptyRow } from "@/components/ui/Table";
import { salesSummary, employeePerformance } from "@/lib/services/salesReport";
import { lowStock, lowStockCount } from "@/lib/services/stock";
import { countClockedIn } from "@/lib/services/attendance";
import { getStoreSettings } from "@/lib/services/settings";
import { formatMoney } from "@/lib/format";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function DashboardPage() {
  await requirePermissionPage("product:read");
  const today = startOfToday();
  const [summary, lows, lowCount, clockedIn, perf, settings] = await Promise.all([
    salesSummary(today),
    lowStock(),
    lowStockCount(),
    countClockedIn(),
    employeePerformance(today),
    getStoreSettings(),
  ]);
  const sym = settings.currencySymbol;
  const topToday = perf.filter((p) => p.saleCount > 0).slice(0, 5);

  return (
    <>
      <PageHeader title="Dashboard" description="Today at a glance." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Sales today" value={summary.saleCount} icon={<Receipt className="size-5" />} />
        <StatTile label="Revenue today" value={formatMoney(summary.revenue, sym)} icon={<Wallet className="size-5" />} />
        <StatTile
          label="Low stock"
          value={lowCount}
          alert={lowCount > 0}
          icon={<AlertTriangle className="size-5" />}
          hint={lowCount > 0 ? "At or below reorder point" : "All good"}
        />
        <StatTile label="Clocked in" value={clockedIn} icon={<Clock className="size-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Top sellers today</h2>
            <Link href="/reports" className="text-xs text-muted hover:text-ink">
              Full report →
            </Link>
          </div>
          <TableWrap>
            <Table>
              <THead>
                <Th>Employee</Th>
                <Th numeric>Sales</Th>
                <Th numeric>Revenue</Th>
              </THead>
              <TBody>
                {topToday.length === 0 ? (
                  <EmptyRow colSpan={3}>No sales yet today.</EmptyRow>
                ) : (
                  topToday.map((p) => (
                    <Tr key={p.employeeId}>
                      <Td>{p.employeeName}</Td>
                      <Td numeric>{p.saleCount}</Td>
                      <Td numeric>{formatMoney(p.revenue, sym)}</Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>
          </TableWrap>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Low stock</h2>
            <Link href="/stock" className="text-xs text-muted hover:text-ink">
              Manage stock →
            </Link>
          </div>
          <TableWrap>
            <Table>
              <THead>
                <Th>Item</Th>
                <Th>SKU</Th>
                <Th numeric>On hand</Th>
                <Th numeric>Reorder</Th>
              </THead>
              <TBody>
                {lows.length === 0 ? (
                  <EmptyRow colSpan={4}>Nothing below reorder point.</EmptyRow>
                ) : (
                  lows.slice(0, 8).map((s) => (
                    <Tr key={s.variantId}>
                      <Td>{s.productName === s.variantName ? s.productName : `${s.productName} · ${s.variantName}`}</Td>
                      <Td muted>{s.sku}</Td>
                      <Td numeric className="text-alert">{s.stockQty}</Td>
                      <Td numeric muted>{s.reorderPoint}</Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>
          </TableWrap>
        </section>
      </div>
    </>
  );
}
