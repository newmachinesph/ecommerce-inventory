import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermissionPage, can } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { Table, TableWrap, TBody, Td, Th, THead, Tr, EmptyRow } from "@/components/ui/Table";
import { listProducts } from "@/lib/services/products";

export default async function ProductsPage() {
  await requirePermissionPage("product:read");
  const [products, canWrite] = await Promise.all([listProducts(), can("product:write")]);

  const exportRows = products.map((p) => ({
    name: p.name,
    brand: p.brand ?? "",
    category: p.categoryName ?? "",
    variants: p.variantCount,
    totalStock: p.totalStock,
    status: p.isActive ? "Active" : "Inactive",
  }));

  return (
    <>
      <PageHeader title="Products" description="Your merchandise catalogue.">
        <ExportCsvButton
          filename={`products-${new Date().toISOString().slice(0, 10)}`}
          rows={exportRows}
          columns={[
            { key: "name", label: "Name" },
            { key: "brand", label: "Brand" },
            { key: "category", label: "Category" },
            { key: "variants", label: "Variants" },
            { key: "totalStock", label: "Total stock" },
            { key: "status", label: "Status" },
          ]}
        />
        {canWrite ? (
          <Link href="/products/new">
            <Button>
              <Plus className="size-4" /> New product
            </Button>
          </Link>
        ) : null}
      </PageHeader>

      <TableWrap>
        <Table>
          <THead>
            <Th>Name</Th>
            <Th>Brand</Th>
            <Th>Category</Th>
            <Th numeric>Variants</Th>
            <Th numeric>Total stock</Th>
            <Th>Status</Th>
          </THead>
          <TBody>
            {products.length === 0 ? (
              <EmptyRow colSpan={6}>No products yet. Add your first one.</EmptyRow>
            ) : (
              products.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <Link href={`/products/${p.id}`} className="font-medium text-ink hover:underline">
                      {p.name}
                    </Link>
                  </Td>
                  <Td muted>{p.brand ?? "—"}</Td>
                  <Td muted>{p.categoryName ?? "—"}</Td>
                  <Td numeric>{p.variantCount}</Td>
                  <Td numeric>{p.totalStock}</Td>
                  <Td>
                    <StatusBadge value={p.isActive ? "ACTIVE" : "ON_HOLD"} label={p.isActive ? "Active" : "Inactive"} />
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
