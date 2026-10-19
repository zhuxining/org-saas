export type AuditScope = "organization" | "platform";
export type AuditSummary = Record<string, string | string[]>;

export const auditEvents = {
  organizationCreated: {
    action: "organization.created",
    scope: "organization",
    targetType: "organization",
  },
  organizationUpdated: {
    action: "organization.updated",
    scope: "organization",
    targetType: "organization",
  },
  ownershipTransferred: {
    action: "organization.ownership_transferred",
    scope: "organization",
    targetType: "member",
  },
  organizationArchived: {
    action: "organization.archived",
    scope: "organization",
    targetType: "organization",
  },
  organizationRestored: {
    action: "organization.restored",
    scope: "organization",
    targetType: "organization",
  },
  memberAdded: { action: "member.added", scope: "organization", targetType: "member" },
  memberRemoved: { action: "member.removed", scope: "organization", targetType: "member" },
  memberLeft: { action: "member.left", scope: "organization", targetType: "member" },
  memberRoleChanged: {
    action: "member.role_changed",
    scope: "organization",
    targetType: "member",
  },
  invitationSent: {
    action: "invitation.sent",
    scope: "organization",
    targetType: "invitation",
  },
  invitationAccepted: {
    action: "invitation.accepted",
    scope: "organization",
    targetType: "invitation",
  },
  invitationCanceled: {
    action: "invitation.canceled",
    scope: "organization",
    targetType: "invitation",
  },
  invitationRejected: {
    action: "invitation.rejected",
    scope: "organization",
    targetType: "invitation",
  },
  teamCreated: { action: "team.created", scope: "organization", targetType: "team" },
  teamUpdated: { action: "team.updated", scope: "organization", targetType: "team" },
  teamDeleted: { action: "team.deleted", scope: "organization", targetType: "team" },
  teamMemberAdded: {
    action: "team.member_added",
    scope: "organization",
    targetType: "member",
  },
  teamMemberRemoved: {
    action: "team.member_removed",
    scope: "organization",
    targetType: "member",
  },
  roleCreated: { action: "role.created", scope: "organization", targetType: "role" },
  roleUpdated: { action: "role.updated", scope: "organization", targetType: "role" },
  roleDeleted: { action: "role.deleted", scope: "organization", targetType: "role" },
  userBanned: { action: "user.banned", scope: "platform", targetType: "user" },
  userUnbanned: { action: "user.unbanned", scope: "platform", targetType: "user" },
  sessionRevoked: { action: "session.revoked", scope: "platform", targetType: "user" },
  sessionsRevoked: { action: "session.revoked_all", scope: "platform", targetType: "user" },
} as const;

export type AuditEventDefinition = (typeof auditEvents)[keyof typeof auditEvents];

export const auditedEndpointDefinitions: Record<string, AuditEventDefinition> = {
  "/organization/create": auditEvents.organizationCreated,
  "/organization/update": auditEvents.organizationUpdated,
  "/organization/transfer-ownership": auditEvents.ownershipTransferred,
  "/organization/add-member": auditEvents.memberAdded,
  "/organization/invite-member": auditEvents.invitationSent,
  "/organization/accept-invitation": auditEvents.invitationAccepted,
  "/organization/cancel-invitation": auditEvents.invitationCanceled,
  "/organization/reject-invitation": auditEvents.invitationRejected,
  "/organization/remove-member": auditEvents.memberRemoved,
  "/organization/leave": auditEvents.memberLeft,
  "/organization/update-member-role": auditEvents.memberRoleChanged,
  "/organization/create-team": auditEvents.teamCreated,
  "/organization/update-team": auditEvents.teamUpdated,
  "/organization/remove-team": auditEvents.teamDeleted,
  "/organization/add-team-member": auditEvents.teamMemberAdded,
  "/organization/remove-team-member": auditEvents.teamMemberRemoved,
  "/organization/create-role": auditEvents.roleCreated,
  "/organization/update-role": auditEvents.roleUpdated,
  "/organization/delete-role": auditEvents.roleDeleted,
  "/admin/ban-user": auditEvents.userBanned,
  "/admin/unban-user": auditEvents.userUnbanned,
  "/admin/revoke-user-session": auditEvents.sessionRevoked,
  "/admin/revoke-user-sessions": auditEvents.sessionsRevoked,
};

const changedFieldsByAction: Partial<Record<AuditEventDefinition["action"], readonly string[]>> = {
  "organization.updated": ["name", "slug", "logo"],
  "team.updated": ["name"],
  "role.updated": ["roleName", "permission"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function buildAuditSummary(
  action: string,
  input: { role?: string; formerOwnerRole?: string; changedData?: unknown } = {},
): AuditSummary {
  const summary: AuditSummary = {};
  if (input.role) summary.role = input.role;
  if (action === auditEvents.ownershipTransferred.action && input.formerOwnerRole) {
    summary.formerOwnerRole = input.formerOwnerRole;
  }

  const allowedFields = changedFieldsByAction[action as keyof typeof changedFieldsByAction];
  const changedData = input.changedData;
  if (allowedFields && isRecord(changedData)) {
    const changedFields = allowedFields.filter((field) => Object.hasOwn(changedData, field));
    if (changedFields.length > 0) summary.changedFields = changedFields;
  }
  return summary;
}

export function createAuditRecord(input: {
  scope: AuditScope;
  organizationId?: string | null;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary?: AuditSummary;
}) {
  if (input.scope === "organization" && !input.organizationId) {
    throw new Error("Organization audit records require an organization ID.");
  }

  const targetId = input.targetId?.includes("@") ? null : (input.targetId ?? null);
  return {
    id: crypto.randomUUID(),
    scope: input.scope,
    organizationId: input.scope === "organization" ? input.organizationId! : null,
    actorId: input.actorId,
    actorName: input.actorName,
    action: input.action,
    targetType: input.targetType,
    targetId,
    summary: input.summary ?? {},
  };
}
