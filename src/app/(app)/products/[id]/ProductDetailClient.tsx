"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableWrap, TBody, Td, Th, THead, Tr } from "@/components/ui/Table";
import { useToast } from "@/lib/store/toast";
import { api, type ApiResult } from "@/components/ui/api";
import { formatMoney } from "@/lib/format";

// Inlined to avoid pulling the server-side attachments module (node:crypto) into the client bundle.
const rawUrl = (id: string) => `/api/attachments/${id}/raw`;
const isImage = (t: string) => t.startsWith("image/");

interface Variant {
  id: string;
  sku: string;
  variantName: string;
  price: string;
  cost: string;
  stockQty: number;
  reorderPoint: number;
  barcode: string | null;
  isActive: boolean;
}
interface Product {
  id: string;
  name: string;
  description: string | null;
  brand: string | null;
  categoryId: string | null;
  isActive: boolean;
  variants: Variant[];
}
interface Attachment {
  id: string;
  filename: string;
  contentType: string;
}

export function ProductDetailClient({
  product,
  categories,
  canWrite,
  symbol,
}: {
  product: Product;
  categories: { id: string; name: string }[];
  canWrite: boolean;
  symbol: string;
}) {
  const router = useRouter();
  const toast = useToast();

  return (
    <div className="flex flex-col gap-6">
      <VariantsSection product={product} canWrite={canWrite} symbol={symbol} onChange={() => router.refresh()} />
      {canWrite ? (
        <>
          <EditProduct product={product} categories={categories} onSaved={() => router.refresh()} />
          <AddVariant productId={product.id} onAdded={() => router.refresh()} />
        </>
      ) : null}
      <ImagesSection productId={product.id} canWrite={canWrite} toast={toast} />
    </div>
  );
}

function VariantsSection({
  product,
  canWrite,
  symbol,
  onChange,
}: {
  product: Product;
  canWrite: boolean;
  symbol: string;
  onChange: () => void;
}) {
  const toast = useToast();
  async function save(v: Variant, patch: Partial<Variant>) {
    const res = await api.patch(`/api/variants/${v.id}`, patch);
    if (res.ok) {
      toast.success("Variant updated.");
      onChange();
    } else toast.error(res.error);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Variants</h2>
      <TableWrap>
        <Table>
          <THead>
            <Th>SKU</Th>
            <Th>Variant</Th>
            <Th numeric>Price</Th>
            <Th numeric>Cost</Th>
            <Th numeric>On hand</Th>
            <Th numeric>Reorder</Th>
            <Th>Status</Th>
            {canWrite ? <Th> </Th> : null}
          </THead>
          <TBody>
            {product.variants.map((v) => (
              <Tr key={v.id}>
                <Td>{v.sku}</Td>
                <Td muted>{v.variantName}</Td>
                <Td numeric>{formatMoney(v.price, symbol)}</Td>
                <Td numeric muted>{formatMoney(v.cost, symbol)}</Td>
                <Td numeric className={v.stockQty <= v.reorderPoint && v.reorderPoint > 0 ? "text-alert" : ""}>
                  {v.stockQty}
                </Td>
                <Td numeric muted>{v.reorderPoint}</Td>
                <Td>
                  <StatusBadge value={v.isActive ? "ACTIVE" : "ON_HOLD"} label={v.isActive ? "On" : "Off"} />
                </Td>
                {canWrite ? (
                  <Td>
                    <Button size="sm" variant="secondary" onClick={() => save(v, { isActive: !v.isActive })}>
                      {v.isActive ? "Disable" : "Enable"}
                    </Button>
                  </Td>
                ) : null}
              </Tr>
            ))}
          </TBody>
        </Table>
      </TableWrap>
      {canWrite ? <p className="text-xs text-muted">Adjust stock counts on the Stock page.</p> : null}
    </section>
  );
}

