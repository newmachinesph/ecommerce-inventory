import { z } from "zod";
import { handler, ok, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/auth/dal";
import { clockIn, clockOut } from "@/lib/services/attendance";
import { writeAudit } from "@/lib/services/audit";
import { db } from "@/db";

const schema = z.object({ action: z.enum(["in", "out"]) });

export const POST = handler(async (req) => {
  const user = await requireUser(); // any authenticated employee clocks their own shift
  const { action } = await parseBody(req, schema);
  const row = action === "in" ? await clockIn(user.id) : await clockOut(user.id);
  await writeAudit(db, {
    actorId: user.id,
    actorEmail: user.email,
    action: action === "in" ? "CLOCK_IN" : "CLOCK_OUT",
    entity: "attendance",
    entityId: row.id,
  });
  return ok(row);
});
