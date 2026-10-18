"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select, FormError } from "@/components/ui/Field";
import { useToast } from "@/lib/store/toast";
import { api, type ApiResult } from "@/components/ui/api";

interface VariantDraft {
  sku: string;
  variantName: string;
  price: string;
  cost: string;
  stockQty: string;
  reorderPoint: string;
  barcode: string;
}

const emptyVariant = (): VariantDraft => ({
  sku: "",
  variantName: "Default",
  price: "",
  cost: "0",
  stockQty: "0",
  reorderPoint: "0",
  barcode: "",
});

export default function NewProductPage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/categories");
      const json = (await res.json()) as ApiResult<{ id: string; name: string }[]>;
      if (json.ok) setCategories(json.data);
    })();
  }, []);

  function updateVariant(i: number, patch: Partial<VariantDraft>) {
    setVariants((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  }

  async function submit() {
    setError(null);
    if (!name.trim()) return setError("Product name is required.");
    if (variants.some((v) => !v.sku.trim() || !v.price)) return setError("Every variant needs a SKU and price.");

    setSaving(true);
    const res = await api.post<{ id: string }>("/api/products", {
      name: name.trim(),
      description: description.trim() || null,
      brand: brand.trim() || null,
      categoryId: categoryId || null,
      variants: variants.map((v) => ({
        sku: v.sku.trim(),
        variantName: v.variantName.trim() || "Default",
        price: v.price,
        cost: v.cost || "0",
        stockQty: Number(v.stockQty) || 0,
        reorderPoint: Number(v.reorderPoint) || 0,
        barcode: v.barcode.trim() || null,
      })),
    });
    setSaving(false);

    if (res.ok) {
      toast.success("Product created.");
      router.push(`/products/${res.data.id}`);
    } else {
      setError(res.error);
    }
  }

  return (
    <>
      <PageHeader title="New product" description="Add a product and its sellable variants.">
        <Link href="/products">
          <Button variant="secondary">Cancel</Button>
        </Link>
      </PageHeader>

      {error ? <FormError>{error}</FormError> : null}

      <div className="grid grid-cols-1 gap-4 rounded-card border border-line bg-surface p-6 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" required className="sm:col-span-2">
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Classic T-Shirt" />
        </Field>
        <Field label="Brand" htmlFor="brand">
          <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </Field>
        <Field label="Category" htmlFor="category">
          <Select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" htmlFor="description" className="sm:col-span-2">
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">Variants</h2>
          <Button size="sm" variant="secondary" onClick={() => setVariants((p) => [...p, emptyVariant()])}>
            <Plus className="size-4" /> Add variant
          </Button>
        </div>

        {variants.map((v, i) => (
          <div key={i} className="grid grid-cols-2 gap-3 rounded-card border border-line bg-surface p-4 sm:grid-cols-6">
            <Field label="SKU" htmlFor={`sku-${i}`} required className="col-span-2">
              <Input id={`sku-${i}`} value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} />
            </Field>
            <Field label="Variant" htmlFor={`vn-${i}`} className="col-span-2">
              <Input id={`vn-${i}`} value={v.variantName} onChange={(e) => updateVariant(i, { variantName: e.target.value })} />
            </Field>
            <Field label="Price" htmlFor={`price-${i}`} required>
              <Input id={`price-${i}`} type="number" min={0} value={v.price} onChange={(e) => updateVariant(i, { price: e.target.value })} />
            </Field>
            <Field label="Cost" htmlFor={`cost-${i}`}>
              <Input id={`cost-${i}`} type="number" min={0} value={v.cost} onChange={(e) => updateVariant(i, { cost: e.target.value })} />
            </Field>
            <Field label="Opening stock" htmlFor={`stock-${i}`}>
              <Input id={`stock-${i}`} type="number" min={0} value={v.stockQty} onChange={(e) => updateVariant(i, { stockQty: e.target.value })} />
            </Field>
            <Field label="Reorder point" htmlFor={`ro-${i}`}>
              <Input id={`ro-${i}`} type="number" min={0} value={v.reorderPoint} onChange={(e) => updateVariant(i, { reorderPoint: e.target.value })} />
            </Field>
            <Field label="Barcode" htmlFor={`bc-${i}`} className="col-span-2">
              <Input id={`bc-${i}`} value={v.barcode} onChange={(e) => updateVariant(i, { barcode: e.target.value })} />
            </Field>
            <div className="col-span-2 flex items-end">
              {variants.length > 1 ? (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setVariants((p) => p.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-4" /> Remove
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={saving}>
          {saving ? "Creating…" : "Create product"}
        </Button>
      </div>
    </>
  );
}
