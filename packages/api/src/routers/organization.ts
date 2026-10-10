import { roles } from "@org-saas/auth/permissions";
import { platformAdminRoles } from "@org-saas/auth/platform-permissions";
import { and, asc, count, db, desc, eq, ilike, isNull, not, or, sql } from "@org-saas/db";
import { member, organization, organizationRole, user } from "@org-saas/db/schema/auth";
import { ORPCError } from "@orpc/server";

import type { EffectiveOrganizationOperations } from "../contracts/organization";
import { protectedImplementer } from "../index";
import { getRoleStatements, roleAllows } from "../organization-permissions";

function fail(code: "CONFLICT" | "FORBIDDEN" | "NOT_FOUND", message: string): never {
  throw new ORPCError(code, { message });
}

function emptyOperations(): EffectiveOrganizationOperations {
  return {
    organization: { update: false, archive: false, restore: false },
    member: { create: false, update: false, delete: false },
    invitation: { create: false, cancel: false, viewPending: false },
    team: { create: false, update: false, delete: false },
    roleDefinition: { read: false, create: false, update: false, delete: false },
  };
}

function resolveOperations(
  statements: Record<string, string[]>,
  isOwner: boolean,
  archived: boolean,
): EffectiveOrganizationOperations {
  if (archived) {
    return {
      ...emptyOperations(),
      organization: { update: false, archive: false, restore: isOwner },
    };
  }

  const canCreateInvitations = roleAllows(statements, "invitation", "create");
  const canCancelInvitations = roleAllows(statements, "invitation", "cancel");
  return {
    organization: {
      update: roleAllows(statements, "organization", "update"),
      archive: isOwner,
      restore: false,
    },
    member: {
      create: roleAllows(statements, "member", "create"),
      update: roleAllows(statements, "member", "update"),
      delete: roleAllows(statements, "member", "delete"),
    },
    invitation: {
      create: canCreateInvitations,
      cancel: canCancelInvitations,
      viewPending: canCreateInvitations || canCancelInvitations,
    },
    team: {
      create: roleAllows(statements, "team", "create"),
      update: roleAllows(statements, "team", "update"),
      delete: roleAllows(statements, "team", "delete"),
    },
    roleDefinition: {
      read: roleAllows(statements, "ac", "read"),
      create: roleAllows(statements, "ac", "create"),
      update: roleAllows(statements, "ac", "update"),
      delete: roleAllows(statements, "ac", "delete"),
    },
  };
}

async function loadOrganizationAccess(organizationId: string, userId: string) {
  const [organizationRow] = await db
    .select({
      id: organization.id,
      archivedAt: organization.archivedAt,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  if (!organizationRow) fail("NOT_FOUND", "Organization not found.");

  const [membership] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
    .limit(1);
  if (!membership) fail("FORBIDDEN", "You are not a member of this organization.");

  const owners = await db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .where(eq(member.organizationId, organizationId));
  const ownerMembers = owners.filter((candidate) => candidate.role.split(",").includes("owner"));
  if (ownerMembers.length !== 1 || ownerMembers[0]?.role !== "owner") {
    fail("CONFLICT", "Organization ownership requires review before permission data is available.");
  }

  const isOwner = membership.role === "owner";
  if (organizationRow.archivedAt && !isOwner) {
    fail("FORBIDDEN", "Only the organization owner may access archived organization status.");
  }

  const [customRole] = await db
    .select({ permission: organizationRole.permission })
    .from(organizationRole)
    .where(
      and(
        eq(organizationRole.organizationId, organizationId),
        eq(organizationRole.role, membership.role),
      ),
    )
    .limit(1);
  const statements = getRoleStatements(membership.role, customRole?.permission);

  return {
    organizationId,
    role: membership.role,
    isOwner,
    archivedAt: organizationRow.archivedAt,
    operations: resolveOperations(statements, isOwner, Boolean(organizationRow.archivedAt)),
    statements,
  };
}

function accessContextOutput(access: Awaited<ReturnType<typeof loadOrganizationAccess>>) {
  return {
    organizationId: access.organizationId,
    role: access.role,
    isOwner: access.isOwner,
    status: access.archivedAt ? ("archived" as const) : ("active" as const),
    operations: access.operations,
  };
}

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

function isPlatformAdmin(role: unknown): boolean {
  return (
    typeof role === "string" &&
    role
      .split(",")
      .map((entry) => entry.trim())
      .some((entry) => platformAdminRoles.includes(entry as (typeof platformAdminRoles)[number]))
  );
}

function requirePlatformAdmin(role: unknown): void {
  if (!isPlatformAdmin(role)) fail("FORBIDDEN", "Platform administrator access is required.");
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
        fail("FORBIDDEN", "You are not allowed to assign organization roles.");
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
      const ownerMembers = owners.filter((candidate) =>
        candidate.role.split(",").includes("owner"),
      );
      if (ownerMembers.length !== 1 || ownerMembers[0]?.role !== "owner") {
        fail("CONFLICT", "Organization ownership requires review before archiving.");
      }
      if (ownerMembers[0]?.userId !== context.session.user.id) {
        fail("FORBIDDEN", "Only the current organization owner may archive it.");
      }

      const archivedAt = lockedOrganization.archivedAt ?? new Date();
      if (!lockedOrganization.archivedAt) {
        await tx
          .update(organization)
          .set({ archivedAt })
          .where(eq(organization.id, input.organizationId));
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
      const ownerMembers = owners.filter((candidate) =>
        candidate.role.split(",").includes("owner"),
      );
      if (ownerMembers.length !== 1 || ownerMembers[0]?.role !== "owner") {
        fail("CONFLICT", "Organization ownership requires review before recovery.");
      }
      if (ownerMembers[0]?.userId !== context.session.user.id) {
        fail("FORBIDDEN", "Only the current organization owner may restore it.");
      }
      if (!lockedOrganization.archivedAt) {
        fail("CONFLICT", "Organization is not archived.");
      }

      await tx
        .update(organization)
        .set({ archivedAt: null })
        .where(eq(organization.id, input.organizationId));
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
        fail("FORBIDDEN", "Only the organization owner may view archived status.");
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
