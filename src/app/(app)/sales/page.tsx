import Link from "next/link";
import { requirePermissionPage } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { Table, TableWrap, TBody, Td, Th, THead, Tr, EmptyRow } from "@/components/ui/Table";
import { listSales } from "@/lib/services/sales";
import { getStoreSettings } from "@/lib/services/settings";
import { formatMoney, formatDateTime } from "@/lib/format";

export default async function SalesPage() {
  await requirePermissionPage("sale:read");
  const [sales, settings] = await Promise.all([listSales(), getStoreSettings()]);
  const sym = settings.currencySymbol;

  const exportRows = sales.map((s) => ({
    saleNumber: s.saleNumber,
    date: formatDateTime(s.createdAt),
    employee: s.employeeName,
    customer: s.customerName ?? "Walk-in",
    total: s.total,
    status: s.status,
  }));

  return (
    <>
      <PageHeader title="Sales" description="Every counter transaction.">
        <ExportCsvButton
          filename={`sales-${new Date().toISOString().slice(0, 10)}`}
          rows={exportRows}
          columns={[
            { key: "saleNumber", label: "Sale #" },
            { key: "date", label: "Date" },
            { key: "employee", label: "Employee" },
            { key: "customer", label: "Customer" },
            { key: "total", label: "Total" },
            { key: "status", label: "Status" },
          ]}
        />
      </PageHeader>
      <TableWrap>
        <Table>
          <THead>
            <Th numeric>#</Th>
            <Th>Date</Th>
            <Th>Employee</Th>
            <Th>Customer</Th>
            <Th numeric>Total</Th>
            <Th>Status</Th>
          </THead>
          <TBody>
            {sales.length === 0 ? (
              <EmptyRow colSpan={6}>No sales recorded yet.</EmptyRow>
            ) : (
              sales.map((s) => (
                <Tr key={s.id}>
                  <Td numeric>
                    <Link href={`/sales/${s.id}`} className="font-medium text-ink hover:underline">
                      {s.saleNumber}
                    </Link>
                  </Td>
                  <Td muted>{formatDateTime(s.createdAt)}</Td>
                  <Td>{s.employeeName}</Td>
                  <Td muted>{s.customerName ?? "Walk-in"}</Td>
                  <Td numeric>{formatMoney(s.total, sym)}</Td>
                  <Td>
                    <StatusBadge value={s.status} />
                  </Td>
                </Tr>
              ))
            )}
          </TBody>
        </Table>
      </TableWrap>
    </>
  );
}
