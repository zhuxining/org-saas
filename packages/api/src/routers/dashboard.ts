import { and, count, db, eq } from "@org-saas/db";
import {
  invitation,
  member,
  organization as organizationTable,
  organizationRole,
  team,
} from "@org-saas/db/schema/auth";

import { protectedImplementer } from "../index";
import { getRoleStatements, roleAllows } from "../organization-permissions";

export const dashboardRouter = {
  orgStats: protectedImplementer.dashboard.orgStats.handler(async ({ context, input, errors }) => {
    const userId = context.session.user.id;

    const membership = await db
      .select({ id: member.id, role: member.role })
      .from(member)
      .where(and(eq(member.organizationId, input.orgId), eq(member.userId, userId)))
      .limit(1);

    if (!membership[0]) {
      throw errors.FORBIDDEN({ message: "您不是此组织的成员" });
    }

    const [organization] = await db
      .select({ archivedAt: organizationTable.archivedAt })
      .from(organizationTable)
      .where(eq(organizationTable.id, input.orgId))
      .limit(1);
    if (!organization || organization.archivedAt) {
      throw errors.FORBIDDEN({ message: "此组织当前不可访问" });
    }

    const [customRole] = await db
      .select({ permission: organizationRole.permission })
      .from(organizationRole)
      .where(
        and(
          eq(organizationRole.organizationId, input.orgId),
          eq(organizationRole.role, membership[0].role),
        ),
      )
      .limit(1);
    const statements = getRoleStatements(membership[0].role, customRole?.permission);
    const canViewPendingInvitations =
      roleAllows(statements, "invitation", "create") ||
      roleAllows(statements, "invitation", "cancel");

    const [memberCount, teamCount, pendingInvitationCount] = await Promise.all([
      db.select({ count: count() }).from(member).where(eq(member.organizationId, input.orgId)),
      db.select({ count: count() }).from(team).where(eq(team.organizationId, input.orgId)),
      canViewPendingInvitations
        ? db
            .select({ count: count() })
            .from(invitation)
            .where(
              and(eq(invitation.organizationId, input.orgId), eq(invitation.status, "pending")),
            )
        : Promise.resolve(null),
    ]);

    return {
      memberCount: memberCount[0]?.count ?? 0,
      teamCount: teamCount[0]?.count ?? 0,
      pendingInvitationCount: pendingInvitationCount?.[0]?.count ?? null,
    };
  }),
};
