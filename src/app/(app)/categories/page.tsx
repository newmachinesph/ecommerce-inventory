import { requirePermissionPage, can } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { listCategories } from "@/lib/services/products";
import { CategoryManager } from "./CategoryManager";

export default async function CategoriesPage() {
  await requirePermissionPage("category:read");
  const [categories, canWrite] = await Promise.all([listCategories(), can("category:write")]);

  return (
    <>
      <PageHeader title="Categories" description="Group products for easier browsing and reporting." />
      <CategoryManager categories={categories.map((c) => ({ id: c.id, name: c.name }))} canWrite={canWrite} />
    </>
  );
}
