import { getSession } from "@/functions/get-session";
import { client } from "@/utils/orpc";
import { ForbiddenError, UnauthorizedError } from "./errors";
import type { GuardContext, GuardResult, SessionUser } from "./types";

/**
 * 要求用户已登录
 * @throws UnauthorizedError 如果未登录（会转换为重定向）
 */
export async function requireSession(
	_ctx: GuardContext,
): Promise<{ user: SessionUser }> {
	const session = await getSession();

	if (!session?.user) {
		throw new UnauthorizedError(
			"You must be logged in to access this resource",
		).toRedirect();
	}

	return {
		user: session.user as SessionUser,
	};
}

/**
 * 要求用户有活跃的组织
 * 如果用户没有活跃组织，会自动使用第一个可用组织
 * @throws ForbiddenError 如果用户不属于任何组织
 */
export async function requireActiveOrganization(
	ctx: GuardContext,
): Promise<GuardResult> {
	const session = await requireSession(ctx);
	let organizationId = session.user.activeOrganizationId;

	// 如果没有活跃组织，直接使用第一个组织（无需设置 cookie）
	if (!organizationId) {
		// 使用直接查询数据库的 API，绕过 Better-Auth SSR 限制
		const orgs = await ctx.context.queryClient.ensureQueryData(
			ctx.context.orpc.organization.listMyOrganizations.queryOptions(),
		);

		if (orgs && orgs.length > 0) {
			// 直接使用第一个组织的 ID
			organizationId = orgs[0].id;

			// 异步设置活跃组织（不影响当前请求）
			// 这样在后续请求中 activeOrganizationId 就会被设置
			client.organization
				.setActiveOrganization({
					organizationId: orgs[0].id,
				})
				.catch((err) => {
					console.error("Failed to set active organization:", err);
				});
		}
	}

	if (!organizationId) {
		throw new ForbiddenError(
			"You must be a member of an organization to access this resource",
			{ requiredRole: "any_organization" },
		);
	}

	return {
		user: session.user,
		organizationId,
	};
}

/**
 * 要求特定的活跃组织
 * @param organizationId - 要求的组织 ID
 * @throws ForbiddenError 如果活跃组织不匹配
 */
export async function requireSpecificOrganization(
	ctx: GuardContext,
	organizationId: string,
): Promise<GuardResult> {
	const result = await requireActiveOrganization(ctx);

	if (result.organizationId !== organizationId) {
		throw new ForbiddenError(
			"You must be a member of this organization to access it",
		);
	}

	return result;
}

/**
 * 要求活跃组织或管理员权限
 * Admin 用户可以访问所有组织，普通用户需要有活跃组织
 * @throws ForbiddenError 如果普通用户不属于任何组织
 */
export async function requireActiveOrganizationOrAdmin(
	ctx: GuardContext,
): Promise<GuardResult & { isAdmin: boolean }> {
	const session = await requireSession(ctx);
	const isAdmin = session.user.role === "admin";
	let organizationId = session.user.activeOrganizationId;

	// Admin 用户不需要是组织成员
	if (isAdmin) {
		return {
			user: session.user,
			organizationId: organizationId || undefined,
			isAdmin: true,
		};
	}

	// 普通用户需要有活跃组织
	if (!organizationId) {
		// 使用直接查询数据库的 API，绕过 Better-Auth SSR 限制
		const orgs = await ctx.context.queryClient.ensureQueryData(
			ctx.context.orpc.organization.listMyOrganizations.queryOptions(),
		);

		if (orgs && orgs.length > 0) {
			// 自动设置为第一个组织
			await client.organization.setActiveOrganization({
				organizationId: orgs[0].id,
			});

			// 刷新 session 数据
			const updatedSession = await getSession();
			organizationId = (updatedSession?.user as SessionUser)
				?.activeOrganizationId;
		}
	}

	if (!organizationId) {
		throw new ForbiddenError(
			"You must be a member of an organization to access this resource",
			{ requiredRole: "any_organization" },
		);
	}

	return {
		user: session.user,
		organizationId,
		isAdmin: false,
	};
}