function EditProduct({
  product,
  categories,
  onSaved,
}: {
  product: Product;
  categories: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? "");
  const [brand, setBrand] = useState(product.brand ?? "");
  const [categoryId, setCategoryId] = useState(product.categoryId ?? "");
  const [isActive, setIsActive] = useState(product.isActive);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await api.patch(`/api/products/${product.id}`, {
      name: name.trim(),
      description: description.trim() || null,
      brand: brand.trim() || null,
      categoryId: categoryId || null,
      isActive,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Product saved.");
      onSaved();
    } else toast.error(res.error);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Edit product</h2>
      <div className="grid grid-cols-1 gap-4 rounded-card border border-line bg-surface p-6 sm:grid-cols-2">
        <Field label="Name" htmlFor="e-name" className="sm:col-span-2">
          <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Brand" htmlFor="e-brand">
          <Input id="e-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </Field>
        <Field label="Category" htmlFor="e-cat">
          <Select id="e-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="e-desc" className="sm:col-span-2">
          <Textarea id="e-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
        </label>
        <div className="flex items-end justify-end sm:col-span-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function AddVariant({ productId, onAdded }: { productId: string; onAdded: () => void }) {
  const toast = useToast();
  const [sku, setSku] = useState("");
  const [variantName, setVariantName] = useState("");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("0");
  const [reorderPoint, setReorderPoint] = useState("0");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!sku.trim() || !price) return toast.error("SKU and price are required.");
    setSaving(true);
    const res = await api.post(`/api/products/${productId}/variants`, {
      sku: sku.trim(),
      variantName: variantName.trim() || "Default",
      price,
      stockQty: Number(stockQty) || 0,
      reorderPoint: Number(reorderPoint) || 0,
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Variant added.");
      setSku("");
      setVariantName("");
      setPrice("");
      setStockQty("0");
      setReorderPoint("0");
      onAdded();
    } else toast.error(res.error);
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Add variant</h2>
      <div className="grid grid-cols-2 gap-3 rounded-card border border-line bg-surface p-4 sm:grid-cols-6">
        <Field label="SKU" htmlFor="av-sku" className="col-span-2">
          <Input id="av-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
        </Field>
        <Field label="Variant" htmlFor="av-name" className="col-span-2">
          <Input id="av-name" value={variantName} onChange={(e) => setVariantName(e.target.value)} placeholder="Default" />
        </Field>
        <Field label="Price" htmlFor="av-price">
          <Input id="av-price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Opening stock" htmlFor="av-stock">
          <Input id="av-stock" type="number" min={0} value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
        </Field>
        <Field label="Reorder point" htmlFor="av-ro">
          <Input id="av-ro" type="number" min={0} value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} />
        </Field>
        <div className="col-span-2 flex items-end">
          <Button onClick={add} disabled={saving}>
            <Plus className="size-4" /> {saving ? "Adding…" : "Add"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function ImagesSection({
  productId,
  canWrite,
  toast,
}: {
  productId: string;
  canWrite: boolean;
  toast: ReturnType<typeof useToast>;
}) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch(`/api/attachments?entity=product&entityId=${productId}`);
    const json = (await res.json()) as ApiResult<Attachment[]>;
    if (json.ok) setFiles(json.data);
  }
  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetch(`/api/attachments?entity=product&entityId=${productId}`);
      const json = (await res.json()) as ApiResult<Attachment[]>;
      if (active && json.ok) setFiles(json.data);
    })();
    return () => {
      active = false;
    };
  }, [productId]);

  async function upload(file: File) {
    setBusy(true);
    const form = new FormData();
    form.set("entity", "product");
    form.set("entityId", productId);
    form.set("file", file);
    const res = await fetch("/api/attachments", { method: "POST", body: form });
    const json = (await res.json()) as ApiResult<Attachment>;
    setBusy(false);
    if (json.ok) {
      toast.success("Uploaded.");
      load();
    } else {
      toast.error(json.error);
    }
  }

  async function remove(id: string) {
    const res = await api.del(`/api/attachments/${id}`);
    if (res.ok) {
      toast.success("Removed.");
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } else toast.error(res.error);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Images & files</h2>
        {canWrite ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = "";
              }}
            />
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" /> {busy ? "Uploading…" : "Upload"}
            </Button>
          </>
        ) : null}
      </div>
      {files.length === 0 ? (
        <p className="rounded-card border border-dashed border-line bg-surface p-6 text-center text-sm text-muted">
          No files yet. Requires Cloudflare R2 to be configured.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {files.map((f) => (
            <div key={f.id} className="group relative overflow-hidden rounded-card border border-line bg-surface">
              {isImage(f.contentType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={rawUrl(f.id)} alt={f.filename} className="aspect-square w-full object-cover" />
              ) : (
                <a href={rawUrl(f.id)} target="_blank" rel="noopener noreferrer" className="flex aspect-square items-center justify-center p-2 text-center text-xs text-ink-soft">
                  {f.filename}
                </a>
              )}
              {canWrite ? (
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  aria-label="Delete"
                  className="absolute right-1 top-1 hidden rounded-md bg-surface/90 p-1 text-alert group-hover:block"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
