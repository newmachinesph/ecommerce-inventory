import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermissionPage, can } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getProduct, listCategories } from "@/lib/services/products";
import { getStoreSettings } from "@/lib/services/settings";
import { ProductDetailClient } from "./ProductDetailClient";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermissionPage("product:read");
  const { id } = await params;
  const [product, categories, canWrite, settings] = await Promise.all([
    getProduct(id),
    listCategories(),
    can("product:write"),
    getStoreSettings(),
  ]);

  return (
    <>
      <PageHeader title={product.name} description={product.brand ?? undefined}>
        <StatusBadge value={product.isActive ? "ACTIVE" : "ON_HOLD"} label={product.isActive ? "Active" : "Inactive"} />
        <Link href="/products" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Back
        </Link>
      </PageHeader>

      <ProductDetailClient
        product={product}
        categories={categories}
        canWrite={canWrite}
        symbol={settings.currencySymbol}
      />
    </>
  );
}
