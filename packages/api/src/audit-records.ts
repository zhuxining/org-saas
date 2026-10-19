import { and, count, db, desc, eq, gte, isNull } from "@org-saas/db";
import { getAuditLogRetentionCutoff } from "@org-saas/db/audit-retention";
import { auditLog } from "@org-saas/db/schema/auth";

export type AuditRecordFilters = {
  limit: number;
  offset: number;
  action?: string;
  actorId?: string;
  targetType?: string;
};

export type AuditRecordScope =
  | { scope: "organization"; organizationId: string }
  | { scope: "platform" };

function serializeAuditRow(row: typeof auditLog.$inferSelect) {
  return {
    id: row.id,
    scope: row.scope as "organization" | "platform",
    organizationId: row.organizationId,
    actorId: row.actorId,
    actorName: row.actorName,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    summary: row.summary,
    occurredAt: row.occurredAt.toISOString(),
  };
}

export async function listAuditRecords(scope: AuditRecordScope, input: AuditRecordFilters) {
  const scopeCondition =
    scope.scope === "organization"
      ? and(eq(auditLog.scope, "organization"), eq(auditLog.organizationId, scope.organizationId))
      : and(eq(auditLog.scope, "platform"), isNull(auditLog.organizationId));
  const conditions = and(
    scopeCondition,
    gte(auditLog.occurredAt, getAuditLogRetentionCutoff()),
    ...(input.action ? [eq(auditLog.action, input.action)] : []),
    ...(input.actorId ? [eq(auditLog.actorId, input.actorId)] : []),
    ...(input.targetType ? [eq(auditLog.targetType, input.targetType)] : []),
  );

  const [[totalRow], rows] = await Promise.all([
    db.select({ value: count() }).from(auditLog).where(conditions),
    db
      .select()
      .from(auditLog)
      .where(conditions)
      .orderBy(desc(auditLog.occurredAt), desc(auditLog.id))
      .limit(input.limit)
      .offset(input.offset),
  ]);

  return {
    items: rows.map(serializeAuditRow),
    total: Number(totalRow?.value ?? 0),
    limit: input.limit,
    offset: input.offset,
  };
}
