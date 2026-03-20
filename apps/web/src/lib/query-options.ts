import { queryOptions } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

export const orgFullQueryOptions = (orgId: string) =>
	queryOptions({
		queryKey: ["org-full", orgId],
		queryFn: () =>
			authClient.organization.getFullOrganization({
				query: { organizationId: orgId },
			}),
	});

export const orgListQueryOptions = () =>
	queryOptions({
		queryKey: ["organizations"],
		queryFn: () => authClient.organization.list(),
	});
