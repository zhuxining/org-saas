import { auth } from "@org-sass/auth";
import { db, eq } from "@org-sass/db";
import { organizationRole } from "@org-sass/db/schema/auth";
import { getLogger } from "@orpc/experimental-pino";
import { z } from "zod";
import { protectedProcedure, requirePermission } from "../index";
import { mapAuthErrorToORPC } from "../lib/error-handler";

export const rolesRouter = {
	/**
	 * Create a custom role for an organization
	 * Requires: ac.create permission (owner/admin by default)
	 */
	createRole: protectedProcedure
		.input(
			z.object({
				role: z
					.string()
					.min(3)
					.max(50)
					.regex(
						/^[a-z0-9-]+$/,
						"Role name must contain only lowercase letters, numbers, and hyphens",
					),
				permissions: z.record(z.string(), z.array(z.string())),
				description: z.string().optional(),
				color: z.string().optional(),
				level: z.number().optional(),
				organizationId: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "CREATE_ROLE",
					roleName: input.role,
					organizationId: input.organizationId,
				},
				"Creating custom role",
			);

			try {
				// Check permission
				await requirePermission(
					context,
					"ac",
					["create"],
					input.organizationId,
				);

				// Create role with additional fields
				// biome-ignore lint/suspicious/noExplicitAny: <better-auth>
				const roleData: any = {
					role: input.role,
					permission: input.permissions,
					organizationId: input.organizationId,
					description: input.description,
					color: input.color,
					level: input.level,
				};

				const result = (await auth.api.createOrgRole({
					body: roleData,
					headers: context.req.headers,
					// biome-ignore lint/suspicious/noExplicitAny: <better-auth>
				})) as any;

				logger?.info(
					{
						userId: context.session.user.id,
						action: "CREATE_ROLE",
						roleName: input.role,
						success: true,
					},
					"Role created successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "CREATE_ROLE",
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to create role",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	/**
	 * List all roles for an organization
	 */
	listRoles: protectedProcedure
		.input(
			z.object({
				organizationId: z.string().optional(),
				includeSystemRoles: z.boolean().default(true),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "LIST_ROLES",
					organizationId: input.organizationId,
				},
				"Listing roles",
			);

			try {
				const result = await auth.api.listOrgRoles({
					query: {
						organizationId: input.organizationId,
					},
					headers: context.req.headers,
				});

				// Filter out system roles if requested
				const roles = input.includeSystemRoles
					? result
					: // biome-ignore lint/suspicious/noExplicitAny: <better-auth>
						result.filter((role: any) => !role.isSystemRole);

				return roles;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "LIST_ROLES",
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to list roles",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	/**
	 * Update a custom role
	 */
	updateRole: protectedProcedure
		.input(
			z.object({
				roleId: z.string().optional(),
				roleName: z.string().optional(),
				organizationId: z.string().optional(),
				data: z.object({
					role: z.string().optional(),
					permissions: z.record(z.string(), z.array(z.string())).optional(),
					description: z.string().optional(),
					color: z.string().optional(),
					level: z.number().optional(),
				}),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.info(
				{
					userId: context.session.user.id,
					action: "UPDATE_ROLE",
					roleId: input.roleId,
					roleName: input.roleName,
				},
				"Updating role",
			);

			try {
				// Check permission first
				await requirePermission(
					context,
					"ac",
					["update"],
					input.organizationId,
				);

				// Check if this is a system role (cannot be modified)
				if (input.roleId) {
					const roleRecord = await db.query.organizationRole.findFirst({
						where: eq(organizationRole.id, input.roleId),
					});

					if (roleRecord?.isSystemRole) {
						throw new Error("Cannot modify system roles");
					}
				}

				// Update role via Better-Auth
				// biome-ignore lint/suspicious/noExplicitAny: <better-auth>
				const updateData: any = {
					roleName: input.roleName,
					organizationId: input.organizationId,
				};

				if (input.data.permissions) {
					updateData.permission = input.data.permissions;
				}

				const result = (await auth.api.updateOrgRole({
					body: updateData,
					headers: context.req.headers,
					// biome-ignore lint/suspicious/noExplicitAny: <better-auth>
				})) as any;

				// Update additional fields
				if (input.roleId && input.data) {
					await db
						.update(organizationRole)
						.set({
							description: input.data.description,
							color: input.data.color,
							level: input.data.level ?? 0,
						})
						.where(eq(organizationRole.id, input.roleId));
				}

				logger?.info(
					{
						userId: context.session.user.id,
						action: "UPDATE_ROLE",
						success: true,
					},
					"Role updated successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "UPDATE_ROLE",
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to update role",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	/**
	 * Delete a custom role
	 */
	deleteRole: protectedProcedure
		.input(
			z.object({
				roleId: z.string().optional(),
				roleName: z.string().optional(),
				organizationId: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.warn(
				{
					userId: context.session.user.id,
					action: "DELETE_ROLE",
					roleId: input.roleId,
					roleName: input.roleName,
				},
				"Deleting role",
			);

			try {
				// Check permission first
				await requirePermission(
					context,
					"ac",
					["delete"],
					input.organizationId,
				);

				// Check if this is a system role (cannot be deleted)
				if (input.roleId) {
					const roleRecord = await db.query.organizationRole.findFirst({
						where: eq(organizationRole.id, input.roleId),
					});

					if (roleRecord?.isSystemRole) {
						throw new Error("Cannot delete system roles");
					}
				}

				const result = await auth.api.deleteOrgRole({
					body: {
						roleId: input.roleId,
						roleName: input.roleName,
						organizationId: input.organizationId,
					},
					headers: context.req.headers,
				});

				logger?.warn(
					{
						userId: context.session.user.id,
						action: "DELETE_ROLE",
						success: true,
					},
					"Role deleted successfully",
				);

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "DELETE_ROLE",
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to delete role",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),

	/**
	 * Get role details with permissions
	 */
	getRole: protectedProcedure
		.input(
			z.object({
				roleId: z.string().optional(),
				roleName: z.string().optional(),
				organizationId: z.string().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const logger = getLogger(context);

			logger?.debug(
				{
					userId: context.session.user.id,
					action: "GET_ROLE",
					roleId: input.roleId,
					roleName: input.roleName,
				},
				"Getting role details",
			);

			try {
				const result = await auth.api.getOrgRole({
					query: {
						roleId: input.roleId,
						roleName: input.roleName,
						organizationId: input.organizationId,
					},
					headers: context.req.headers,
				});

				return result;
			} catch (error) {
				logger?.error(
					{
						userId: context.session.user.id,
						action: "GET_ROLE",
						error: error instanceof Error ? error.message : "Unknown error",
					},
					"Failed to get role",
				);
				throw mapAuthErrorToORPC(error);
			}
		}),
};
