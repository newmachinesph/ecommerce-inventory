"use client";
import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, PackagePlus } from "lucide-react";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Table, TableWrap, TBody, Td, Th, THead, Tr, EmptyRow } from "@/components/ui/Table";
import { rowMatches } from "@/components/ui/cn";
import { useToast } from "@/lib/store/toast";
import { api } from "@/components/ui/api";
import { formatMoney } from "@/lib/format";

interface StockRow {
  variantId: string;
  sku: string;
  variantName: string;
  productName: string;
  price: string;
  stockQty: number;
  reorderPoint: number;
  isLow: boolean;
}

type Mode = "adjust" | "restock";

export function StockTable({ rows, canAdjust, symbol }: { rows: StockRow[]; canAdjust: boolean; symbol: string }) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<{ id: string; mode: Mode } | null>(null);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = rows.filter((r) => rowMatches([r.productName, r.variantName, r.sku], query));

  function label(r: StockRow): string {
    return r.productName === r.variantName ? r.productName : `${r.productName} · ${r.variantName}`;
  }

  function startEdit(r: StockRow, mode: Mode) {
    setOpen({ id: r.variantId, mode });
    setValue(mode === "adjust" ? String(r.stockQty) : "");
    setNote("");
  }

  async function submit() {
    if (!open) return;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || (open.mode === "restock" && n <= 0)) {
      toast.error("Enter a valid quantity.");
      return;
    }
    setBusy(true);
    const res =
      open.mode === "adjust"
        ? await api.post("/api/stock/adjust", { variantId: open.id, targetQty: Math.round(n), note: note || undefined })
        : await api.post("/api/stock/restock", { variantId: open.id, qty: Math.round(n), note: note || undefined });
    setBusy(false);
    if (res.ok) {
      toast.success(open.mode === "adjust" ? "Stock adjusted." : "Stock added.");
      setOpen(null);
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <SearchInput value={query} onChange={setQuery} placeholder="Search product or SKU…" />
      <TableWrap>
        <Table>
          <THead>
            <Th>Item</Th>
            <Th>SKU</Th>
            <Th numeric>Price</Th>
            <Th numeric>On hand</Th>
            <Th numeric>Reorder</Th>
            {canAdjust ? <Th>Actions</Th> : null}
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <EmptyRow colSpan={canAdjust ? 6 : 5}>No matching stock.</EmptyRow>
            ) : (
              filtered.map((r) => (
                <Fragment key={r.variantId}>
                  <Tr>
                    <Td>
                      <span className="flex items-center gap-2">
                        {r.isLow ? <span className="size-2 shrink-0 rounded-full bg-alert" aria-hidden /> : null}
                        {label(r)}
                      </span>
                    </Td>
                    <Td muted>{r.sku}</Td>
                    <Td numeric>{formatMoney(r.price, symbol)}</Td>
                    <Td numeric className={r.isLow ? "text-alert" : undefined}>{r.stockQty}</Td>
                    <Td numeric muted>{r.reorderPoint}</Td>
                    {canAdjust ? (
                      <Td>
                        <span className="flex gap-1">
                          <Button size="sm" variant="secondary" onClick={() => startEdit(r, "restock")}>
                            <PackagePlus className="size-3.5" /> Restock
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => startEdit(r, "adjust")}>
                            <SlidersHorizontal className="size-3.5" /> Adjust
                          </Button>
                        </span>
                      </Td>
                    ) : null}
                  </Tr>
                  {open && open.id === r.variantId ? (
                    <tr className="border-t border-line bg-surface-2">
                      <td colSpan={canAdjust ? 6 : 5} className="px-3 py-3">
                        <div className="flex flex-col items-end gap-3 sm:flex-row sm:items-end">
                          <Field
                            label={open.mode === "adjust" ? "Set count to" : "Add quantity"}
                            htmlFor="stock-val"
                            className="w-40"
                          >
                            <Input
                              id="stock-val"
                              type="number"
                              min={open.mode === "restock" ? 1 : 0}
                              value={value}
                              onChange={(e) => setValue(e.target.value)}
                              autoFocus
                            />
                          </Field>
                          <Field label="Note (optional)" htmlFor="stock-note" className="flex-1">
                            <Input id="stock-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason / reference" />
                          </Field>
                          <div className="flex gap-2">
                            <Button onClick={submit} disabled={busy}>
                              {busy ? "Saving…" : "Save"}
                            </Button>
                            <Button variant="ghost" onClick={() => setOpen(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </TBody>
        </Table>
      </TableWrap>
    </div>
  );
}
