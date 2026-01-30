import { client } from "@/utils/orpc";
import { requireActiveOrganization } from "./base";
import { ForbiddenError } from "./errors";
import type { BeforeLoadContext, PermissionResource } from "./types";

/**
 * Permission check for route guards
 */
async function checkPermission(
	organizationId: string,
	permissions: Record<string, string[]>,
): Promise<boolean> {
	try {
		const result = await client.organization.hasPermission({
			organizationId,
			permissions,
		});
		return !result.error;
	} catch {
		return false;
	}
}

/**
 * Require organization-level permission for route access
 *
 * @param ctx - Route context
 * @param resource - Resource to check (e.g., "organization", "project")
 * @param actions - Actions required (e.g., ["update", "delete"])
 * @throws ForbiddenError if permission denied
 */
export async function requirePermission(
	ctx: BeforeLoadContext,
	resource: PermissionResource,
	actions: string[],
): Promise<void> {
	const { organizationId } = await requireActiveOrganization(ctx);

	if (!organizationId) {
		throw new ForbiddenError("No active organization found");
	}

	const hasPermission = await checkPermission(organizationId, {
		[resource]: actions,
	});

	if (!hasPermission) {
		throw new ForbiddenError(
			`Missing required permission: ${resource}:${actions.join(", ")}`,
			{
				requiredPermission: {
					resource,
					actions,
				},
			},
		);
	}
}

/**
 * Require any of the specified permissions
 * @param permissions - Permissions to check { resource: [actions] }
 */
export async function requireAnyPermission(
	ctx: BeforeLoadContext,
	permissions: Partial<Record<PermissionResource, string[]>>,
): Promise<void> {
	const { organizationId } = await requireActiveOrganization(ctx);

	if (!organizationId) {
		throw new ForbiddenError("No active organization found");
	}

	for (const [resource, actions] of Object.entries(permissions)) {
		const hasPermission = await checkPermission(organizationId, {
			[resource]: actions,
		});
		if (hasPermission) {
			return; // 有任一权限即可
		}
	}

	throw new ForbiddenError(
		`At least one of the following permissions required: ${Object.keys(permissions).join(", ")}`,
		{
			requiredPermission: {
				resource: Object.keys(permissions)[0],
				actions:
					permissions[Object.keys(permissions)[0] as PermissionResource] || [],
			},
		},
	);
}

/**
 * Require all permissions
 * @param permissions - Permissions to check { resource: [actions] }
 */
export async function requireAllPermissions(
	ctx: BeforeLoadContext,
	permissions: Partial<Record<PermissionResource, string[]>>,
): Promise<void> {
	for (const [resource, actions] of Object.entries(permissions)) {
		await requirePermission(ctx, resource as PermissionResource, actions);
	}
}
