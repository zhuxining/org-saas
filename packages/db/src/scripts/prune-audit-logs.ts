import { inArray, lt } from "drizzle-orm";

import { getAuditLogRetentionCutoff } from "../audit-retention";
import { db } from "../index";
import { auditLog } from "../schema/auth";

const retentionCutoff = getAuditLogRetentionCutoff();
const batchSize = 1_000;
let deletedCount = 0;

while (true) {
  const expiredRows = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(lt(auditLog.occurredAt, retentionCutoff))
    .orderBy(auditLog.occurredAt, auditLog.id)
    .limit(batchSize);
  if (expiredRows.length === 0) break;

  const deletedRows = await db
    .delete(auditLog)
    .where(
      inArray(
        auditLog.id,
        expiredRows.map((row) => row.id),
      ),
    )
    .returning({ id: auditLog.id });
  deletedCount += deletedRows.length;
}

console.info(`Removed ${deletedCount} audit records older than ${retentionCutoff.toISOString()}.`);
