import { requirePermissionPage } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, TableWrap, TBody, Td, Th, THead, Tr, EmptyRow } from "@/components/ui/Table";
import { listAudit } from "@/lib/services/audit";
import { formatDateTime } from "@/lib/format";

function shortId(id: string | null): string {
  return id ? id.slice(0, 8) : "";
}

export default async function AuditPage() {
  await requirePermissionPage("audit:read");
  const rows = await listAudit();

  return (
    <>
      <PageHeader title="Audit log" description="Immutable record of who did what." />

      <TableWrap>
        <Table>
          <THead>
            <Th>Time</Th>
            <Th>Actor</Th>
            <Th>Action</Th>
            <Th>Entity</Th>
            <Th>Detail</Th>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={5}>No activity recorded yet.</EmptyRow>
            ) : (
              rows.map((r) => (
                <Tr key={r.id}>
                  <Td muted>{formatDateTime(r.createdAt)}</Td>
                  <Td>{r.actorEmail ?? "—"}</Td>
                  <Td>
                    <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs text-ink-soft">{r.action}</span>
                  </Td>
                  <Td muted>{r.entity ? `${r.entity} ${shortId(r.entityId)}` : "—"}</Td>
                  <Td muted className="max-w-xs truncate">
                    {r.detail ? JSON.stringify(r.detail) : "—"}
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
