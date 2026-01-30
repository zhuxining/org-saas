import { auth } from "@org-sass/auth";
import { db, eq } from "@org-sass/db";
import {
	invitation,
	member,
	organization,
	user,
} from "@org-sass/db/schema/auth";
import { getLogger } from "@orpc/experimental-pino";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure, requireAdmin } from "../index";
import { mapAuthErrorToORPC } from "../lib/error-handler";

// Role types for Better-Auth Admin plugin
type AdminRole = "user" | "admin";

export const adminRouter = {
	createUser: protectedProcedure
		.input(
			z.object({
				email: z.email(),
				password: z.string().min(1),
				name: z.string(),
				role: z.enum(["user", "admin"]).optional(),
				data: z.record(z.string(), z.unknown()).optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "CREATE_USER",
					targetEmail: input.email,
				},
				"Creating user",
			);

			try {
				const result = await auth.api.createUser({
					body: {
						...input,
						role: input.role as AdminRole | undefined,
					},
					headers: context.headers as Headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "CREATE_USER",
						targetEmail: input.email,
						success: true,
					},
					"User created successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "CREATE_USER",
						targetEmail: input.email,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to create user",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	listUsers: protectedProcedure
		.input(
			z.object({
				searchValue: z.string().optional(),
				searchField: z.enum(["email", "name"]).optional(),
				searchOperator: z
					.enum(["contains", "starts_with", "ends_with"])
					.optional(),
				limit: z.union([z.string(), z.number()]).optional(),
				offset: z.union([z.string(), z.number()]).optional(),
				sortBy: z.string().optional(),
				sortDirection: z.enum(["asc", "desc"]).optional(),
				filterField: z.string().optional(),
				filterValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
				filterOperator: z
					.enum(["eq", "ne", "lt", "lte", "gt", "gte"])
					.optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "LIST_USERS",
				},
				"Listing users",
			);

			try {
				const result = await auth.api.listUsers({
					query: input,
					headers: context.headers as Headers,
				});
				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "LIST_USERS",
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to list users",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	updateUser: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
				data: z.record(z.string(), z.unknown()),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "UPDATE_USER",
					targetUserId: input.userId,
				},
				"Updating user",
			);

			try {
				const result = await auth.api.adminUpdateUser({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "UPDATE_USER",
						targetUserId: input.userId,
						success: true,
					},
					"User updated successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "UPDATE_USER",
						targetUserId: input.userId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to update user",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	removeUser: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.warn(
				{
					userId: context.session.user.id,
					action: "DELETE_USER",
					targetUserId: input.userId,
				},
				"Deleting user",
			);

			try {
				const result = await auth.api.removeUser({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.warn(
					{
						userId: context.session.user.id,
						action: "DELETE_USER",
						targetUserId: input.userId,
						success: true,
					},
					"User deleted successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "DELETE_USER",
						targetUserId: input.userId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to delete user",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	setUserPassword: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
				newPassword: z.string().min(1),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "SET_USER_PASSWORD",
					targetUserId: input.userId,
				},
				"Setting user password",
			);

			try {
				const result = await auth.api.setUserPassword({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "SET_USER_PASSWORD",
						targetUserId: input.userId,
						success: true,
					},
					"User password set successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "SET_USER_PASSWORD",
						targetUserId: input.userId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to set user password",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	setRole: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
				role: z.union([
					z.enum(["user", "admin"]),
					z.array(z.enum(["user", "admin"])),
				]),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "SET_ROLE",
					targetUserId: input.userId,
					newRole: input.role,
				},
				"Setting user role",
			);

			try {
				const result = await auth.api.setRole({
					body: {
						userId: input.userId,
						role: input.role as AdminRole | AdminRole[],
					},
					headers: context.headers as Headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "SET_ROLE",
						targetUserId: input.userId,
						success: true,
					},
					"User role set successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "SET_ROLE",
						targetUserId: input.userId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to set role",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	banUser: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
				banReason: z.string().optional(),
				banExpiresIn: z.number().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.warn(
				{
					userId: context.session.user.id,
					action: "BAN_USER",
					targetUserId: input.userId,
					banReason: input.banReason,
				},
				"Banning user",
			);

			try {
				const result = await auth.api.banUser({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.warn(
					{
						userId: context.session.user.id,
						action: "BAN_USER",
						targetUserId: input.userId,
						success: true,
					},
					"User banned successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "BAN_USER",
						targetUserId: input.userId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to ban user",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	unbanUser: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "UNBAN_USER",
					targetUserId: input.userId,
				},
				"Unbanning user",
			);

			try {
				const result = await auth.api.unbanUser({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "UNBAN_USER",
						targetUserId: input.userId,
						success: true,
					},
					"User unbanned successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "UNBAN_USER",
						targetUserId: input.userId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to unban user",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	listUserSessions: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "LIST_USER_SESSIONS",
					targetUserId: input.userId,
				},
				"Listing user sessions",
			);

			try {
				const result = await auth.api.listUserSessions({
					body: input,
					headers: context.headers as Headers,
				});
				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "LIST_USER_SESSIONS",
						targetUserId: input.userId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to list user sessions",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	revokeUserSession: protectedProcedure
		.input(
			z.object({
				sessionToken: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "REVOKE_USER_SESSION",
				},
				"Revoking user session",
			);

			try {
				const result = await auth.api.revokeUserSession({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "REVOKE_USER_SESSION",
						success: true,
					},
					"User session revoked successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "REVOKE_USER_SESSION",
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to revoke user session",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	revokeUserSessions: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "REVOKE_USER_SESSIONS",
					targetUserId: input.userId,
				},
				"Revoking all user sessions",
			);

			try {
				const result = await auth.api.revokeUserSessions({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.info(
					{
						userId: context.session.user.id,
						action: "REVOKE_USER_SESSIONS",
						targetUserId: input.userId,
						success: true,
					},
					"All user sessions revoked successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "REVOKE_USER_SESSIONS",
						targetUserId: input.userId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to revoke user sessions",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	impersonateUser: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.warn(
				{
					userId: context.session.user.id,
					action: "IMPERSONATE_USER",
					targetUserId: input.userId,
				},
				"Starting user impersonation",
			);

			try {
				const result = await auth.api.impersonateUser({
					body: input,
					headers: context.headers as Headers,
				});

				logger?.warn(
					{
						userId: context.session.user.id,
						action: "IMPERSONATE_USER",
						targetUserId: input.userId,
						success: true,
					},
					"User impersonation started",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "IMPERSONATE_USER",
						targetUserId: input.userId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to impersonate user",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	stopImpersonating: protectedProcedure.handler(async ({ context }) => {
		const logger = getLogger(context);
		requireAdmin(context);

		logger?.info(
			{
				userId: context.session.user.id,
				action: "STOP_IMPERSONATING",
			},
			"Stopping user impersonation",
		);

		try {
			const result = await auth.api.stopImpersonating({
				headers: context.headers as Headers,
			});

			logger?.info(
				{
					userId: context.session.user.id,
					action: "STOP_IMPERSONATING",
					success: true,
				},
				"User impersonation stopped",
			);

			return result;
		} catch (error) {
			logger?.error(
				{
					userId: context.session.user.id,
					action: "STOP_IMPERSONATING",
					error: error instanceof Error ? error.message : "Unknown error",
				},
				"Failed to stop impersonating",
			);
			throw mapAuthErrorToORPC(error);
		}
	}),

	getUserOrganizations: protectedProcedure
		.input(
			z.object({
				userId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "GET_USER_ORGANIZATIONS",
					targetUserId: input.userId,
				},
				"Getting user organizations",
			);

			try {
				// Query database for user's organization memberships
				const userOrgs = await db
					.select({
						organizationId: member.organizationId,
						role: member.role,
						organizationName: organization.name,
						organizationSlug: organization.slug,
						createdAt: member.createdAt,
					})
					.from(member)
					.innerJoin(organization, eq(member.organizationId, organization.id))
					.where(eq(member.userId, input.userId));

				return userOrgs;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "GET_USER_ORGANIZATIONS",
						targetUserId: input.userId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to get user organizations",
				);
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to get user organizations",
				});
			}
		}),

	transferOrganizationOwnership: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				newOwnerId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.warn(
				{
					userId: context.session.user.id,
					action: "TRANSFER_ORGANIZATION_OWNERSHIP",
					organizationId: input.organizationId,
					newOwnerId: input.newOwnerId,
				},
				"Transferring organization ownership",
			);

			try {
				// Step 1: Add new owner as member if not already a member
				await auth.api.addMember({
					body: {
						userId: input.newOwnerId,
						role: "owner",
						organizationId: input.organizationId,
					},
					headers: context.headers as Headers,
				});

				// Step 2: Find and update the current owner to moderator
				// Better-Auth ensures only one owner, so we need to find current owner
				const membersResult = await auth.api.listMembers({
					query: {
						organizationId: input.organizationId,
					},
					headers: context.headers as Headers,
				});

				const currentOwner = membersResult.members.find(
					(m) => m.role === "owner",
				);

				if (currentOwner && currentOwner.user?.id !== input.newOwnerId) {
					await auth.api.updateMemberRole({
						body: {
							memberId: currentOwner.id,
							role: "moderator",
							organizationId: input.organizationId,
						},
						headers: context.headers as Headers,
					});
				}

				logger?.info(
					{
						userId: context.session.user.id,
						action: "TRANSFER_ORGANIZATION_OWNERSHIP",
						organizationId: input.organizationId,
						newOwnerId: input.newOwnerId,
						success: true,
					},
					"Organization ownership transferred successfully",
				);

				return {
					success: true,
					organizationId: input.organizationId,
					newOwnerId: input.newOwnerId,
				};
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "TRANSFER_ORGANIZATION_OWNERSHIP",
						organizationId: input.organizationId,
						newOwnerId: input.newOwnerId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to transfer organization ownership",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	setOrganizationOwner: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
				userId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.warn(
				{
					action: "SET_ORGANIZATION_OWNER",
					organizationId: input.organizationId,
					userId: input.userId,
				},
				"Setting organization owner",
			);

			try {
				// Find the current owner
				const membersResult = await auth.api.listMembers({
					query: {
						organizationId: input.organizationId,
					},
					headers: context.headers as Headers,
				});

				const currentOwner = membersResult.members.find(
					(m) => m.role === "owner",
				);

				// Add new owner as member (or update if already member)
				const newOwnerMember = membersResult.members.find(
					(m) => m.user?.id === input.userId,
				);

				if (newOwnerMember) {
					// Update existing member to owner
					await auth.api.updateMemberRole({
						body: {
							memberId: newOwnerMember.id,
							role: "owner",
							organizationId: input.organizationId,
						},
						headers: context.headers as Headers,
					});
				} else {
					// Add as new owner
					await auth.api.addMember({
						body: {
							userId: input.userId,
							role: "owner",
							organizationId: input.organizationId,
						},
						headers: context.headers as Headers,
					});
				}

				// Demote current owner to moderator if different from new owner
				if (currentOwner && currentOwner.user?.id !== input.userId) {
					await auth.api.updateMemberRole({
						body: {
							memberId: currentOwner.id,
							role: "moderator",
							organizationId: input.organizationId,
						},
						headers: context.headers as Headers,
					});
				}

				logger?.info(
					{
						action: "SET_ORGANIZATION_OWNER",
						organizationId: input.organizationId,
						userId: input.userId,
						success: true,
					},
					"Organization owner set successfully",
				);

				return {
					success: true,
					organizationId: input.organizationId,
					ownerId: input.userId,
				};
			} catch (error) {
				logger?.error(
					{
						action: "SET_ORGANIZATION_OWNER",
						organizationId: input.organizationId,
						userId: input.userId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to set organization owner",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	hasPermission: protectedProcedure
		.input(
			z.object({
				userId: z.string().optional(),
				role: z.enum(["user", "admin"]).optional(),
				permissions: z.object({
					user: z
						.array(
							z.enum([
								"set-role",
								"create",
								"update",
								"delete",
								"list",
								"ban",
								"impersonate",
								"set-password",
								"get",
							]),
						)
						.optional(),
					session: z.array(z.enum(["delete", "list", "revoke"])).optional(),
				}),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "CHECK_PERMISSION",
					targetUserId: input.userId,
					role: input.role,
				},
				"Checking user permissions",
			);

			try {
				const result = await auth.api.userHasPermission({
					body: {
						userId: input.userId,
						role: input.role as AdminRole | undefined,
						permissions: input.permissions,
					},
					headers: context.headers as Headers,
				});
				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "CHECK_PERMISSION",
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to check permission",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	/**
	 * 获取所有组织（Admin专用）
	 * Admin 可以看到所有组织，即使不是组织的成员
	 */
	listAllOrganizations: protectedProcedure.handler(async ({ context }) => {
		const logger = getLogger(context);
		requireAdmin(context);

		logger?.debug(
			{
				userId: context.session.user.id,
				action: "LIST_ALL_ORGANIZATIONS",
			},
			"Listing all organizations",
		);

		try {
			// 直接从数据库查询所有组织
			const allOrgs = await db
				.select({
					id: organization.id,
					name: organization.name,
					slug: organization.slug,
					logo: organization.logo,
					createdAt: organization.createdAt,
				})
				.from(organization)
				.orderBy(organization.createdAt);

			return allOrgs;
		} catch (error) {
			logger?.error(
				{
					userId: context.session.user.id,
					action: "LIST_ALL_ORGANIZATIONS",
					error: error instanceof Error ? error.message : "Unknown error",
				},
				"Failed to list all organizations",
			);
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: "Failed to list all organizations",
			});
		}
	}),

	/**
	 * 获取完整组织信息（Admin专用）
	 * Admin 可以查看任何组织的完整详情，包括成员列表，无需是组织成员
	 */
	getFullOrganizationById: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "GET_FULL_ORGANIZATION_BY_ID",
					organizationId: input.organizationId,
				},
				"Getting full organization details by ID",
			);

			try {
				// 查询组织基本信息
				const [orgData] = await db
					.select()
					.from(organization)
					.where(eq(organization.id, input.organizationId))
					.limit(1);

				if (!orgData) {
					throw new ORPCError("NOT_FOUND", {
						message: "Organization not found",
					});
				}

				// 查询组织成员，关联 user 表获取用户信息
				const membersData = await db
					.select({
						id: member.id,
						userId: member.userId,
						role: member.role,
						createdAt: member.createdAt,
						userEmail: user.email,
						userName: user.name,
						userImage: user.image,
					})
					.from(member)
					.leftJoin(user, eq(member.userId, user.id))
					.where(eq(member.organizationId, input.organizationId));

				// 组装成员数据，格式与 Better-Auth 的 getFullOrganization 一致
				const members = membersData.map((m) => ({
					id: m.id,
					role: m.role,
					createdAt: m.createdAt,
					user: {
						id: m.userId,
						name: m.userName,
						email: m.userEmail,
						image: m.userImage,
					},
				}));

				return {
					...orgData,
					members,
				};
			} catch (error) {
				if (error instanceof ORPCError) {
					throw error;
				}
				logger?.error(
					{
						userId: context.session.user.id,
						action: "GET_FULL_ORGANIZATION_BY_ID",
						organizationId: input.organizationId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to get organization details",
				);
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to get organization details",
				});
			}
		}),

	/**
	 * 列出组织的邀请（Admin专用）
	 * Admin 可以查看任何组织的邀请列表，无需是组织成员
	 */
	listInvitationsById: protectedProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);
			requireAdmin(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "LIST_INVITATIONS_BY_ID",
					organizationId: input.organizationId,
				},
				"Listing invitations by organization ID",
			);

			try {
				// 直接从数据库查询邀请列表
				const invitationsData = await db
					.select({
						id: invitation.id,
						email: invitation.email,
						role: invitation.role,
						status: invitation.status,
						expiresAt: invitation.expiresAt,
						createdAt: invitation.createdAt,
						teamId: invitation.teamId,
					})
					.from(invitation)
					.where(eq(invitation.organizationId, input.organizationId));

				return invitationsData;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "LIST_INVITATIONS_BY_ID",
						organizationId: input.organizationId,
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to list invitations",
				);
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "Failed to list invitations",
				});
			}
		}),
};
