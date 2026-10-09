import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";

const organizationPath = /^\/organization\//;
const roleAssignmentPaths = new Set([
  "/organization/add-member",
  "/organization/invite-member",
  "/organization/update-member-role",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasSingleRole(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0 && !value.includes(",");
}

export const organizationPolicyPlugin: BetterAuthPlugin = {
  id: "organization-policy",
  hooks: {
    before: [
      {
        matcher: ({ path }) => typeof path === "string" && organizationPath.test(path),
        handler: createAuthMiddleware(async (ctx) => {
          const body = isRecord(ctx.body) ? ctx.body : {};
          const query = isRecord(ctx.query) ? ctx.query : {};
          const input = { ...query, ...body };
          if (roleAssignmentPaths.has(ctx.path ?? "") && !hasSingleRole(body.role)) {
            throw APIError.from("BAD_REQUEST", {
              code: "SINGLE_ROLE_REQUIRED",
              message: "Exactly one organization role is required.",
            });
          }

          const session = await getSessionFromCtx(ctx).catch(() => null);
          const adapter = ctx.context.adapter;
          let organizationId = [input.organizationId, input.id].find(
            (value): value is string => typeof value === "string",
          );
          let organization = organizationId
            ? await adapter.findOne({
                model: "organization",
                where: [{ field: "id", value: organizationId }],
              })
            : null;
          if (!organization && typeof input.organizationSlug === "string") {
            organization = await adapter.findOne({
              model: "organization",
              where: [{ field: "slug", value: input.organizationSlug }],
            });
          }

          const nested = isRecord(body.data) ? body.data : {};
          const referenceFields: Array<[string, string]> = [
            ["invitationId", "invitation"],
            ["memberId", "member"],
            ["teamId", "team"],
            ["roleId", "organizationRole"],
          ];
          if (!organization) {
            for (const [field, model] of referenceFields) {
              const value = input[field] ?? nested[field];
              for (const id of Array.isArray(value) ? value : [value]) {
                if (typeof id !== "string") continue;
                const record = await adapter.findOne({
                  model,
                  where: [{ field: "id", value: id }],
                });
                if (isRecord(record) && typeof record.organizationId === "string") {
                  organizationId = record.organizationId;
                  organization = await adapter.findOne({
                    model: "organization",
                    where: [{ field: "id", value: organizationId }],
                  });
                  break;
                }
              }
              if (organization) break;
            }
          }
          organizationId ??= session?.session.activeOrganizationId ?? undefined;
          if (!organization && organizationId) {
            organization = await adapter.findOne({
              model: "organization",
              where: [{ field: "id", value: organizationId }],
            });
          }
          if (isRecord(organization) && organization.archivedAt) {
            throw APIError.from("FORBIDDEN", {
              code: "ORGANIZATION_ARCHIVED",
              message: "This organization is archived.",
            });
          }

          if (ctx.path === "/organization/delete-role" && organizationId) {
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
                    invite.role
                      .split(",")
                      .map((name: string) => name.trim())
                      .includes(role.role as string),
                )
              ) {
                throw APIError.from("BAD_REQUEST", {
                  code: "ROLE_ASSIGNED_TO_PENDING_INVITATION",
                  message: "A role assigned to a pending invitation cannot be deleted.",
                });
              }
            }
          }
        }),
      },
    ],
    after: [
      {
        matcher: ({ path }) =>
          path === "/organization/remove-member" || path === "/organization/leave",
        handler: createAuthMiddleware(async (ctx) => {
          const body = isRecord(ctx.body) ? ctx.body : {};
          const result = ctx.context.returned;
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
              : session?.session.activeOrganizationId;
          if (!userId || !organizationId) return;
          const teams = await ctx.context.adapter.findMany({
            model: "team",
            where: [{ field: "organizationId", value: organizationId }],
          });
          const teamIds = teams.flatMap((team) =>
            isRecord(team) && typeof team.id === "string" ? [team.id] : [],
          );
          if (!teamIds.length) return;
          await ctx.context.adapter.deleteMany({
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
};
