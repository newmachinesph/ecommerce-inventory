"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Table, TableWrap, TBody, Td, Th, THead, Tr, EmptyRow } from "@/components/ui/Table";
import { useToast } from "@/lib/store/toast";
import { api } from "@/components/ui/api";

interface Category {
  id: string;
  name: string;
}

export function CategoryManager({ categories, canWrite }: { categories: Category[]; canWrite: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await api.post("/api/categories", { name });
    setBusy(false);
    if (res.ok) {
      toast.success("Category added.");
      setName("");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <TableWrap>
        <Table>
          <THead>
            <Th>Name</Th>
          </THead>
          <TBody>
            {categories.length === 0 ? (
              <EmptyRow colSpan={1}>No categories yet.</EmptyRow>
            ) : (
              categories.map((c) => (
                <Tr key={c.id}>
                  <Td className="text-ink">{c.name}</Td>
                </Tr>
              ))
            )}
          </TBody>
        </Table>
      </TableWrap>

      {canWrite ? (
        <form onSubmit={add} className="flex h-fit flex-col gap-4 rounded-card border border-line bg-surface p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
            <Plus className="size-4" /> New category
          </h2>
          <Field label="Name" htmlFor="cat" required>
            <Input id="cat" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add category"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
