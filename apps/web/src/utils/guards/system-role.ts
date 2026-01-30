import { requireSession } from "./base";
import { ForbiddenError } from "./errors";
import type { GuardContext, SessionUser, SystemRole } from "./types";

/**
 * 要求系统管理员角色
 * @throws ForbiddenError 如果不是系统管理员
 */
export async function requireSystemAdmin(
	ctx: GuardContext,
): Promise<{ user: SessionUser }> {
	const result = await requireSession(ctx);
	const role = result.user.role;

	if (!role || role !== "admin") {
		throw new ForbiddenError("System administrator access required", {
			requiredRole: "admin",
		});
	}

	return result;
}

/**
 * 要求系统角色或更高
 * @param role - 要求的最低角色
 */
export async function requireSystemRole(
	ctx: GuardContext,
	role: SystemRole,
): Promise<{ user: SessionUser }> {
	const result = await requireSession(ctx);
	const userRole = result.user.role;

	// admin 可以访问所有内容
	if (userRole === "admin") {
		return result;
	}

	if (userRole !== role) {
		throw new ForbiddenError(`System role '${role}' or higher required`, {
			requiredRole: role,
		});
	}

	return result;
}
