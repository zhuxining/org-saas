import { auditEvents, createAuditRecord } from "@org-saas/auth/audit-records";
import { resolveOrganizationOwner } from "@org-saas/auth/organization-owner";
import { roles } from "@org-saas/auth/permissions";
import { hasPlatformAdminRole } from "@org-saas/auth/platform-permissions";
import { and, asc, count, db, desc, eq, ilike, isNull, not, or, sql } from "@org-saas/db";
import { member, organization, organizationRole, user, auditLog } from "@org-saas/db/schema/auth";

import { protectedImplementer } from "../index";
import { accessContextOutput, fail, loadOrganizationAccess } from "../organization-access";
import { getRoleStatements, roleAllows } from "../organization-permissions";

function containsPermissions(
  candidate: Record<string, string[]>,
  grantor: Record<string, string[]>,
): boolean {
  return (
    Object.entries(candidate).every(([, actions]) => Array.isArray(actions)) &&
    Object.entries(candidate).every(([resource, actions]) =>
      actions.every((action) => roleAllows(grantor, resource, action)),
    )
  );
}

function isAdminEquivalent(candidate: Record<string, string[]>): boolean {
  return Object.entries(roles.admin.statements as unknown as Record<string, string[]>).every(
    ([resource, actions]) => actions.every((action) => roleAllows(candidate, resource, action)),
  );
}

function requirePlatformAdmin(role: unknown): void {
  if (!hasPlatformAdminRole(role))
    fail("FORBIDDEN", "Platform administrator access is required.", "PLATFORM_ADMIN_REQUIRED");
}

function containsPattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

export const organizationRouter = {
  resolveBySlug: protectedImplementer.organization.resolveBySlug.handler(
    async ({ context, input }) => {
      const [organizationRow] = await db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          logo: organization.logo,
          createdAt: organization.createdAt,
        })
        .from(organization)
        .where(eq(organization.slug, input.slug))
        .limit(1);
      if (!organizationRow) fail("NOT_FOUND", "Organization not found.");

      const access = await loadOrganizationAccess(organizationRow.id, context.session.user.id);
      return {
        organization: {
          ...organizationRow,
          createdAt: organizationRow.createdAt.toISOString(),
        },
        access: accessContextOutput(access),
      };
    },
  ),
  accessContext: protectedImplementer.organization.accessContext.handler(
    async ({ context, input }) => {
      const access = await loadOrganizationAccess(input.organizationId, context.session.user.id);
      return accessContextOutput(access);
    },
  ),
  grantableRoles: protectedImplementer.organization.grantableRoles.handler(
    async ({ context, input }) => {
      const access = await loadOrganizationAccess(input.organizationId, context.session.user.id);
      const [resource, action] = input.operation.split(".");
      if (!roleAllows(access.statements, resource ?? "", action ?? "")) {
        fail(
          "FORBIDDEN",
          "You are not allowed to assign organization roles.",
          "ORGANIZATION_OPERATION_FORBIDDEN",
        );
      }

      const customRoles = await db
        .select({ role: organizationRole.role, permission: organizationRole.permission })
        .from(organizationRole)
        .where(eq(organizationRole.organizationId, input.organizationId));
      const candidates = [
        ...Object.entries(roles).map(([name, role]) => ({
          name,
          custom: false,
          statements: role.statements as Record<string, string[]>,
        })),
        ...customRoles.map(({ role, permission }) => ({
          name: role,
          custom: true,
          statements: getRoleStatements(role, permission),
        })),
      ];

      return candidates
        .filter(({ name, statements }) => {
          if (name === "owner" || !containsPermissions(statements, access.statements)) return false;
          if (!access.isOwner && isAdminEquivalent(statements)) return false;
          return true;
        })
        .map(({ name, custom }) => ({ name, custom }));
    },
  ),
  archive: protectedImplementer.organization.archive.handler(async ({ context, input }) => {
    return db.transaction(async (tx) => {
      const [lockedOrganization] = await tx
        .update(organization)
        .set({ ownerMutationVersion: sql`${organization.ownerMutationVersion} + 1` })
        .where(eq(organization.id, input.organizationId))
        .returning({ id: organization.id, archivedAt: organization.archivedAt });
      if (!lockedOrganization) fail("NOT_FOUND", "Organization not found.");

      const owners = await tx
        .select({ userId: member.userId, role: member.role })
        .from(member)
        .where(eq(member.organizationId, input.organizationId));
      const ownerState = resolveOrganizationOwner(owners);
      if (ownerState.status !== "valid") {
        fail(
          "CONFLICT",
          "Organization ownership requires review before archiving.",
          "OWNER_STATE_INVALID",
        );
      }
      if (ownerState.owner.userId !== context.session.user.id) {
        fail("FORBIDDEN", "Only the current organization owner may archive it.", "OWNER_REQUIRED");
      }

      const archivedAt = lockedOrganization.archivedAt ?? new Date();
      if (!lockedOrganization.archivedAt) {
        await tx
          .update(organization)
          .set({ archivedAt })
          .where(eq(organization.id, input.organizationId));
        await tx.insert(auditLog).values(
          createAuditRecord({
            scope: "organization",
            organizationId: input.organizationId,
            actorId: context.session.user.id,
            actorName: context.session.user.name,
            action: auditEvents.organizationArchived.action,
            targetType: auditEvents.organizationArchived.targetType,
            targetId: input.organizationId,
          }),
        );
      }
      return {
        organizationId: input.organizationId,
        status: "archived" as const,
        archivedAt: archivedAt.toISOString(),
      };
    });
  }),
  restore: protectedImplementer.organization.restore.handler(async ({ context, input }) => {
    return db.transaction(async (tx) => {
      const [lockedOrganization] = await tx
        .update(organization)
        .set({ ownerMutationVersion: sql`${organization.ownerMutationVersion} + 1` })
        .where(eq(organization.id, input.organizationId))
        .returning({ id: organization.id, archivedAt: organization.archivedAt });
      if (!lockedOrganization) fail("NOT_FOUND", "Organization not found.");

      const owners = await tx
        .select({ userId: member.userId, role: member.role })
        .from(member)
        .where(eq(member.organizationId, input.organizationId));
      const ownerState = resolveOrganizationOwner(owners);
      if (ownerState.status !== "valid") {
        fail(
          "CONFLICT",
          "Organization ownership requires review before recovery.",
          "OWNER_STATE_INVALID",
        );
      }
      if (ownerState.owner.userId !== context.session.user.id) {
        fail("FORBIDDEN", "Only the current organization owner may restore it.", "OWNER_REQUIRED");
      }
      if (!lockedOrganization.archivedAt) {
        fail("CONFLICT", "Organization is not archived.", "ORGANIZATION_NOT_ARCHIVED");
      }

      await tx
        .update(organization)
        .set({ archivedAt: null })
        .where(eq(organization.id, input.organizationId));
      await tx.insert(auditLog).values(
        createAuditRecord({
          scope: "organization",
          organizationId: input.organizationId,
          actorId: context.session.user.id,
          actorName: context.session.user.name,
          action: auditEvents.organizationRestored.action,
          targetType: auditEvents.organizationRestored.targetType,
          targetId: input.organizationId,
        }),
      );
      return {
        organizationId: input.organizationId,
        status: "active" as const,
        archivedAt: null,
      };
    });
  }),
  archivedStatus: protectedImplementer.organization.archivedStatus.handler(
    async ({ context, input }) => {
      const access = await loadOrganizationAccess(input.organizationId, context.session.user.id);
      if (!access.isOwner)
        fail(
          "FORBIDDEN",
          "Only the organization owner may view archived status.",
          "OWNER_REQUIRED",
        );
      if (!access.archivedAt) fail("NOT_FOUND", "Archived organization not found.");

      const [organizationRow] = await db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        })
        .from(organization)
        .where(eq(organization.id, input.organizationId))
        .limit(1);
      if (!organizationRow) fail("NOT_FOUND", "Archived organization not found.");

      return {
        organizationId: organizationRow.id,
        name: organizationRow.name,
        slug: organizationRow.slug,
        status: "archived" as const,
        archivedAt: access.archivedAt.toISOString(),
      };
    },
  ),
};

