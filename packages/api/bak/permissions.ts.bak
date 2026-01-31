import { auth } from "@org-sass/auth";
import { ORPCError } from "@orpc/server";
import type { Context } from "../context";

/**
 * Permission check result
 */
export interface PermissionCheckResult {
	granted: boolean;
	reason?: string;
}

/**
 * Check if user has a specific permission in the active organization
 *
 * @param context - oRPC context
 * @param resource - The resource to check (e.g., "organization", "member", "project")
 * @param actions - Array of actions to check (e.g., ["update", "delete"])
 * @param organizationId - Optional organization ID (defaults to active organization)
 * @returns Permission check result
 */
export async function checkPermission(
	context: Context,
	resource: string,
	actions: string[],
	organizationId?: string,
): Promise<PermissionCheckResult> {
	if (!context.session?.user) {
		return { granted: false, reason: "Not authenticated" };
	}

	try {
		const result = await auth.api.hasPermission({
			body: {
				organizationId:
					organizationId ||
					// biome-ignore lint/suspicious/noExplicitAny: <better-auth>
					(context.session.user as any).activeOrganizationId ||
					undefined,
				permissions: {
					[resource]: actions,
				},
			},
			headers: context.headers,
		});

		// Better-Auth returns { error } if not permitted
		if (result.error) {
			// biome-ignore lint/suspicious/noExplicitAny: <better-auth>
			return { granted: false, reason: (result.error as any).message };
		}

		return { granted: true };
	} catch (error) {
		return {
			granted: false,
			reason: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Require a specific permission or throw error
 *
 * @param context - oRPC context
 * @param resource - The resource to check
 * @param actions - Array of actions to require
 * @param organizationId - Optional organization ID
 * @throws ORPCError if permission is denied
 */
export async function requirePermission(
	context: Context,
	resource: string,
	actions: string[],
	organizationId?: string,
): Promise<void> {
	const result = await checkPermission(
		context,
		resource,
		actions,
		organizationId,
	);

	if (!result.granted) {
		throw new ORPCError("FORBIDDEN", {
			message:
				result.reason ||
				`Missing required permission: ${resource}:${actions.join(", ")}`,
		});
	}
}

/**
 * Check if user is owner of an organization
 */
export async function isOrganizationOwner(
	context: Context,
	organizationId: string,
): Promise<boolean> {
	if (!context.session?.user) return false;

	// Get active member info
	const result = await auth.api.getActiveMember({
		headers: context.headers as Headers,
	});

	// Check if user is owner of the target organization
	return result?.role === "owner" && result.organizationId === organizationId;
}

/**
 * Require organization ownership or throw error
 */
export async function requireOrganizationOwner(
	context: Context,
	organizationId: string,
): Promise<void> {
	const isOwner = await isOrganizationOwner(context, organizationId);

	if (!isOwner) {
		throw new ORPCError("FORBIDDEN", {
			message: "Organization owner access required",
		});
	}
}

/**
 * Batch permission check for multiple resources
 */
export async function checkPermissions(
	context: Context,
	permissions: Record<string, string[]>,
	organizationId?: string,
): Promise<Record<string, PermissionCheckResult>> {
	const results: Record<string, PermissionCheckResult> = {};

	for (const [resource, actions] of Object.entries(permissions)) {
		const result = await checkPermission(
			context,
			resource,
			actions,
			organizationId,
		);
		results[`${resource}:${actions.join(",")}`] = result;
	}

	return results;
}
