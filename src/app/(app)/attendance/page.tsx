import { requireUserPage, can } from "@/lib/auth/dal";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, TableWrap, TBody, Td, Th, THead, Tr, EmptyRow } from "@/components/ui/Table";
import { currentOpenShift, listAllShifts, listMyShifts } from "@/lib/services/attendance";
import { formatDateTime, hoursBetween } from "@/lib/format";
import { ClockCard } from "./ClockCard";

export default async function AttendancePage() {
  const user = await requireUserPage();
  const [open, mine, canSeeAll] = await Promise.all([
    currentOpenShift(user.id),
    listMyShifts(user.id),
    can("attendance:read"),
  ]);
  const all = canSeeAll ? await listAllShifts() : [];

  return (
    <>
      <PageHeader title="Attendance" description="Clock in and out; review shifts." />

      <ClockCard isOpen={Boolean(open)} openedAt={open ? open.clockIn.toISOString() : null} />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">My shifts</h2>
        <TableWrap>
          <Table>
            <THead>
              <Th>Clock in</Th>
              <Th>Clock out</Th>
              <Th numeric>Hours</Th>
            </THead>
            <TBody>
              {mine.length === 0 ? (
                <EmptyRow colSpan={3}>No shifts yet.</EmptyRow>
              ) : (
                mine.map((s) => (
                  <Tr key={s.id}>
                    <Td>{formatDateTime(s.clockIn)}</Td>
                    <Td muted>{s.clockOut ? formatDateTime(s.clockOut) : "—"}</Td>
                    <Td numeric>{hoursBetween(s.clockIn, s.clockOut)}</Td>
                  </Tr>
                ))
              )}
            </TBody>
          </Table>
        </TableWrap>
      </section>

      {canSeeAll ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">All staff</h2>
          <TableWrap>
            <Table>
              <THead>
                <Th>Employee</Th>
                <Th>Clock in</Th>
                <Th>Clock out</Th>
                <Th numeric>Hours</Th>
              </THead>
              <TBody>
                {all.length === 0 ? (
                  <EmptyRow colSpan={4}>No shifts recorded.</EmptyRow>
                ) : (
                  all.map((s) => (
                    <Tr key={s.id}>
                      <Td>{s.employeeName}</Td>
                      <Td>{formatDateTime(s.clockIn)}</Td>
                      <Td>
                        {s.clockOut ? (
                          <span className="text-muted">{formatDateTime(s.clockOut)}</span>
                        ) : (
                          <StatusBadge value="ACTIVE" label="On shift" />
                        )}
                      </Td>
                      <Td numeric>{hoursBetween(s.clockIn, s.clockOut)}</Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>
          </TableWrap>
        </section>
      ) : null}
    </>
  );
}
