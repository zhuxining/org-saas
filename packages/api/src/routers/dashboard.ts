import { and, count, db, eq } from "@org-sass/db";
import { invitation, member, team } from "@org-sass/db/schema/auth";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const dashboardRouter = {
	orgStats: protectedProcedure
		.input(
			z.object({
				orgId: z.string(),
			}),
		)
		.handler(async ({ context, input }) => {
			const userId = context.session.user.id;

			// 验证用户是否为组织成员
			const membership = await db.query.member.findFirst({
				where: and(
					eq(member.organizationId, input.orgId),
					eq(member.userId, userId),
				),
			});

			if (!membership) {
				throw new ORPCError("FORBIDDEN", { message: "您不是此组织的成员" });
			}

			const [memberCount, teamCount, pendingInvitationCount] =
				await Promise.all([
					db
						.select({ count: count() })
						.from(member)
						.where(eq(member.organizationId, input.orgId)),
					db
						.select({ count: count() })
						.from(team)
						.where(eq(team.organizationId, input.orgId)),
					db
						.select({ count: count() })
						.from(invitation)
						.where(
							and(
								eq(invitation.organizationId, input.orgId),
								eq(invitation.status, "pending"),
							),
						),
				]);

			return {
				memberCount: memberCount[0]?.count ?? 0,
				teamCount: teamCount[0]?.count ?? 0,
				pendingInvitationCount: pendingInvitationCount[0]?.count ?? 0,
			};
		}),
};
