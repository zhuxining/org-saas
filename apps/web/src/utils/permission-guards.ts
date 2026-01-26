import { redirect } from "@tanstack/react-router";
import type { RouterAppContext } from "@/routes/__root";
import { client, orpc } from "./orpc";
import { requireActiveOrg } from "./route-guards";

type BeforeLoadContext = {
	context: RouterAppContext;
};

/**
 * Permission check for route guards
 */
async function checkPermissionClient(
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
 * @param redirectTo - Path to redirect if permission denied (default: /org/dashboard)
 */
export async function requirePermission(
	ctx: BeforeLoadContext,
	resource: string,
	actions: string[],
	redirectTo = "/org/dashboard",
): Promise<void> {
	const session = await requireActiveOrg(ctx);
	const organizationId = session.user.activeOrganizationId;

	if (!organizationId) {
		throw redirect({ to: "/" });
	}

	const hasPermission = await checkPermissionClient(organizationId, {
		[resource]: actions,
	});

	if (!hasPermission) {
		throw redirect({ to: redirectTo });
	}
}

/**
 * Require owner role for route access
 */
export async function requireOwner(
	ctx: BeforeLoadContext,
	redirectTo = "/org/dashboard",
): Promise<void> {
	const session = await requireActiveOrg(ctx);
	const organizationId = session.user.activeOrganizationId;

	if (!organizationId) {
		throw redirect({ to: "/" });
	}

	// Check if user is owner
	const memberData = await ctx.context.queryClient.ensureQueryData(
		orpc.organization.getActiveMember.queryOptions(),
	);

	if (memberData?.role !== "owner") {
		throw redirect({ to: redirectTo });
	}
}