export const platformRouter = {
  listOrganizations: protectedImplementer.platform.listOrganizations.handler(
    async ({ context, input }) => {
      requirePlatformAdmin(context.session.user.role);
      const condition = input.search
        ? or(
            ilike(organization.name, containsPattern(input.search)),
            ilike(organization.slug, containsPattern(input.search)),
          )
        : undefined;
      const [countRow] = await db.select({ value: count() }).from(organization).where(condition);
      const rows = await db
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          archivedAt: organization.archivedAt,
          createdAt: organization.createdAt,
        })
        .from(organization)
        .where(condition)
        .orderBy(desc(organization.createdAt), asc(organization.id))
        .limit(input.limit)
        .offset(input.offset);

      return {
        items: rows.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          archived: row.archivedAt !== null,
          createdAt: row.createdAt.toISOString(),
        })),
        total: Number(countRow?.value ?? 0),
        limit: input.limit,
        offset: input.offset,
      };
    },
  ),
  listUsers: protectedImplementer.platform.listUsers.handler(async ({ context, input }) => {
    requirePlatformAdmin(context.session.user.role);
    const ordinaryUser = or(isNull(user.role), not(ilike(user.role, "%platform-admin%")));
    const searchCondition = input.search
      ? or(
          ilike(user.name, containsPattern(input.search)),
          ilike(user.email, containsPattern(input.search)),
        )
      : undefined;
    const condition = searchCondition ? and(ordinaryUser, searchCondition) : ordinaryUser;
    const [countRow] = await db.select({ value: count() }).from(user).where(condition);
    const rows = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: user.emailVerified,
        banned: user.banned,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(condition)
      .orderBy(desc(user.createdAt), asc(user.id))
      .limit(input.limit)
      .offset(input.offset);

    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        image: row.image,
        emailVerified: row.emailVerified,
        banned: row.banned ?? false,
        createdAt: row.createdAt.toISOString(),
      })),
      total: Number(countRow?.value ?? 0),
      limit: input.limit,
      offset: input.offset,
    };
  }),
};
