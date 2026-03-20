import { authClient } from "@/lib/auth-client";
import { useOrgContext } from "@/lib/org-context";

type OrgRole = "admin" | "member" | "owner";

export function usePermission(permissions: Record<string, string[]>): boolean {
	const { role } = useOrgContext();
	return authClient.organization.checkRolePermission({
		role: role as OrgRole,
		permissions,
	});
}
