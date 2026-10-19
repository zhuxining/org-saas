import { getCurrentAdapter } from "better-auth";
import type { BetterAuthPlugin } from "better-auth";
import {
  APIError,
  createAuthEndpoint,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
import { hasPermission, type OrganizationOptions } from "better-auth/plugins/organization";
import { z } from "zod";

import { auditedEndpointDefinitions, buildAuditSummary, createAuditRecord } from "./audit-records";
import { hasOrganizationOwnerRole, resolveOrganizationOwner } from "./organization-owner";
import {
  accountDeletionPaths,
  organizationMutationPaths,
  ownerMutationPaths,
} from "./organization-transaction";

const organizationPath = /^\/organization\//;
const roleAssignmentPaths = new Set([
  "/organization/add-member",
  "/organization/invite-member",
  "/organization/update-member-role",
]);
const requiredOperationPermissions: Record<string, Record<string, string[]>> = {
  "/organization/add-member": { member: ["create"] },
  "/organization/invite-member": { invitation: ["create"] },
  "/organization/remove-member": { member: ["delete"] },
  "/organization/update-member-role": { member: ["update"] },
  "/organization/update": { organization: ["update"] },
  "/organization/delete": { organization: ["delete"] },
  "/organization/create-team": { team: ["create"] },
  "/organization/update-team": { team: ["update"] },
  "/organization/remove-team": { team: ["delete"] },
  "/organization/add-team-member": { member: ["update"] },
  "/organization/remove-team-member": { member: ["delete"] },
  "/organization/create-role": { ac: ["create"] },
  "/organization/update-role": { ac: ["update"] },
  "/organization/delete-role": { ac: ["delete"] },
  "/organization/cancel-invitation": { invitation: ["cancel"] },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPathlessAddMemberContext(context: { path?: string; body?: unknown }): boolean {
  // Better Auth 1.7.7 exposes addMember only as auth.api.addMember and omits its endpoint path.
  const body = isRecord(context.body) ? context.body : {};
  return context.path === undefined && typeof body.userId === "string" && body.role !== undefined;
}

function roleNames(value: unknown): string[] {
  return typeof value === "string"
    ? value
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean)
    : [];
}

export function hasSingleRole(value: unknown): boolean {
  return (
    typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes(",")
  );
}

function rolePermissionEntries(permission: unknown): Array<[string, string]> {
  if (!isRecord(permission)) return [];
  return Object.entries(permission).flatMap(([resource, actions]) =>
    Array.isArray(actions)
      ? actions.flatMap((action) =>
          typeof action === "string" ? [[resource, action] as [string, string]] : [],
        )
      : [],
  );
}

function parsePermissions(value: unknown): Record<string, string[]> | null {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return null;
    }
  }
  if (!isRecord(parsed)) return null;
  const entries = Object.entries(parsed);
  if (
    entries.some(
      ([, actions]) =>
        !Array.isArray(actions) || actions.some((action) => typeof action !== "string"),
    )
  ) {
    return null;
  }
  return parsed as Record<string, string[]>;
}

function isOwnerRole(role: unknown): boolean {
  return hasOrganizationOwnerRole(role);
}

function forbidden(code: string, message: string): never {
  throw APIError.from("FORBIDDEN", { code, message });
}

function badRequest(code: string, message: string): never {
  throw APIError.from("BAD_REQUEST", { code, message });
}

async function canViewPendingInvitations(
  options: OrganizationOptions,
  context: Parameters<typeof hasPermission>[1],
  organizationId: string,
  role: string,
): Promise<boolean> {
  return (
    (await hasPermission(
      { options, organizationId, role, permissions: { invitation: ["create"] } },
      context,
    )) ||
    (await hasPermission(
      { options, organizationId, role, permissions: { invitation: ["cancel"] } },
      context,
    ))
  );
}

