import { requirePermissionPage, can } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { listStock } from "@/lib/services/stock";
import { getStoreSettings } from "@/lib/services/settings";
import { StockTable } from "./StockTable";

export default async function StockPage() {
  await requirePermissionPage("stock:read");
  const [rows, canAdjust, settings] = await Promise.all([listStock(), can("stock:adjust"), getStoreSettings()]);

  // Flat, spreadsheet-friendly shape for the export (stock / "bottle" checking backup).
  const exportRows = rows.map((r) => ({
    product: r.productName,
    variant: r.variantName,
    sku: r.sku,
    onHand: r.stockQty,
    reorderPoint: r.reorderPoint,
    price: r.price,
    lowStock: r.isLow ? "LOW" : "",
  }));

  return (
    <>
      <PageHeader title="Stock" description="On-hand quantities across every variant.">
        <ExportCsvButton
          filename={`stock-${new Date().toISOString().slice(0, 10)}`}
          rows={exportRows}
          columns={[
            { key: "product", label: "Product" },
            { key: "variant", label: "Variant" },
            { key: "sku", label: "SKU" },
            { key: "onHand", label: "On hand" },
            { key: "reorderPoint", label: "Reorder point" },
            { key: "price", label: "Price" },
            { key: "lowStock", label: "Low stock" },
          ]}
        />
      </PageHeader>
      <StockTable rows={rows} canAdjust={canAdjust} symbol={settings.currencySymbol} />
    </>
  );
}
