import { platformAdminRoles } from "@org-saas/auth/platform-permissions";
import { and, count, db, desc, eq, gte, isNull } from "@org-saas/db";
import { auditLog } from "@org-saas/db/schema/auth";
import { ORPCError } from "@orpc/server";

import { protectedImplementer } from "../index";
import { loadOrganizationAccess } from "./organization";

const retentionStart = () => new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

function isPlatformAdmin(role: unknown): boolean {
  return (
    typeof role === "string" &&
    role
      .split(",")
      .map((entry) => entry.trim())
      .some((entry) => platformAdminRoles.includes(entry as (typeof platformAdminRoles)[number]))
  );
}

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

export const auditRouter = {
  listOrganizationEvents: protectedImplementer.audit.listOrganizationEvents.handler(
    async ({ context, input }) => {
      const access = await loadOrganizationAccess(input.organizationId, context.session.user.id);
      if (!access.operations.audit.read) {
        throw new ORPCError("FORBIDDEN", {
          message: "You are not allowed to view this organization's audit log.",
        });
      }

      const conditions = and(
        eq(auditLog.scope, "organization"),
        eq(auditLog.organizationId, input.organizationId),
        gte(auditLog.occurredAt, retentionStart()),
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
    },
  ),
  listPlatformEvents: protectedImplementer.audit.listPlatformEvents.handler(
    async ({ context, input }) => {
      if (!isPlatformAdmin(context.session.user.role)) {
        throw new ORPCError("FORBIDDEN", { message: "Platform administrator access is required." });
      }

      const conditions = and(
        eq(auditLog.scope, "platform"),
        isNull(auditLog.organizationId),
        gte(auditLog.occurredAt, retentionStart()),
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
    },
  ),
};
