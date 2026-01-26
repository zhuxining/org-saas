import { auth } from "@org-sass/auth";
import { getLogger } from "@orpc/experimental-pino";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { mapAuthErrorToORPC } from "../lib/error-handler";

type OrgRole = "member" | "moderator" | "owner";

export const organizationRouter = {
	createOrganization: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				slug: z.string(),
				logo: z.string().optional(),
				metadata: z.record(z.string(), z.unknown()).optional(),
				userId: z.string().optional(),
				keepCurrentActiveOrganization: z.boolean().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "CREATE_ORGANIZATION",
					organizationName: input.name,
					organizationSlug: input.slug,
				},
				"Creating organization",
			);

			try {
				const result = await auth.api.createOrganization({
					body: input,
					headers: context.req.headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "CREATE_ORGANIZATION",
						organizationSlug: input.slug,
						success: true,
					},
					"Organization created successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "CREATE_ORGANIZATION",
						organizationSlug: input.slug,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to create organization",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	listOrganizations: protectedProcedure.handler(async ({ context }) => {
		const logger = getLogger(context);

		logger?.debug(
			{
				userId: context.session.user.id,
				action: "LIST_ORGANIZATIONS",
			},
			"Listing organizations",
		);

		try {
			const result = await auth.api.listOrganizations({
				headers: context.req.headers,
			});
			return result;
		} catch (error) {
			logger?.error(
				{
					userId: context.session.user.id,
					action: "LIST_ORGANIZATIONS",
					error: error instanceof Error ? error.message : "Unknown error",
				},
				"Failed to list organizations",
			);
			throw mapAuthErrorToORPC(error);
		}
	}),

	getFullOrganization: protectedProcedure
		.input(
			z.object({
				organizationId: z.string().optional(),
				organizationSlug: z.string().optional(),
				membersLimit: z.number().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "GET_ORGANIZATION",
					organizationId: input.organizationId,
					organizationSlug: input.organizationSlug,
				},
				"Getting organization details",
			);

			try {
				const result = await auth.api.getFullOrganization({
					query: input,
					headers: context.req.headers,
				});
				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "GET_ORGANIZATION",
						organizationId: input.organizationId,
						organizationSlug: input.organizationSlug,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to get organization",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	updateOrganization: protectedProcedure
		.input(
			z.object({
				organizationId: z.string().optional(),
				data: z.record(z.string(), z.unknown()),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "UPDATE_ORGANIZATION",
					organizationId: input.organizationId,
				},
				"Updating organization",
			);

			try {
				const result = await auth.api.updateOrganization({
					body: input,
					headers: context.req.headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "UPDATE_ORGANIZATION",
						organizationId: input.organizationId,
						success: true,
					},
					"Organization updated successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "UPDATE_ORGANIZATION",
						organizationId: input.organizationId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to update organization",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	deleteOrganization: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.warn(
				{
					userId: context.session.user.id,
					action: "DELETE_ORGANIZATION",
					organizationId: input.organizationId,
				},
				"Deleting organization",
			);

			try {
				const result = await auth.api.deleteOrganization({
					body: input,
					headers: context.req.headers,
				});

				logger?.warn(
					{
						userId: context.session.user.id,
						action: "DELETE_ORGANIZATION",
						organizationId: input.organizationId,
						success: true,
					},
					"Organization deleted successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "DELETE_ORGANIZATION",
						organizationId: input.organizationId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to delete organization",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	setActiveOrganization: protectedProcedure
		.input(
			z.object({
				organizationId: z.string().nullable().optional(),
				organizationSlug: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "SET_ACTIVE_ORGANIZATION",
					organizationId: input.organizationId,
					organizationSlug: input.organizationSlug,
				},
				"Setting active organization",
			);

			try {
				const result = await auth.api.setActiveOrganization({
					body: input,
					headers: context.req.headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "SET_ACTIVE_ORGANIZATION",
						organizationId: input.organizationId,
						success: true,
					},
					"Active organization set successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "SET_ACTIVE_ORGANIZATION",
						organizationId: input.organizationId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to set active organization",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	addMember: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
				role: z.enum(["member", "admin", "owner"]),
				organizationId: z.string().optional(),
				teamId: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "ADD_MEMBER",
					targetUserId: input.userId,
					role: input.role,
					organizationId: input.organizationId,
					teamId: input.teamId,
				},
				"Adding member",
			);

			try {
				const result = await auth.api.addMember({
					body: {
						userId: input.userId,
						role: input.role as OrgRole,
						organizationId: input.organizationId,
						teamId: input.teamId,
					},
					headers: context.req.headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "ADD_MEMBER",
						targetUserId: input.userId,
						role: input.role,
						success: true,
					},
					"Member added successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "ADD_MEMBER",
						targetUserId: input.userId,
						role: input.role,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to add member",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	removeMember: protectedProcedure
		.input(
			z.object({
				memberIdOrEmail: z.string(),
				organizationId: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.warn(
				{
					userId: context.session.user.id,
					action: "REMOVE_MEMBER",
					memberIdOrEmail: input.memberIdOrEmail,
					organizationId: input.organizationId,
				},
				"Removing member",
			);

			try {
				const result = await auth.api.removeMember({
					body: input,
					headers: context.req.headers,
				});

				logger?.warn(
					{
						userId: context.session.user.id,
						action: "REMOVE_MEMBER",
						memberIdOrEmail: input.memberIdOrEmail,
						success: true,
					},
					"Member removed successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "REMOVE_MEMBER",
						memberIdOrEmail: input.memberIdOrEmail,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to remove member",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	listMembers: protectedProcedure
		.input(
			z.object({
				organizationId: z.string().optional(),
				organizationSlug: z.string().optional(),
				limit: z.union([z.string(), z.number()]).optional(),
				offset: z.union([z.string(), z.number()]).optional(),
				sortBy: z.string().optional(),
				sortDirection: z.enum(["asc", "desc"]).optional(),
				filterField: z.string().optional(),
				filterValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
				filterOperator: z
					.enum(["eq", "ne", "lt", "lte", "gt", "gte", "contains"])
					.optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "LIST_MEMBERS",
					organizationId: input.organizationId,
					organizationSlug: input.organizationSlug,
				},
				"Listing members",
			);

			try {
				const result = await auth.api.listMembers({
					query: input,
					headers: context.req.headers,
				});
				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "LIST_MEMBERS",
						organizationId: input.organizationId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to list members",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	updateMemberRole: protectedProcedure
		.input(
			z.object({
				memberId: z.string(),
				role: z.enum(["member", "admin", "owner"]),
				organizationId: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "UPDATE_MEMBER_ROLE",
					memberId: input.memberId,
					newRole: input.role,
					organizationId: input.organizationId,
				},
				"Updating member role",
			);

			try {
				const result = await auth.api.updateMemberRole({
					body: {
						memberId: input.memberId,
						role: input.role as OrgRole,
						organizationId: input.organizationId,
					},
					headers: context.req.headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "UPDATE_MEMBER_ROLE",
						memberId: input.memberId,
						newRole: input.role,
						success: true,
					},
					"Member role updated successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "UPDATE_MEMBER_ROLE",
						memberId: input.memberId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to update member role",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	getActiveMember: protectedProcedure.handler(async ({ context }) => {
		const logger = getLogger(context);

		logger?.debug(
			{
				userId: context.session.user.id,
				action: "GET_ACTIVE_MEMBER",
			},
			"Getting active member",
		);

		try {
			const result = await auth.api.getActiveMember({
				headers: context.req.headers,
			});
			return result;
		} catch (error) {
			logger?.error(
				{
					userId: context.session.user.id,
					action: "GET_ACTIVE_MEMBER",
					error: error instanceof Error ? error.message : "Unknown error",
				},
				"Failed to get active member",
			);
			throw mapAuthErrorToORPC(error);
		}
	}),

	leaveOrganization: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "LEAVE_ORGANIZATION",
					organizationId: input.organizationId,
				},
				"Leaving organization",
			);

			try {
				const result = await auth.api.leaveOrganization({
					body: input,
					headers: context.req.headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "LEAVE_ORGANIZATION",
						organizationId: input.organizationId,
						success: true,
					},
					"Left organization successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "LEAVE_ORGANIZATION",
						organizationId: input.organizationId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to leave organization",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	inviteMember: protectedProcedure
		.input(
			z.object({
				email: z.email(),
				role: z.enum(["member", "admin", "owner"]),
				organizationId: z.string().optional(),
				resend: z.boolean().optional(),
				teamId: z.union([z.string(), z.array(z.string())]).optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "INVITE_MEMBER",
					email: input.email,
					role: input.role,
					organizationId: input.organizationId,
				},
				"Inviting member",
			);

			try {
				const result = await auth.api.createInvitation({
					body: {
						email: input.email,
						role: input.role as OrgRole,
						organizationId: input.organizationId,
						resend: input.resend,
						teamId: input.teamId,
					},
					headers: context.req.headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "INVITE_MEMBER",
						email: input.email,
						role: input.role,
						success: true,
					},
					"Member invited successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "INVITE_MEMBER",
						email: input.email,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to invite member",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	acceptInvitation: protectedProcedure
		.input(
			z.object({
				invitationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "ACCEPT_INVITATION",
					invitationId: input.invitationId,
				},
				"Accepting invitation",
			);

			try {
				const result = await auth.api.acceptInvitation({
					body: input,
					headers: context.req.headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "ACCEPT_INVITATION",
						invitationId: input.invitationId,
						success: true,
					},
					"Invitation accepted successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "ACCEPT_INVITATION",
						invitationId: input.invitationId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to accept invitation",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	rejectInvitation: protectedProcedure
		.input(
			z.object({
				invitationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "REJECT_INVITATION",
					invitationId: input.invitationId,
				},
				"Rejecting invitation",
			);

			try {
				const result = await auth.api.rejectInvitation({
					body: input,
					headers: context.req.headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "REJECT_INVITATION",
						invitationId: input.invitationId,
						success: true,
					},
					"Invitation rejected successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "REJECT_INVITATION",
						invitationId: input.invitationId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to reject invitation",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	cancelInvitation: protectedProcedure
		.input(
			z.object({
				invitationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.warn(
				{
					userId: context.session.user.id,
					action: "CANCEL_INVITATION",
					invitationId: input.invitationId,
				},
				"Cancelling invitation",
			);

			try {
				const result = await auth.api.cancelInvitation({
					body: input,
					headers: context.req.headers,
				});

				logger?.warn(
					{
						userId: context.session.user.id,
						action: "CANCEL_INVITATION",
						invitationId: input.invitationId,
						success: true,
					},
					"Invitation cancelled successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "CANCEL_INVITATION",
						invitationId: input.invitationId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to cancel invitation",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	getInvitation: protectedProcedure
		.input(
			z.object({
				id: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "GET_INVITATION",
					invitationId: input.id,
				},
				"Getting invitation",
			);

			try {
				const result = await auth.api.getInvitation({
					query: input,
					headers: context.req.headers,
				});
				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "GET_INVITATION",
						invitationId: input.id,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to get invitation",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	listInvitations: protectedProcedure
		.input(
			z.object({
				organizationId: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "LIST_INVITATIONS",
					organizationId: input.organizationId,
				},
				"Listing invitations",
			);

			try {
				const result = await auth.api.listInvitations({
					query: input,
					headers: context.req.headers,
				});
				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "LIST_INVITATIONS",
						organizationId: input.organizationId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to list invitations",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	createTeam: protectedProcedure
		.input(
			z.object({
				name: z.string(),
				organizationId: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "CREATE_TEAM",
					teamName: input.name,
					organizationId: input.organizationId,
				},
				"Creating team",
			);

			try {
				const result = await auth.api.createTeam({
					body: input,
					headers: context.req.headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "CREATE_TEAM",
						teamName: input.name,
						success: true,
					},
					"Team created successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "CREATE_TEAM",
						teamName: input.name,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to create team",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	updateTeam: protectedProcedure
		.input(
			z.object({
				teamId: z.string(),
				data: z.record(z.string(), z.unknown()),
				organizationId: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "UPDATE_TEAM",
					teamId: input.teamId,
					organizationId: input.organizationId,
				},
				"Updating team",
			);

			try {
				const result = await auth.api.updateTeam({
					body: input,
					headers: context.req.headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "UPDATE_TEAM",
						teamId: input.teamId,
						success: true,
					},
					"Team updated successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "UPDATE_TEAM",
						teamId: input.teamId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to update team",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	removeTeam: protectedProcedure
		.input(
			z.object({
				teamId: z.string(),
				organizationId: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.warn(
				{
					userId: context.session.user.id,
					action: "REMOVE_TEAM",
					teamId: input.teamId,
					organizationId: input.organizationId,
				},
				"Removing team",
			);

			try {
				const result = await auth.api.removeTeam({
					body: input,
					headers: context.req.headers,
				});

				logger?.warn(
					{
						userId: context.session.user.id,
						action: "REMOVE_TEAM",
						teamId: input.teamId,
						success: true,
					},
					"Team removed successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "REMOVE_TEAM",
						teamId: input.teamId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to remove team",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	listTeams: protectedProcedure
		.input(
			z.object({
				organizationId: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "LIST_TEAMS",
					organizationId: input.organizationId,
				},
				"Listing teams",
			);

			try {
				const result = await auth.api.listOrganizationTeams({
					query: input,
					headers: context.req.headers,
				});
				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "LIST_TEAMS",
						organizationId: input.organizationId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to list teams",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	addTeamMember: protectedProcedure
		.input(
			z.object({
				teamId: z.string(),
				userId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "ADD_TEAM_MEMBER",
					teamId: input.teamId,
					targetUserId: input.userId,
				},
				"Adding team member",
			);

			try {
				const result = await auth.api.addTeamMember({
					body: input,
					headers: context.req.headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "ADD_TEAM_MEMBER",
						teamId: input.teamId,
						targetUserId: input.userId,
						success: true,
					},
					"Team member added successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "ADD_TEAM_MEMBER",
						teamId: input.teamId,
						targetUserId: input.userId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to add team member",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	removeTeamMember: protectedProcedure
		.input(
			z.object({
				teamId: z.string(),
				userId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.warn(
				{
					userId: context.session.user.id,
					action: "REMOVE_TEAM_MEMBER",
					teamId: input.teamId,
					targetUserId: input.userId,
				},
				"Removing team member",
			);

			try {
				const result = await auth.api.removeTeamMember({
					body: input,
					headers: context.req.headers,
				});

				logger?.warn(
					{
						userId: context.session.user.id,
						action: "REMOVE_TEAM_MEMBER",
						teamId: input.teamId,
						targetUserId: input.userId,
						success: true,
					},
					"Team member removed successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "REMOVE_TEAM_MEMBER",
						teamId: input.teamId,
						targetUserId: input.userId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to remove team member",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	setActiveTeam: protectedProcedure
		.input(
			z.object({
				teamId: z.string().nullable().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "SET_ACTIVE_TEAM",
					teamId: input.teamId,
				},
				"Setting active team",
			);

			try {
				const result = await auth.api.setActiveTeam({
					body: input,
					headers: context.req.headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "SET_ACTIVE_TEAM",
						teamId: input.teamId,
						success: true,
					},
					"Active team set successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "SET_ACTIVE_TEAM",
						teamId: input.teamId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to set active team",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	listUserTeams: protectedProcedure.handler(async ({ context }) => {
		const logger = getLogger(context);

		logger?.debug(
			{
				userId: context.session.user.id,
				action: "LIST_USER_TEAMS",
			},
			"Listing user teams",
		);

		try {
			const result = await auth.api.listUserTeams({
				headers: context.req.headers,
			});
			return result;
		} catch (error) {
			logger?.error(
				{
					userId: context.session.user.id,
					action: "LIST_USER_TEAMS",
					error: error instanceof Error ? error.message : "Unknown error",
				},
				"Failed to list user teams",
			);
			throw mapAuthErrorToORPC(error);
		}
	}),

	listTeamMembers: protectedProcedure
		.input(
			z.object({
				teamId: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "LIST_TEAM_MEMBERS",
					teamId: input.teamId,
				},
				"Listing team members",
			);

			try {
				const result = await auth.api.listTeamMembers({
					query: input,
					headers: context.req.headers,
				});
				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "LIST_TEAM_MEMBERS",
						teamId: input.teamId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to list team members",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	hasPermission: protectedProcedure
		.input(
			z.object({
				organizationId: z.string().optional(),
				permissions: z.object({
					organization: z
						.array(
							z.enum(["update", "delete", "manage-settings", "view-analytics"]),
						)
						.optional(),
					member: z
						.array(
							z.enum(["create", "update", "delete", "update-role", "view"]),
						)
						.optional(),
					invitation: z
						.array(z.enum(["create", "cancel", "resend", "view"]))
						.optional(),
					team: z
						.array(
							z.enum(["create", "update", "delete", "view", "manage-members"]),
						)
						.optional(),
					ac: z
						.array(z.enum(["create", "update", "delete", "view"]))
						.optional(),
				}),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "CHECK_PERMISSION",
					organizationId: input.organizationId,
					permissions: input.permissions,
				},
				"Checking permissions",
			);

			try {
				const result = await auth.api.hasPermission({
					body: {
						organizationId: input.organizationId,
						permissions: input.permissions,
					},
					headers: context.req.headers,
				});
				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "CHECK_PERMISSION",
						organizationId: input.organizationId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to check permission",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	checkOrganizationSlug: protectedProcedure
		.input(
			z.object({
				slug: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "CHECK_ORGANIZATION_SLUG",
					slug: input.slug,
				},
				"Checking organization slug",
			);

			try {
				const result = await auth.api.checkOrganizationSlug({
					body: input,
					headers: context.req.headers,
				});
				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "CHECK_ORGANIZATION_SLUG",
						slug: input.slug,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to check organization slug",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),
};
