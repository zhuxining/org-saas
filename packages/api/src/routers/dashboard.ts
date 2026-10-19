import { and, count, db, eq } from "@org-saas/db";
import { invitation, member, team } from "@org-saas/db/schema/auth";

import { protectedImplementer } from "../index";
import { loadOrganizationAccess } from "../organization-access";

export const dashboardRouter = {
  orgStats: protectedImplementer.dashboard.orgStats.handler(async ({ context, input, errors }) => {
    const userId = context.session.user.id;

    const access = await loadOrganizationAccess(input.orgId, userId);
    if (access.archivedAt) {
      throw errors.FORBIDDEN({ message: "此组织当前不可访问" });
    }
    const canViewPendingInvitations = access.operations.invitation.viewPending;

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
