import { client } from "@/utils/orpc";
import { requireActiveOrganization } from "./base";
import { ForbiddenError } from "./errors";
import type { BeforeLoadContext, OrgRole } from "./types";

/**
 * 要求自定义角色
 * @param roleName - 自定义角色名称
 * @throws ForbiddenError 如果用户不具有该角色
 */
export async function requireCustomRole(
	ctx: BeforeLoadContext,
	roleName: string,
): Promise<void> {
	await requireActiveOrganization(ctx);

	const memberData = await ctx.context.queryClient.ensureQueryData(
		ctx.context.orpc.organization.getActiveMember.queryOptions(),
	);

	if (!memberData) {
		throw new ForbiddenError("You must be a member of this organization", {
			requiredRole: roleName,
		});
	}

	// 检查用户的角色是否匹配
	if (memberData.role !== roleName) {
		throw new ForbiddenError(`Custom role '${roleName}' required`, {
			requiredRole: roleName,
		});
	}
}

/**
 * 要求自定义角色或内置角色
 * @param roles - 允许的角色列表（包含内置和自定义角色）
 */
export async function requireAnyRole(
	ctx: BeforeLoadContext,
	roles: OrgRole[],
): Promise<void> {
	await requireActiveOrganization(ctx);

	const memberData = await ctx.context.queryClient.ensureQueryData(
		ctx.context.orpc.organization.getActiveMember.queryOptions(),
	);

	if (!memberData || !roles.includes(memberData.role as OrgRole)) {
		throw new ForbiddenError(
			`One of the following roles required: ${roles.join(", ")}`,
			{ requiredRole: roles.join(" or ") },
		);
	}
}

/**
 * 基于权限检查角色（用于自定义角色权限验证）
 * @param permissions - 需要的权限
 */
export async function requirePermissionsForRole(
	ctx: BeforeLoadContext,
	permissions: Record<string, string[]>,
): Promise<void> {
	const { organizationId } = await requireActiveOrganization(ctx);

	if (!organizationId) {
		throw new ForbiddenError("No active organization found");
	}

	try {
		const hasPermission = await client.organization.hasPermission({
			organizationId,
			permissions,
		});

		if (hasPermission.error) {
			throw new ForbiddenError("Insufficient permissions for this operation", {
				requiredPermission: {
					resource: Object.keys(permissions)[0],
					actions: permissions[Object.keys(permissions)[0]] || [],
				},
			});
		}
	} catch (error) {
		if (error instanceof ForbiddenError) {
			throw error;
		}
		throw new ForbiddenError("Failed to verify permissions");
	}
}
