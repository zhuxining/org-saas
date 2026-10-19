import { resolveOrganizationOwner } from "@org-saas/auth/organization-owner";
import { and, db, eq } from "@org-saas/db";
import { member, organization, organizationRole } from "@org-saas/db/schema/auth";
import { ORPCError } from "@orpc/server";

import type { EffectiveOrganizationOperations } from "./contracts/organization";
import { getRoleStatements, roleAllows } from "./organization-permissions";

export function fail(
  code: "CONFLICT" | "FORBIDDEN" | "NOT_FOUND",
  message: string,
  reason?: string,
): never {
  throw new ORPCError(code, { message, data: reason ? { reason } : undefined });
}

function emptyOperations(): EffectiveOrganizationOperations {
  return {
    organization: { update: false, archive: false, restore: false },
    member: { create: false, update: false, delete: false },
    invitation: { create: false, cancel: false, viewPending: false },
    team: { create: false, update: false, delete: false },
    roleDefinition: { read: false, create: false, update: false, delete: false },
    audit: { read: false },
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
      audit: { read: isOwner },
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
    audit: { read: roleAllows(statements, "audit", "read") },
  };
}

export async function loadOrganizationAccess(organizationId: string, userId: string) {
  const [organizationRow] = await db
    .select({ id: organization.id, archivedAt: organization.archivedAt })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);
  if (!organizationRow) fail("NOT_FOUND", "Organization not found.");

  const [membership] = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, organizationId), eq(member.userId, userId)))
    .limit(1);
  if (!membership) {
    fail(
      "FORBIDDEN",
      "You are not a member of this organization.",
      "ORGANIZATION_MEMBERSHIP_REQUIRED",
    );
  }

  const memberships = await db
    .select({ userId: member.userId, role: member.role })
    .from(member)
    .where(eq(member.organizationId, organizationId));
  const ownerState = resolveOrganizationOwner(memberships);
  if (ownerState.status !== "valid") {
    fail(
      "CONFLICT",
      "Organization ownership requires review before permission data is available.",
      "OWNER_STATE_INVALID",
    );
  }

  const isOwner = membership.role === "owner";
  if (organizationRow.archivedAt && !isOwner) {
    fail(
      "FORBIDDEN",
      "Only the organization owner may access archived organization status.",
      "OWNER_REQUIRED",
    );
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

export function accessContextOutput(access: Awaited<ReturnType<typeof loadOrganizationAccess>>) {
  return {
    organizationId: access.organizationId,
    role: access.role,
    isOwner: access.isOwner,
    status: access.archivedAt ? ("archived" as const) : ("active" as const),
    operations: access.operations,
  };
}