function createOwnershipTransferEndpoint(options: OrganizationOptions) {
  return createAuthEndpoint(
    "/organization/transfer-ownership",
    {
      method: "POST",
      requireHeaders: true,
      body: z.object({
        organizationId: z.string().min(1),
        newOwnerMemberId: z.string().min(1),
        formerOwnerRole: z.string().min(1),
      }),
    },
    async (ctx) => {
      const session = await getSessionFromCtx(ctx);
      if (!session) throw APIError.fromStatus("UNAUTHORIZED");
      if (!hasSingleRole(ctx.body.formerOwnerRole) || ctx.body.formerOwnerRole === "owner") {
        badRequest("NON_OWNER_ROLE_REQUIRED", "The former owner must receive one non-owner role.");
      }

      const adapter = await getCurrentAdapter(ctx.context.adapter);
      const organization = await adapter.findOne({
        model: "organization",
        where: [{ field: "id", value: ctx.body.organizationId }],
      });
      if (!isRecord(organization)) badRequest("ORGANIZATION_NOT_FOUND", "Organization not found.");
      const members = await adapter.findMany({
        model: "member",
        where: [{ field: "organizationId", value: ctx.body.organizationId }],
      });
      const ownerState = resolveOrganizationOwner(members.filter(isRecord));
      if (ownerState.status !== "valid") {
        badRequest(
          "OWNER_STATE_INVALID",
          "Ownership transfer requires exactly one current owner; review existing organization data.",
        );
      }
      const formerOwner = ownerState.owner;
      if (formerOwner.userId !== session.user.id) {
        forbidden("OWNER_REQUIRED", "Only the current owner may transfer ownership.");
      }
      const target = await adapter.findOne({
        model: "member",
        where: [
          { field: "id", value: ctx.body.newOwnerMemberId },
          { field: "organizationId", value: ctx.body.organizationId },
        ],
      });
      if (!isRecord(target) || target.id === formerOwner.id) {
        badRequest("TRANSFER_TARGET_INVALID", "The new owner must be another organization member.");
      }
      const roleExists = Object.hasOwn(options.roles ?? {}, ctx.body.formerOwnerRole)
        ? true
        : Boolean(
            await adapter.findOne({
              model: "organizationRole",
              where: [
                { field: "organizationId", value: ctx.body.organizationId },
                { field: "role", value: ctx.body.formerOwnerRole },
              ],
            }),
          );
      if (!roleExists) badRequest("ROLE_NOT_FOUND", "The former owner's role does not exist.");

      const demotedOwner = await adapter.update({
        model: "member",
        where: [
          { field: "id", value: formerOwner.id as string },
          { field: "organizationId", value: ctx.body.organizationId },
          { field: "role", value: "owner" },
        ],
        update: { role: ctx.body.formerOwnerRole },
      });
      if (!demotedOwner) badRequest("OWNER_CHANGED", "The current owner changed before transfer.");
      const promotedTarget = await adapter.update({
        model: "member",
        where: [
          { field: "id", value: target.id as string },
          { field: "organizationId", value: ctx.body.organizationId },
          { field: "role", value: target.role as string },
        ],
        update: { role: "owner" },
      });
      if (!promotedTarget) badRequest("TRANSFER_TARGET_CHANGED", "The transfer target changed.");
      return ctx.json({ formerOwner: demotedOwner, newOwner: promotedTarget });
    },
  );
}

function readAuditRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function stringField(record: Record<string, unknown> | null, field: string): string | undefined {
  const value = record?.[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function createOrganizationPolicyPlugin(
  options: OrganizationOptions,
  platformAdminRoles: readonly string[] = [],
) {
  return {
    id: "organization-policy",
    endpoints: { transferOrganizationOwnership: createOwnershipTransferEndpoint(options) },
    hooks: {
      before: [
        {
          matcher: ({ path }) => path === "/admin/revoke-user-session",
          handler: createAuthMiddleware(async (ctx) => {
            const body = isRecord(ctx.body) ? ctx.body : {};
            if (typeof body.token !== "string") return;
            const adapter = await getCurrentAdapter(ctx.context.adapter);
            const session = await adapter.findOne({
              model: "session",
              where: [{ field: "token", value: body.token }],
            });
            if (isRecord(session) && typeof session.userId === "string") {
              (ctx.context as unknown as Record<string, unknown>).auditTargetUserId =
                session.userId;
            }
          }),
        },
        {
          matcher: (context) =>
            (typeof context.path === "string" &&
              (organizationPath.test(context.path) || accountDeletionPaths.has(context.path))) ||
            isPathlessAddMemberContext(context),
          handler: createAuthMiddleware(async (ctx) => {
            const body = isRecord(ctx.body) ? ctx.body : {};
            const path =
              ctx.path === "/" && isPathlessAddMemberContext({ body })
                ? "/organization/add-member"
                : ctx.path;
            const query = isRecord(ctx.query) ? ctx.query : {};
            const input = { ...query, ...body };
            if (roleAssignmentPaths.has(path) && !hasSingleRole(body.role)) {
              badRequest("SINGLE_ROLE_REQUIRED", "Exactly one organization role is required.");
            }

            const session = await getSessionFromCtx(ctx).catch(() => null);
            const adapter = await getCurrentAdapter(ctx.context.adapter);
            if (accountDeletionPaths.has(path ?? "")) {
              if (!session) throw APIError.fromStatus("UNAUTHORIZED");
              if (
                path === "/admin/remove-user" &&
                !platformAdminRoles.some((role) => roleNames(session.user.role).includes(role))
              ) {
                forbidden("PLATFORM_ADMIN_REQUIRED", "Platform administrator access is required.");
              }
              const targetUserId =
                path === "/admin/remove-user"
                  ? typeof body.userId === "string"
                    ? body.userId
                    : undefined
                  : session?.user.id;
              if (!targetUserId) {
                forbidden(
                  "ACCOUNT_DELETION_TARGET_REQUIRED",
                  "The account deletion target cannot be verified safely.",
                );
              }
              const memberships = await adapter.findMany({
                model: "member",
                where: [{ field: "userId", value: targetUserId }],
              });
              const organizationIds = [
                ...new Set(
                  memberships.flatMap((member) =>
                    isRecord(member) && typeof member.organizationId === "string"
                      ? [member.organizationId]
                      : [],
                  ),
                ),
              ].sort();
              for (const organizationId of organizationIds) {
                const locked = await adapter.incrementOne({
                  model: "organization",
                  where: [{ field: "id", value: organizationId }],
                  increment: { ownerMutationVersion: 1 },
                });
                if (!locked) badRequest("ORGANIZATION_NOT_FOUND", "Organization not found.");
                const membershipsForOrganization = (
                  await adapter.findMany({
                    model: "member",
                    where: [{ field: "organizationId", value: organizationId }],
                  })
                ).filter(isRecord);
                if (resolveOrganizationOwner(membershipsForOrganization).status !== "valid") {
                  badRequest(
                    "OWNER_STATE_INVALID",
                    "Account changes require exactly one owner in every organization; review existing organization data.",
                  );
                }
              }
              const currentMemberships = await adapter.findMany({
                model: "member",
                where: [{ field: "userId", value: targetUserId }],
              });
              const ownedOrganizationIds = currentMemberships
                .filter((member) => isRecord(member) && isOwnerRole(member.role))
                .flatMap((member) =>
                  isRecord(member) && typeof member.organizationId === "string"
                    ? [member.organizationId]
                    : [],
                );
              if (ownedOrganizationIds.length > 0) {
                forbidden(
                  "OWNER_TRANSFER_REQUIRED",
                  "Transfer ownership before deleting an owner account.",
                );
              }
              return;
            }
            const explicitId =
              path === "/organization/get-invitation"
                ? undefined
                : [input.organizationId, input.id].find(
                    (value): value is string => typeof value === "string",
                  );
            let organizationId = explicitId;
            let organization = explicitId
              ? await adapter.findOne({
                  model: "organization",
                  where: [{ field: "id", value: explicitId }],
                })
              : null;
            if (path === "/organization/get-invitation" && typeof input.id === "string") {
              const invitation = await adapter.findOne({
                model: "invitation",
                where: [{ field: "id", value: input.id }],
              });
              if (isRecord(invitation) && typeof invitation.organizationId === "string") {
                organizationId = invitation.organizationId;
                organization = await adapter.findOne({
                  model: "organization",
                  where: [{ field: "id", value: invitation.organizationId }],
                });
              }
            }
            const slug = [input.organizationSlug, input.slug].find(
              (value): value is string => typeof value === "string",
            );
            if (slug) {
              const organizationFromSlug = await adapter.findOne({
                model: "organization",
                where: [{ field: "slug", value: slug }],
              });
              if (isRecord(organizationFromSlug) && typeof organizationFromSlug.id === "string") {
                if (organizationId && organizationId !== organizationFromSlug.id) {
                  forbidden(
                    "ORGANIZATION_REFERENCE_MISMATCH",
                    "The organization ID and slug must identify the same organization.",
                  );
                }
                organizationId ??= organizationFromSlug.id;
                organization ??= organizationFromSlug;
              }
            }

            const nested = isRecord(body.data) ? body.data : {};
            const findMemberReference = async (reference: string, scope?: string) => {
              const where = scope
                ? [
                    { field: "organizationId", value: scope },
                    { field: "id", value: reference },
                  ]
                : [{ field: "id", value: reference }];
              const byId = await adapter.findOne({ model: "member", where });
              if (byId) return byId;
              const user = await adapter.findOne({
                model: "user",
                where: [{ field: "email", value: reference }],
              });
              if (!isRecord(user) || typeof user.id !== "string") return null;
              const memberWhere = scope
                ? [
                    { field: "organizationId", value: scope },
                    { field: "userId", value: user.id },
                  ]
                : [{ field: "userId", value: user.id }];
              return adapter.findOne({ model: "member", where: memberWhere });
            };
            const memberReference = input.memberIdOrEmail ?? nested.memberIdOrEmail;
            if (typeof memberReference === "string") {
              const record = await findMemberReference(
                memberReference,
                organizationId ?? session?.session.activeOrganizationId ?? undefined,
              );
              if (isRecord(record) && typeof record.organizationId === "string") {
                if (organizationId && organizationId !== record.organizationId) {
                  forbidden(
                    "ORGANIZATION_REFERENCE_MISMATCH",
                    "The resource does not belong to this organization.",
                  );
                }
                organizationId ??= record.organizationId;
                if (!organization) {
                  organization = await adapter.findOne({
                    model: "organization",
                    where: [{ field: "id", value: record.organizationId }],
                  });
                }
              }
            }
            const referenceFields: Array<[string, string]> = [
              ["invitationId", "invitation"],
              ["memberId", "member"],
              ["teamId", "team"],
              ["roleId", "organizationRole"],
            ];
            for (const [field, model] of referenceFields) {
              const value = input[field] ?? nested[field];
              for (const id of Array.isArray(value) ? value : [value]) {
                if (typeof id !== "string") continue;
                const record = await adapter.findOne({
                  model,
                  where: [{ field: "id", value: id }],
                });
                if (!isRecord(record) || typeof record.organizationId !== "string") continue;
                if (organizationId && organizationId !== record.organizationId) {
                  forbidden(
                    "ORGANIZATION_REFERENCE_MISMATCH",
                    "The resource does not belong to this organization.",
                  );
                }
                organizationId ??= record.organizationId;
                if (!organization) {
                  organization = await adapter.findOne({
                    model: "organization",
                    where: [{ field: "id", value: record.organizationId }],
                  });
                }
              }
            }

            const isOrganizationCreation = path === "/organization/create";
            const isOrganizationList = path === "/organization/list";
            const isDeactivation =
              path === "/organization/set-active" &&
              body.organizationId === null &&
              body.organizationSlug === undefined;
            if (!isOrganizationCreation && !isDeactivation && !isOrganizationList) {
              organizationId ??= session?.session.activeOrganizationId ?? undefined;
            }
            if (!organization && organizationId) {
              organization = await adapter.findOne({
                model: "organization",
                where: [{ field: "id", value: organizationId }],
              });
            }
            // Serialize all organization writes with archive and recovery state changes.
            if (organizationMutationPaths.has(path ?? "") && organizationId) {
              const locked = await adapter.incrementOne({
                model: "organization",
                where: [{ field: "id", value: organizationId }],
                increment: { ownerMutationVersion: 1 },
              });
              if (!locked) badRequest("ORGANIZATION_NOT_FOUND", "Organization not found.");
              organization = locked;
              if (ownerMutationPaths.has(path ?? "")) {
                const membershipsForOrganization = (
                  await adapter.findMany({
                    model: "member",
                    where: [{ field: "organizationId", value: organizationId }],
                  })
                ).filter(isRecord);
                if (resolveOrganizationOwner(membershipsForOrganization).status !== "valid") {
                  badRequest(
                    "OWNER_STATE_INVALID",
                    "Organization membership changes require exactly one owner; review existing organization data.",
                  );
                }
              }
            }
            if (isRecord(organization) && organization.archivedAt) {
              forbidden("ORGANIZATION_ARCHIVED", "This organization is archived.");
            }
            const operationPermission = requiredOperationPermissions[path];
            if (operationPermission && !session?.user.id) {
              throw APIError.fromStatus("UNAUTHORIZED");
            }
            if (!organizationId || !session?.user.id) return;

            const actor = await adapter.findOne({
              model: "member",
              where: [
                { field: "organizationId", value: organizationId },
                { field: "userId", value: session.user.id },
              ],
            });
            if (!isRecord(actor) || typeof actor.role !== "string") {
              if (
                path === "/organization/accept-invitation" &&
                typeof body.invitationId === "string"
              ) {
                const invite = await adapter.findOne({
                  model: "invitation",
                  where: [{ field: "id", value: body.invitationId }],
                });
                if (
                  isRecord(invite) &&
                  invite.status === "pending" &&
                  typeof invite.organizationId === "string" &&
                  typeof invite.inviterId === "string" &&
                  typeof invite.role === "string"
                ) {
                  if (isOwnerRole(invite.role)) {
                    forbidden(
                      "OWNER_TRANSFER_REQUIRED",
                      "Ownership can only change through an explicit transfer.",
                    );
                  }
                  const inviter = await adapter.findOne({
                    model: "member",
                    where: [
                      { field: "organizationId", value: invite.organizationId },
                      { field: "userId", value: invite.inviterId },
                    ],
                  });
                  if (!isRecord(inviter) || typeof inviter.role !== "string") {
                    forbidden(
                      "INVITATION_GRANTER_NO_LONGER_MEMBER",
                      "The invitation sender is no longer a member of this organization.",
                    );
                  }
                  const assignedRole = Object.hasOwn(options.roles ?? {}, invite.role)
                    ? options.roles?.[
                        invite.role as keyof NonNullable<OrganizationOptions["roles"]>
                      ]?.statements
                    : parsePermissions(
                        (
                          (await adapter.findOne({
                            model: "organizationRole",
                            where: [
                              { field: "organizationId", value: invite.organizationId },
                              { field: "role", value: invite.role },
                            ],
                          })) as Record<string, unknown> | null
                        )?.permission,
                      );
                  if (!assignedRole) {
                    forbidden(
                      "INVITATION_ROLE_UNAVAILABLE",
                      "The invited organization role is no longer available.",
                    );
                  }
                  for (const [resource, action] of rolePermissionEntries(assignedRole)) {
                    const inviterCanGrant = await hasPermission(
                      {
                        options,
                        organizationId: invite.organizationId,
                        role: inviter.role,
                        permissions: { [resource]: [action] },
                      },
                      ctx,
                    );
                    if (!inviterCanGrant) {
                      forbidden(
                        "INVITATION_GRANT_EXCEEDS_SENDER",
                        "The invitation sender no longer has permission to grant this role.",
                      );
                    }
                  }
                  const adminPermissions = options.roles?.admin?.statements;
                  const assignedRoleIsAdmin =
                    !!adminPermissions &&
                    Object.keys(adminPermissions).length > 0 &&
                    (await hasPermission(
                      {
                        options,
                        organizationId: invite.organizationId,
                        role: invite.role,
                        permissions: adminPermissions,
                      },
                      ctx,
                    ));
                  if (assignedRoleIsAdmin && !isOwnerRole(inviter.role)) {
                    forbidden(
                      "INVITATION_ADMIN_ROLE_OWNER_REQUIRED",
                      "Only an organization owner may invite an administrator role.",
                    );
                  }
                }
              }
              if (operationPermission) {
                forbidden(
                  "ORGANIZATION_MEMBERSHIP_REQUIRED",
                  "You must be a member of this organization.",
                );
              }
              return;
            }

            const actorIsOwner = isOwnerRole(actor.role);
            if (operationPermission) {
              const allowed = await hasPermission(
                {
                  options,
                  organizationId,
                  role: actor.role,
                  permissions: operationPermission,
                },
                ctx,
              );
              if (!allowed) {
                forbidden(
                  "ORGANIZATION_OPERATION_FORBIDDEN",
                  "You are not allowed to perform this organization operation.",
                );
              }
            }
            const isAdminEquivalent = async (role: string): Promise<boolean> => {
              const adminPermissions = options.roles?.admin?.statements;
              if (!adminPermissions || !Object.keys(adminPermissions).length) return false;
              return hasPermission(
                {
                  options,
                  organizationId: organizationId as string,
                  role,
                  permissions: adminPermissions,
                },
                ctx,
              );
            };
            const targetRole = async (role: string): Promise<Record<string, unknown> | null> => {
              const staticRoles = options.roles ?? {};
              if (Object.hasOwn(staticRoles, role)) return null;
              const record = await adapter.findOne({
                model: "organizationRole",
                where: [
                  { field: "organizationId", value: organizationId as string },
                  { field: "role", value: role },
                ],
              });
              return isRecord(record) ? record : null;
            };
            const ensureGrantBoundary = async (role: string): Promise<void> => {
              if (!Object.hasOwn(options.roles ?? {}, role)) {
                const dynamicRole = await targetRole(role);
                if (!dynamicRole)
                  badRequest("ROLE_NOT_FOUND", "The requested organization role does not exist.");
              }
              const dynamicRole = await targetRole(role);
              const permissions = Object.hasOwn(options.roles ?? {}, role)
                ? options.roles?.[role as keyof NonNullable<OrganizationOptions["roles"]>]
                    ?.statements
                : parsePermissions(dynamicRole?.permission);
              if (!permissions)
                badRequest(
                  "ROLE_PERMISSIONS_INVALID",
                  "The requested role has invalid permissions.",
                );
              for (const [resource, action] of rolePermissionEntries(permissions)) {
                const allowed = await hasPermission(
                  {
                    options,
                    organizationId: organizationId as string,
                    role: actor.role as string,
                    permissions: { [resource]: [action] },
                  },
                  ctx,
                );
                if (!allowed)
                  forbidden(
                    "ROLE_GRANT_EXCEEDS_ACTOR",
                    "You cannot grant permissions you do not hold.",
                  );
              }
              const adminEquivalent = await isAdminEquivalent(role);
              if ((role === "owner" || adminEquivalent) && !actorIsOwner) {
                forbidden(
                  "PROTECTED_ROLE_ASSIGNMENT",
                  "Only an owner may assign owner or admin-equivalent roles.",
                );
              }
            };

            if (roleAssignmentPaths.has(path)) {
              if (roleNames(body.role).includes("owner")) {
                forbidden(
                  "OWNER_TRANSFER_REQUIRED",
                  "Ownership can only change through an explicit transfer.",
                );
              }
              await ensureGrantBoundary(body.role as string);
            }

            if (path === "/organization/accept-invitation") {
              const invitationId = body.invitationId;
              if (typeof invitationId === "string") {
                const invitation = await adapter.findOne({
                  model: "invitation",
                  where: [{ field: "id", value: invitationId }],
                });
                if (isRecord(invitation) && roleNames(invitation.role).includes("owner")) {
                  forbidden(
                    "OWNER_TRANSFER_REQUIRED",
                    "Ownership can only change through an explicit transfer.",
                  );
                }
              }
            }

            if (path === "/organization/leave") {
              const currentMember = await adapter.findOne({
                model: "member",
                where: [
                  { field: "organizationId", value: organizationId },
                  { field: "userId", value: session?.user.id },
                ],
              });
              if (isRecord(currentMember) && isOwnerRole(currentMember.role)) {
                forbidden(
                  "OWNER_TRANSFER_REQUIRED",
                  "Transfer ownership before leaving the organization.",
                );
              }
            }

            if (
              path === "/organization/remove-member" ||
              path === "/organization/update-member-role"
            ) {
              const memberId =
                typeof body.memberId === "string"
                  ? body.memberId
                  : typeof body.memberIdOrEmail === "string"
                    ? body.memberIdOrEmail
                    : undefined;
              const target = memberId ? await findMemberReference(memberId, organizationId) : null;
              if (isRecord(target) && typeof target.role === "string") {
                const targetIsAdminEquivalent = await isAdminEquivalent(target.role);
                const targetIsOwner = isOwnerRole(target.role);
                const targetIsSelf = target.userId === session.user.id;
                const assigningOwner =
                  path === "/organization/update-member-role" &&
                  roleNames(body.role).includes("owner");
                if (targetIsOwner || assigningOwner) {
                  forbidden(
                    "OWNER_TRANSFER_REQUIRED",
                    path === "/organization/remove-member"
                      ? "Transfer ownership before removing the owner."
                      : "Ownership can only change through an explicit transfer.",
                  );
                }
                if (!actorIsOwner && (targetIsAdminEquivalent || targetIsSelf)) {
                  forbidden(
                    "PROTECTED_MEMBER_ROLE",
                    "Only an owner may change or remove this member.",
                  );
                }
                if (!actorIsOwner) {
                  const staticPermissions =
                    options.roles?.[target.role as keyof NonNullable<OrganizationOptions["roles"]>]
                      ?.statements;
                  const dynamicPermissions = staticPermissions
                    ? null
                    : await targetRole(target.role);
                  const permissions =
                    staticPermissions ?? parsePermissions(dynamicPermissions?.permission);
                  if (!permissions) {
                    forbidden(
                      "TARGET_ROLE_PERMISSIONS_INVALID",
                      "The target member's role permissions cannot be verified safely.",
                    );
                  }
                  for (const [resource, action] of rolePermissionEntries(permissions)) {
                    const actorCanGrantPermission = await hasPermission(
                      {
                        options,
                        organizationId,
                        role: actor.role,
                        permissions: { [resource]: [action] },
                      },
                      ctx,
                    );
                    if (!actorCanGrantPermission) {
                      forbidden(
                        "TARGET_ROLE_EXCEEDS_ACTOR",
                        "You cannot change or remove a member whose role exceeds your permissions.",
                      );
                    }
                  }
                }
              }
            }

            if (path === "/organization/create-role" || path === "/organization/update-role") {
              const data = isRecord(body.data) ? body.data : {};
              const roleName =
                typeof body.role === "string"
                  ? body.role
                  : typeof body.roleName === "string"
                    ? body.roleName
                    : typeof data.roleName === "string"
                      ? data.roleName
                      : undefined;
              let existingRole: Record<string, unknown> | null = null;
              if (path === "/organization/update-role") {
                const roleId = typeof body.roleId === "string" ? body.roleId : undefined;
                existingRole = roleId
                  ? await adapter.findOne({
                      model: "organizationRole",
                      where: [
                        { field: "id", value: roleId },
                        { field: "organizationId", value: organizationId },
                      ],
                    })
                  : typeof body.roleName === "string"
                    ? await adapter.findOne({
                        model: "organizationRole",
                        where: [
                          { field: "role", value: body.roleName },
                          { field: "organizationId", value: organizationId },
                        ],
                      })
                    : null;
              }
              const existingName =
                isRecord(existingRole) && typeof existingRole.role === "string"
                  ? existingRole.role
                  : undefined;
              const existingIsAdminEquivalent = existingName
                ? await isAdminEquivalent(existingName)
                : false;
              const resultingPermissions = parsePermissions(data.permission ?? body.permission);
              const resultingIsAdminEquivalent = resultingPermissions
                ? rolePermissionEntries(options.roles?.admin?.statements ?? {}).every(
                    ([resource, action]) => (resultingPermissions[resource] ?? []).includes(action),
                  )
                : false;
              if (
                !actorIsOwner &&
                (existingIsAdminEquivalent ||
                  resultingIsAdminEquivalent ||
                  roleName === "owner" ||
                  roleName === "admin")
              ) {
                forbidden(
                  "PROTECTED_ROLE_DEFINITION",
                  "Only an owner may create or change admin-equivalent role definitions.",
                );
              }
            }

            if (path === "/organization/delete-role") {
              const role = body.roleId
                ? await adapter.findOne({
                    model: "organizationRole",
                    where: [
                      { field: "id", value: body.roleId as string },
                      { field: "organizationId", value: organizationId },
                    ],
                  })
                : typeof body.roleName === "string"
                  ? await adapter.findOne({
                      model: "organizationRole",
                      where: [
                        { field: "role", value: body.roleName },
                        { field: "organizationId", value: organizationId },
                      ],
                    })
                  : null;
              if (isRecord(role) && typeof role.role === "string") {
                if (!actorIsOwner && (await isAdminEquivalent(role.role))) {
                  forbidden(
                    "PROTECTED_ROLE_DEFINITION",
                    "Only an owner may delete an admin-equivalent role.",
                  );
                }
                const members = await adapter.findMany({
                  model: "member",
                  where: [{ field: "organizationId", value: organizationId }],
                });
                if (
                  members.some(
                    (member) =>
                      isRecord(member) &&
                      typeof member.role === "string" &&
                      roleNames(member.role).includes(role.role as string),
                  )
                ) {
                  badRequest(
                    "ROLE_ASSIGNED_TO_MEMBER",
                    "A role assigned to an organization member cannot be deleted.",
                  );
                }
                const pending = await adapter.findMany({
                  model: "invitation",
                  where: [
                    { field: "organizationId", value: organizationId },
                    { field: "status", value: "pending" },
                  ],
                });
                if (
                  pending.some(
                    (invite) =>
                      isRecord(invite) &&
                      typeof invite.role === "string" &&
                      roleNames(invite.role).includes(role.role as string),
                  )
                ) {
                  badRequest(
                    "ROLE_ASSIGNED_TO_PENDING_INVITATION",
                    "A role assigned to a pending invitation cannot be deleted.",
                  );
                }
              }
            }
          }),
        },
      ],
      after: [
        {
          matcher: ({ path, body }) => {
            if (typeof path === "string" && Object.hasOwn(auditedEndpointDefinitions, path))
              return true;
            const data = isRecord(body) ? body : {};
            return (
              (path === undefined || path === "/") &&
              typeof data.userId === "string" &&
              data.role !== undefined
            );
          },
          handler: createAuthMiddleware(async (ctx) => {
            const body = isRecord(ctx.body) ? ctx.body : {};
            const path =
              (ctx.path === "/" || ctx.path === undefined) &&
              typeof body.userId === "string" &&
              body.role !== undefined
                ? "/organization/add-member"
                : typeof ctx.path === "string"
                  ? ctx.path
                  : "";
            const definition = auditedEndpointDefinitions[path];
            if (!definition) return;
            const session = await getSessionFromCtx(ctx).catch(() => null);
            if (!session) return;
            const adapter = await getCurrentAdapter(ctx.context.adapter);
            let result: unknown = ctx.context.returned;
            if (result instanceof Response) {
              if (!result.ok) return;
              try {
                result = await result.clone().json();
              } catch {
                result = null;
              }
            }
            const output = readAuditRecord(result);
            const returnedMember = readAuditRecord(output?.member);
            const returnedInvitation = readAuditRecord(output?.invitation);
            const organizationId =
              (path === "/organization/create" ? stringField(output, "id") : undefined) ??
              stringField(body, "organizationId") ??
              stringField(readAuditRecord(body.data), "organizationId") ??
              stringField(output, "organizationId") ??
              (definition.scope === "organization"
                ? session.session.activeOrganizationId
                : undefined);
            let targetId: string | undefined;
            if (definition.scope === "platform") {
              targetId =
                stringField(body, "userId") ??
                stringField(ctx.context as unknown as Record<string, unknown>, "auditTargetUserId");
            } else {
              switch (path) {
                case "/organization/create":
                case "/organization/invite-member":
                case "/organization/create-team":
                case "/organization/create-role":
                  targetId = stringField(output, "id");
                  break;
                case "/organization/update":
                  targetId = organizationId;
                  break;
                case "/organization/transfer-ownership":
                  targetId = stringField(body, "newOwnerMemberId");
                  break;
                case "/organization/add-member":
                case "/organization/add-team-member":
                case "/organization/remove-team-member":
                  targetId = stringField(body, "userId");
                  break;
                case "/organization/accept-invitation":
                case "/organization/cancel-invitation":
                case "/organization/reject-invitation":
                  targetId = stringField(body, "invitationId");
                  break;
                case "/organization/remove-member":
                  targetId =
                    stringField(returnedMember, "id") ??
                    stringField(body, "memberId") ??
                    stringField(body, "memberIdOrEmail");
                  break;
                case "/organization/leave":
                  targetId = session.user.id;
                  break;
                case "/organization/update-member-role":
                  targetId = stringField(body, "memberId");
                  break;
                case "/organization/update-team":
                case "/organization/remove-team":
                  targetId = stringField(body, "teamId");
                  break;
                case "/organization/update-role":
                case "/organization/delete-role":
                  targetId = stringField(body, "roleId") ?? stringField(body, "roleName");
                  break;
              }
            }
            if (targetId?.includes("@")) targetId = undefined;
            let resolvedOrganizationId = organizationId;
            const invitationId =
              stringField(body, "invitationId") ??
              (path === "/organization/invite-member" ? stringField(output, "id") : undefined);
            if (definition.scope === "organization" && invitationId) {
              const invitation = await adapter.findOne({
                model: "invitation",
                where: [{ field: "id", value: invitationId }],
              });
              const invitationOrganizationId = stringField(
                readAuditRecord(invitation),
                "organizationId",
              );
              if (invitationOrganizationId) resolvedOrganizationId = invitationOrganizationId;
            }
            if (definition.scope === "organization" && !resolvedOrganizationId) return;

            const changedData =
              path === "/organization/update"
                ? body
                : path === "/organization/update-team" || path === "/organization/update-role"
                  ? body.data
                  : undefined;
            const summary = buildAuditSummary(definition.action, {
              role:
                stringField(body, "role") ??
                stringField(body, "formerOwnerRole") ??
                stringField(returnedInvitation, "role"),
              formerOwnerRole: stringField(body, "formerOwnerRole"),
              changedData,
            });

            await adapter.create({
              model: "auditLog",
              data: createAuditRecord({
                scope: definition.scope,
                organizationId: definition.scope === "organization" ? resolvedOrganizationId : null,
                actorId: session.user.id,
                actorName: session.user.name,
                action: definition.action,
                targetType: definition.targetType,
                targetId,
                summary,
              }),
            });
          }),
        },
        {
          matcher: ({ path }) => path === "/organization/get-full-organization",
          handler: createAuthMiddleware(async (ctx) => {
            const returned = ctx.context.returned;
            let organizationResult: unknown = returned;
            if (returned instanceof Response) {
              try {
                organizationResult = await returned.clone().json();
              } catch {
                return;
              }
            }
            if (!isRecord(organizationResult) || !Array.isArray(organizationResult.invitations)) {
              return;
            }

            const session = await getSessionFromCtx(ctx).catch(() => null);
            if (!session || typeof organizationResult.id !== "string") return;
            const adapter = await getCurrentAdapter(ctx.context.adapter);
            const membership = await adapter.findOne({
              model: "member",
              where: [
                { field: "organizationId", value: organizationResult.id },
                { field: "userId", value: session.user.id },
              ],
            });
            if (!isRecord(membership) || typeof membership.role !== "string") return;

            const canViewInvitations = await canViewPendingInvitations(
              options,
              ctx,
              organizationResult.id,
              membership.role,
            );
            if (canViewInvitations) return;

            const safeOrganization = { ...organizationResult, invitations: [] };
            if (returned instanceof Response) {
              const headers = new Headers(returned.headers);
              headers.delete("content-length");
              ctx.context.returned = new Response(JSON.stringify(safeOrganization), {
                status: returned.status,
                statusText: returned.statusText,
                headers,
              });
            } else {
              ctx.context.returned = safeOrganization;
            }
          }),
        },
        {
          matcher: ({ path }) => path === "/organization/list-invitations",
          handler: createAuthMiddleware(async (ctx) => {
            const returned = ctx.context.returned;
            let invitations: unknown = returned;
            if (returned instanceof Response) {
              try {
                invitations = await returned.clone().json();
              } catch {
                return;
              }
            }
            if (!Array.isArray(invitations)) return;

            const session = await getSessionFromCtx(ctx).catch(() => null);
            const query = isRecord(ctx.query) ? ctx.query : {};
            const organizationId =
              (typeof query.organizationId === "string" && query.organizationId) ||
              session?.session.activeOrganizationId;
            if (!session || !organizationId) return;
            const adapter = await getCurrentAdapter(ctx.context.adapter);
            const membership = await adapter.findOne({
              model: "member",
              where: [
                { field: "organizationId", value: organizationId },
                { field: "userId", value: session.user.id },
              ],
            });
            if (!isRecord(membership) || typeof membership.role !== "string") return;
            if (await canViewPendingInvitations(options, ctx, organizationId, membership.role))
              return;
            if (returned instanceof Response) {
              const headers = new Headers(returned.headers);
              headers.delete("content-length");
              ctx.context.returned = new Response(JSON.stringify([]), {
                status: returned.status,
                statusText: returned.statusText,
                headers,
              });
            } else {
              ctx.context.returned = [];
            }
          }),
        },
        {
          matcher: ({ path }) =>
            path === "/organization/remove-member" || path === "/organization/leave",
          handler: createAuthMiddleware(async (ctx) => {
            const body = isRecord(ctx.body) ? ctx.body : {};
            let result: unknown = ctx.context.returned;
            if (result instanceof Response) {
              try {
                result = await result.clone().json();
              } catch {
                result = null;
              }
            }
            const member = isRecord(result) && isRecord(result.member) ? result.member : result;
            const session = await getSessionFromCtx(ctx).catch(() => null);
            const userId =
              ctx.path === "/organization/leave"
                ? session?.user.id
                : isRecord(member) && typeof member.userId === "string"
                  ? member.userId
                  : undefined;
            const organizationId =
              typeof body.organizationId === "string"
                ? body.organizationId
                : isRecord(member) && typeof member.organizationId === "string"
                  ? member.organizationId
                  : session?.session.activeOrganizationId;
            if (!userId || !organizationId) return;
            const adapter = await getCurrentAdapter(ctx.context.adapter);
            const teams = await adapter.findMany({
              model: "team",
              where: [{ field: "organizationId", value: organizationId }],
            });
            const teamIds = teams.flatMap((team) =>
              isRecord(team) && typeof team.id === "string" ? [team.id] : [],
            );
            if (!teamIds.length) return;
            await adapter.deleteMany({
              model: "teamMember",
              where: [
                { field: "userId", value: userId },
                { field: "teamId", value: teamIds, operator: "in" },
              ],
            });
          }),
        },
      ],
    },
  } satisfies BetterAuthPlugin;
}
