import { auth } from "@org-sass/auth";
import { getLogger } from "@orpc/experimental-pino";
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
					headers: context.req.headers,
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
					headers: context.req.headers,
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
					headers: context.req.headers,
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
					headers: context.req.headers,
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
					headers: context.req.headers,
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
					headers: context.req.headers,
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
					headers: context.req.headers,
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
					headers: context.req.headers,
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
					headers: context.req.headers,
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
					headers: context.req.headers,
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
					headers: context.req.headers,
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
					headers: context.req.headers,
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
				headers: context.req.headers,
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
					headers: context.req.headers,
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
};
