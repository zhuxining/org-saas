import type { Context } from "@org-sass/api/context";
import { redirect } from "@tanstack/react-router";
import type { RouterAppContext } from "@/routes/__root";
import { orpc } from "./orpc";

/**
 * 路由守卫上下文 - TanStack Router beforeLoad/loader 的 context
 */
type BeforeLoadContext = {
	context: RouterAppContext;
};

// 从 API Context 提取 session 用户类型，并添加组织插件字段
export type SessionUser = NonNullable<Context["session"]>["user"] & {
	activeOrganizationId?: string | null;
	activeTeamId?: string | null;
};

/**
 * 要求用户已登录
 * @returns 用户的 session 数据
 * @throws 重定向到登录页（如果未登录）
 */
export async function requireSession(
	ctx: BeforeLoadContext,
): Promise<{ message: string; user: SessionUser }> {
	// Use fetchQuery to always get fresh session data, bypassing cache
	const result = await ctx.context.queryClient.fetchQuery(
		orpc.privateData.queryOptions(),
	);

	if (!result?.user) {
		throw redirect({
			to: "/login",
			search: {
				redirect: location.href,
			},
		});
	}

	return result;
}

/**
 * 要求用户有活跃组织
 * @returns 用户的 session 数据
 * @throws 重定向到首页（如果没有活跃组织）
 */
export async function requireActiveOrg(
	ctx: BeforeLoadContext,
): Promise<{ message: string; user: SessionUser }> {
	const session = await requireSession(ctx);

	if (!session.user.activeOrganizationId) {
		throw redirect({
			to: "/",
		});
	}

	return session;
}

/**
 * 要求用户是管理员
 * @returns 用户的 session 数据
 * @throws 重定向到组织仪表盘（如果不是管理员）
 */
export async function requireAdmin(
	ctx: BeforeLoadContext,
): Promise<{ message: string; user: SessionUser }> {
	const session = await requireSession(ctx);

	const role = session.user.role;
	if (
		!role ||
		(Array.isArray(role) && !role.includes("admin")) ||
		(typeof role === "string" && role !== "admin")
	) {
		throw redirect({
			to: "/org/dashboard",
		});
	}

	return session;
}
