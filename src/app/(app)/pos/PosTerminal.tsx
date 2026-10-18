"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/lib/store/toast";
import { api, type ApiResult } from "@/components/ui/api";
import { formatMoney } from "@/lib/format";

interface Sellable {
  variantId: string;
  sku: string;
  label: string;
  price: string;
  stockQty: number;
}
interface CartLine extends Sellable {
  qty: number;
}

export function PosTerminal({ symbol }: { symbol: string }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Sellable[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState("");
  const [discount, setDiscount] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live search (debounced).
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      const res = await fetch(`/api/sales/sellable?q=${encodeURIComponent(query)}`);
      const json = (await res.json()) as ApiResult<Sellable[]>;
      if (json.ok) setResults(json.data);
    }, 200);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  function addToCart(v: Sellable) {
    setCart((prev) => {
      const existing = prev.find((l) => l.variantId === v.variantId);
      if (existing) {
        if (existing.qty >= v.stockQty) {
          toast.error(`Only ${v.stockQty} in stock for ${v.sku}.`);
          return prev;
        }
        return prev.map((l) => (l.variantId === v.variantId ? { ...l, qty: l.qty + 1 } : l));
      }
      if (v.stockQty <= 0) {
        toast.error(`${v.sku} is out of stock.`);
        return prev;
      }
      return [...prev, { ...v, qty: 1 }];
    });
  }

  function setQty(variantId: string, qty: number) {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.variantId !== variantId) return [l];
        if (qty <= 0) return [];
        if (qty > l.stockQty) {
          toast.error(`Only ${l.stockQty} in stock for ${l.sku}.`);
          return [{ ...l, qty: l.stockQty }];
        }
        return [{ ...l, qty }];
      }),
    );
  }

  const subtotal = cart.reduce((sum, l) => sum + Number(l.price) * l.qty, 0);
  const discountNum = Math.max(0, Number(discount) || 0);
  const total = Math.max(0, subtotal - discountNum);

  async function checkout() {
    if (cart.length === 0) return;
    setSubmitting(true);
    const res = await api.post<{ saleNumber: number }>("/api/sales", {
      customerName: customer || null,
      discount: discountNum.toFixed(2),
      items: cart.map((l) => ({ variantId: l.variantId, qty: l.qty })),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success(`Sale #${res.data.saleNumber} recorded.`);
      setCart([]);
      setCustomer("");
      setDiscount("0");
      setQuery("");
    } else {
      toast.error(res.error);
    }
  }

  return (
    <>
      <PageHeader title="Point of sale" description="Ring up a counter sale." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Search + results */}
        <section className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, SKU or barcode…"
              className="h-11 w-full rounded-md border border-line-strong bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {results.map((v) => (
              <button
                key={v.variantId}
                type="button"
                onClick={() => addToCart(v)}
                disabled={v.stockQty <= 0}
                className="flex items-center justify-between gap-2 rounded-card border border-line bg-surface p-3 text-left transition-colors hover:border-ink-soft disabled:opacity-45"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">{v.label}</span>
                  <span className="block text-xs text-muted">
                    {v.sku} · {v.stockQty} in stock
                  </span>
                </span>
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <span className="tabular text-sm text-ink">{formatMoney(v.price, symbol)}</span>
                  <Plus className="size-4 text-muted" />
                </span>
              </button>
            ))}
            {results.length === 0 ? (
              <p className="col-span-full py-8 text-center text-sm text-muted">No matching items.</p>
            ) : null}
          </div>
        </section>

        {/* Cart */}
        <section className="flex h-fit flex-col gap-3 rounded-card border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Cart</h2>
          {cart.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Add items to start a sale.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {cart.map((l) => (
                <li key={l.variantId} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{l.label}</span>
                    <span className="block text-xs text-muted">{formatMoney(l.price, symbol)} each</span>
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={l.stockQty}
                    value={l.qty}
                    onChange={(e) => setQty(l.variantId, Number(e.target.value))}
                    className="h-8 w-14 rounded-md border border-line-strong bg-surface px-2 text-center text-sm tabular"
                  />
                  <span className="w-20 text-right text-sm tabular text-ink">
                    {formatMoney(Number(l.price) * l.qty, symbol)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty(l.variantId, 0)}
                    className="text-muted hover:text-alert"
                    aria-label="Remove"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Field label="Customer (optional)" htmlFor="customer">
            <Input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Walk-in" />
          </Field>
          <Field label="Discount" htmlFor="discount">
            <Input
              id="discount"
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </Field>

          <dl className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
            <div className="flex justify-between text-muted">
              <dt>Subtotal</dt>
              <dd className="tabular">{formatMoney(subtotal, symbol)}</dd>
            </div>
            <div className="flex justify-between text-muted">
              <dt>Discount</dt>
              <dd className="tabular">-{formatMoney(discountNum, symbol)}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold text-ink">
              <dt>Total</dt>
              <dd className="tabular">{formatMoney(total, symbol)}</dd>
            </div>
          </dl>

          <Button onClick={checkout} disabled={submitting || cart.length === 0} className="w-full">
            {submitting ? "Recording…" : `Charge ${formatMoney(total, symbol)}`}
          </Button>
        </section>
      </div>
    </>
  );
}
