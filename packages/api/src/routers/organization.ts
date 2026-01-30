import { auth } from "@org-sass/auth";
import { db, eq } from "@org-sass/db";
import { member, organization } from "@org-sass/db/schema/auth";
import { getLogger } from "@orpc/experimental-pino";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { mapAuthErrorToORPC } from "../lib/error-handler";

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
					headers: context.headers as Headers,
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
				headers: context.headers as Headers,
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

	/**
	 * 直接从数据库查询用户所属的组织列表
	 * 用于 SSR 环境，绕过 Better-Auth 的 session 限制
	 */
	listMyOrganizations: protectedProcedure.handler(async ({ context }) => {
		const logger = getLogger(context);

		logger?.debug(
			{
				userId: context.session.user.id,
				action: "LIST_MY_ORGANIZATIONS",
			},
			"Listing user organizations from database",
		);

		try {
			// 直接从数据库查询用户的组织成员关系
			const userOrgs = await db
				.select({
					id: organization.id,
					name: organization.name,
					slug: organization.slug,
					logo: organization.logo,
					createdAt: organization.createdAt,
					role: member.role,
					memberId: member.id,
				})
				.from(member)
				.innerJoin(organization, eq(member.organizationId, organization.id))
				.where(eq(member.userId, context.session.user.id))
				.orderBy(member.createdAt);

			return userOrgs;
		} catch (error) {
			logger?.error(
				{
					userId: context.session.user.id,
					action: "LIST_MY_ORGANIZATIONS",
					error: error instanceof Error ? error.message : "Unknown error",
				},
				"Failed to list user organizations",
			);
			throw error;
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
					headers: context.headers as Headers,
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
					headers: context.headers as Headers,
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
					headers: context.headers as Headers,
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
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "SET_ACTIVE_ORGANIZATION",
					organizationId: input.organizationId,
				},
				"Setting active organization",
			);

			try {
				const result = await auth.api.setActiveOrganization({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.debug(
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
				headers: context.headers as Headers,
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

	listMembers: protectedProcedure
		.input(
			z.object({
				organizationId: z.string().optional(),
				organizationSlug: z.string().optional(),
				limit: z.number().optional(),
				offset: z.number().optional(),
				searchQuery: z.string().optional(),
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
					headers: context.headers as Headers,
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

	addMember: protectedProcedure
		.input(
			z.object({
				userId: z.string().optional(),
				email: z.string().optional(),
				role: z.enum(["member", "moderator", "owner"]),
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "ADD_MEMBER",
					organizationId: input.organizationId,
					targetUserId: input.userId,
					targetEmail: input.email,
					role: input.role,
				},
				"Adding member",
			);

			try {
				const result = await auth.api.addMember({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "ADD_MEMBER",
						organizationId: input.organizationId,
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
						organizationId: input.organizationId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to add member",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	updateMemberRole: protectedProcedure
		.input(
			z.object({
				memberId: z.string(),
				role: z.enum(["member", "moderator", "owner"]),
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "UPDATE_MEMBER_ROLE",
					memberId: input.memberId,
					role: input.role,
					organizationId: input.organizationId,
				},
				"Updating member role",
			);

			try {
				const result = await auth.api.updateMemberRole({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "UPDATE_MEMBER_ROLE",
						memberId: input.memberId,
						role: input.role,
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
						role: input.role,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to update member role",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	removeMember: protectedProcedure
		.input(
			z.object({
				memberId: z.string(),
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "REMOVE_MEMBER",
					memberId: input.memberId,
					organizationId: input.organizationId,
				},
				"Removing member",
			);

			try {
				const result = await auth.api.removeMember({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "REMOVE_MEMBER",
						memberId: input.memberId,
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
						memberId: input.memberId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to remove member",
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
					headers: context.headers as Headers,
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
				email: z.string().email(),
				role: z.enum(["member", "moderator", "owner"]),
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "INVITE_MEMBER",
					organizationId: input.organizationId,
					email: input.email,
					role: input.role,
				},
				"Inviting member",
			);

			try {
				const result = await auth.api.inviteMember({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "INVITE_MEMBER",
						organizationId: input.organizationId,
						email: input.email,
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
						organizationId: input.organizationId,
						email: input.email,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to invite member",
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
					headers: context.headers as Headers,
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

	cancelInvitation: protectedProcedure
		.input(
			z.object({
				invitationId: z.string(),
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "CANCEL_INVITATION",
					invitationId: input.invitationId,
					organizationId: input.organizationId,
				},
				"Cancelling invitation",
			);

			try {
				const result = await auth.api.cancelInvitation({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.info(
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
					headers: context.headers as Headers,
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
					headers: context.headers as Headers,
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

	updateInvitation: protectedProcedure
		.input(
			z.object({
				invitationId: z.string(),
				role: z.enum(["member", "moderator", "owner"]),
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "UPDATE_INVITATION",
					invitationId: input.invitationId,
					role: input.role,
					organizationId: input.organizationId,
				},
				"Updating invitation",
			);

			try {
				const result = await auth.api.updateInvitation({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "UPDATE_INVITATION",
						invitationId: input.invitationId,
						role: input.role,
						success: true,
					},
					"Invitation updated successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "UPDATE_INVITATION",
						invitationId: input.invitationId,
						role: input.role,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to update invitation",
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
					headers: context.headers as Headers,
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
					headers: context.headers as Headers,
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
