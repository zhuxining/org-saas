import type { Context } from "@org-sass/api/context";
import type { Action, Resource, RoleName } from "@org-sass/auth/permissions";
import type { RouterAppContext } from "@/routes/__root";

/**
 * 扩展 Session 用户类型，包含 Better-Auth 组织插件字段
 */
export type SessionUser = NonNullable<Context["session"]>["user"] & {
	activeOrganizationId?: string | null;
	activeTeamId?: string | null;
};

/**
 * 守卫上下文
 */
export interface GuardContext {
	context: RouterAppContext;
	location?: { href: string };
}

/**
 * BeforeLoad 上下文（简化版，用于权限守卫）
 */
export type BeforeLoadContext = GuardContext;

/**
 * 守卫结果
 */
export interface GuardResult {
	user: SessionUser;
	memberId?: string;
	organizationId?: string;
}

/**
 * 系统角色（从 Better-Auth Admin Plugin）
 */
export type SystemRole = "admin" | "user";

/**
 * 组织内置角色（从 auth 包导入）
 */
export type OrgBuiltInRole = RoleName; // "owner" | "moderator" | "member"

/**
 * 组织角色（包含自定义角色）
 */
export type OrgRole = OrgBuiltInRole | string;

/**
 * 角色层级定义
 * owner > moderator > member
 */
export const ROLE_HIERARCHY: Record<OrgBuiltInRole, number> = {
	owner: 3,
	moderator: 2,
	member: 1,
} as const;

/**
 * 权限资源（从 auth 包重新导出）
 */
export type PermissionResource = Resource;

/**
 * 权限动作（从 auth 包重新导出）
 */
export type PermissionAction<
	T extends PermissionResource = PermissionResource,
> = Action<T>;
