import { requireActiveOrganization } from "./base";
import { ForbiddenError } from "./errors";
import type { GuardContext, OrgBuiltInRole } from "./types";

/**
 * 角色层级映射
 * owner > moderator > member
 */
const ROLE_LEVELS = {
	owner: 3,
	moderator: 2,
	member: 1,
} as const;

/**
 * 要求特定的组织角色
 * @param role - 要求的角色
 * @param exact - 是否要求精确匹配（默认 false，允许更高角色）
 */
export async function requireOrgRole(
	ctx: GuardContext,
	role: OrgBuiltInRole,
	exact = false,
): Promise<void> {
	await requireActiveOrganization(ctx);

	// 获取当前用户在活跃组织的角色
	const memberData = await ctx.context.queryClient.ensureQueryData(
		ctx.context.orpc.organization.getActiveMember.queryOptions(),
	);

	if (!memberData) {
		throw new ForbiddenError("You must be a member of this organization", {
			requiredRole: role,
		});
	}

	const currentRole = memberData.role as OrgBuiltInRole;
	const currentLevel = ROLE_LEVELS[currentRole] || 0;
	const requiredLevel = ROLE_LEVELS[role];

	if (exact) {
		// 精确匹配
		if (currentRole !== role) {
			throw new ForbiddenError(`Organization role '${role}' required`, {
				requiredRole: role,
			});
		}
	} else {
		// 层级检查：当前角色必须 >= 要求的角色
		if (currentLevel < requiredLevel) {
			throw new ForbiddenError(
				`Organization role '${role}' or higher required`,
				{ requiredRole: role },
			);
		}
	}
}

/**
 * 快捷方法：要求 Owner 角色
 */
export async function requireOwner(ctx: GuardContext): Promise<void> {
	return requireOrgRole(ctx, "owner", true);
}

/**
 * 快捷方法：要求 Moderator 或更高（包含 Owner）
 */
export async function requireModerator(ctx: GuardContext): Promise<void> {
	return requireOrgRole(ctx, "moderator", false);
}

/**
 * 快捷方法：要求 Member 或更高（包含所有角色）
 */
export async function requireMember(ctx: GuardContext): Promise<void> {
	return requireOrgRole(ctx, "member", false);
}

/**
 * 要求任一角色
 * @param roles - 允许的角色列表
 */
export async function requireAnyOrgRole(
	ctx: GuardContext,
	roles: OrgBuiltInRole[],
): Promise<void> {
	await requireActiveOrganization(ctx);

	const memberData = await ctx.context.queryClient.ensureQueryData(
		ctx.context.orpc.organization.getActiveMember.queryOptions(),
	);

	if (!memberData || !roles.includes(memberData.role as OrgBuiltInRole)) {
		throw new ForbiddenError(
			`One of the following roles required: ${roles.join(", ")}`,
			{ requiredRole: roles.join(" or ") },
		);
	}
}
