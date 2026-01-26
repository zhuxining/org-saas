import { createAccessControl } from "better-auth/plugins/access";

/**
 * Complete permission statement for the SaaS platform
 *
 * Naming Convention: `<resource>:<action>`
 * - Resource: Noun representing the entity (organization, member, team, project)
 * - Action: Verb representing the operation (create, update, delete, view, manage)
 */
export const statement = {
	// Core Organization permissions
	organization: [
		"update",
		"delete",
		"manage-settings",
		"view-analytics",
	] as const,

	// Member management permissions
	member: ["create", "update", "delete", "update-role", "view"] as const,

	// Invitation permissions
	invitation: ["create", "cancel", "resend", "view"] as const,

	// Team permissions
	team: ["create", "update", "delete", "view", "manage-members"] as const,

	// Custom business domains (extensible)
	project: ["create", "update", "delete", "view", "share", "archive"] as const,
	billing: ["view", "update", "manage", "export"] as const,
	tickets: ["create", "update", "delete", "view", "assign"] as const,

	// Access Control management (for creating custom roles)
	ac: ["create", "update", "delete", "view"] as const,
} as const;

/**
 * Create the access control instance
 * This is the SINGLE SOURCE OF TRUTH for all permissions
 */
export const ac = createAccessControl(statement);

/**
 * Default role definitions with explicit permissions
 *
 * 注意: 组织角色避免使用 "admin" 以区分系统管理员
 */
export const defaultRoles = {
	/**
	 * ORGANIZATION OWNER
	 * 完全控制组织
	 */
	owner: ac.newRole({
		organization: ["update", "delete", "manage-settings", "view-analytics"],
		member: ["create", "update", "delete", "update-role", "view"],
		invitation: ["create", "cancel", "resend", "view"],
		team: ["create", "update", "delete", "view", "manage-members"],
		project: ["create", "update", "delete", "view", "share", "archive"],
		billing: ["view", "update", "manage", "export"],
		tickets: ["create", "update", "delete", "view", "assign"],
		ac: ["create", "update", "delete", "view"], // 可以创建自定义角色
	}),

	/**
	 * ORGANIZATION MODERATOR
	 * 管理权限（除删除组织和管理角色外）
	 * 使用 "moderator" 而非 "admin" 以区分系统管理员
	 */
	moderator: ac.newRole({
		organization: ["update", "manage-settings", "view-analytics"],
		member: ["create", "update", "delete", "view"],
		invitation: ["create", "cancel", "resend", "view"],
		team: ["create", "update", "delete", "view", "manage-members"],
		project: ["create", "update", "delete", "view", "share", "archive"],
		billing: ["view", "update", "export"],
		tickets: ["create", "update", "delete", "view", "assign"],
	}),

	/**
	 * ORGANIZATION MEMBER
	 * 只读权限 - 可以查看和处理分配的任务
	 */
	member: ac.newRole({
		organization: ["view-analytics"],
		member: ["view"],
		team: ["view"],
		project: ["view"],
		billing: ["view"],
		tickets: ["create", "view"],
	}),
} as const;

/**
 * Type exports for TypeScript inference
 */
export type PermissionStatement = typeof statement;
export type RoleName = keyof typeof defaultRoles;
export type Resource = keyof PermissionStatement;
export type Action<R extends Resource> = PermissionStatement[R][number];
