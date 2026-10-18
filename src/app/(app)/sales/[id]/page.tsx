import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermissionPage, can } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableWrap, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { getSale } from "@/lib/services/sales";
import { getStoreSettings } from "@/lib/services/settings";
import { formatMoney, formatDateTime } from "@/lib/format";
import { VoidSaleButton } from "./VoidSaleButton";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermissionPage("sale:read");
  const { id } = await params;
  const [sale, settings, canVoid] = await Promise.all([getSale(id), getStoreSettings(), can("sale:void")]);
  const sym = settings.currencySymbol;

  return (
    <>
      <PageHeader title={`Sale #${sale.saleNumber}`}>
        <Link href="/sales" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Back
        </Link>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-4">
        <StatusBadge value={sale.status} />
        {sale.status === "COMPLETED" && canVoid ? <VoidSaleButton saleId={sale.id} /> : null}
      </div>

      {sale.status === "VOID" && sale.voidReason ? (
        <div className="rounded-md border border-alert/40 bg-alert/5 px-4 py-3 text-sm text-alert" role="alert">
          Voided — {sale.voidReason}
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">Employee</dt>
          <dd className="mt-0.5 text-ink">{sale.employeeName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">Customer</dt>
          <dd className="mt-0.5 text-ink">{sale.customerName ?? "Walk-in"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-muted">Date</dt>
          <dd className="mt-0.5 text-ink">{formatDateTime(sale.createdAt)}</dd>
        </div>
      </dl>

      <TableWrap>
        <Table>
          <THead>
            <Th>SKU</Th>
            <Th>Name</Th>
            <Th numeric>Unit price</Th>
            <Th numeric>Qty</Th>
            <Th numeric>Line total</Th>
          </THead>
          <TBody>
            {sale.items.map((it) => (
              <Tr key={it.id}>
                <Td muted>{it.sku}</Td>
                <Td>{it.name}</Td>
                <Td numeric>{formatMoney(it.unitPrice, sym)}</Td>
                <Td numeric>{it.qty}</Td>
                <Td numeric>{formatMoney(it.lineTotal, sym)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </TableWrap>

      <dl className="ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
        <div className="flex justify-between text-muted">
          <dt>Subtotal</dt>
          <dd className="tabular">{formatMoney(sale.subtotal, sym)}</dd>
        </div>
        <div className="flex justify-between text-muted">
          <dt>Discount</dt>
          <dd className="tabular">-{formatMoney(sale.discount, sym)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-1 text-base font-semibold text-ink">
          <dt>Total</dt>
          <dd className="tabular">{formatMoney(sale.total, sym)}</dd>
        </div>
      </dl>
    </>
  );
}
