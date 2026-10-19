import type { QueryClient, QueryKey } from "@tanstack/react-query";

import { organizationListQueryKey, organizationQueryKeys } from "./organization-query-keys";

export type OrganizationCacheChange =
  | "invitation-created"
  | "member-removed"
  | "organization-left"
  | "invitation-canceled"
  | "member-role-updated"
  | "ownership-transferred"
  | "role-definition-changed"
  | "team-member-changed"
  | "team-created"
  | "team-updated"
  | "team-deleted"
  | "organization-settings-changed"
  | "organization-archived"
  | "organization-restored";

type CacheEffect =
  | { kind: "invalidate"; queryKey: QueryKey }
  | { kind: "remove"; queryKey: QueryKey };

function getCacheEffects(
  userId: string,
  organizationId: string,
  change: OrganizationCacheChange,
): CacheEffect[] {
  const full = organizationQueryKeys.full(userId, organizationId);
  const dashboardStats = organizationQueryKeys.dashboardStats(userId, organizationId);
  const access = organizationQueryKeys.access(userId, organizationId);
  const roles = organizationQueryKeys.roles(userId, organizationId);
  const memberGrant = organizationQueryKeys.grantableRoles(userId, organizationId, "member.update");
  const invitationGrant = organizationQueryKeys.grantableRoles(
    userId,
    organizationId,
    "invitation.create",
  );
  const root = organizationQueryKeys.root(userId);
  const organizationList = organizationListQueryKey(userId);

  switch (change) {
    case "invitation-created":
      return [full, dashboardStats].map((queryKey) => ({ kind: "invalidate", queryKey }));
    case "member-removed":
    case "invitation-canceled":
      return [full, access, memberGrant, invitationGrant, dashboardStats].map((queryKey) => ({
        kind: "invalidate",
        queryKey,
      }));
    case "member-role-updated":
      return [full, access, memberGrant, invitationGrant].map((queryKey) => ({
        kind: "invalidate",
        queryKey,
      }));
    case "ownership-transferred":
      return [
        full,
        access,
        roles,
        memberGrant,
        invitationGrant,
        dashboardStats,
        organizationList,
      ].map((queryKey) => ({
        kind: "invalidate",
        queryKey,
      }));
    case "role-definition-changed":
      return [roles, full, access, memberGrant, invitationGrant, dashboardStats].map(
        (queryKey) => ({
          kind: "invalidate",
          queryKey,
        }),
      );
    case "team-member-changed":
      return [{ kind: "invalidate", queryKey: full }];
    case "team-created":
    case "team-deleted":
      return [full, access, dashboardStats].map((queryKey) => ({ kind: "invalidate", queryKey }));
    case "team-updated":
      return [full, access].map((queryKey) => ({ kind: "invalidate", queryKey }));
    case "organization-settings-changed":
    case "organization-archived":
    case "organization-restored":
      return [root, organizationList].map((queryKey) => ({ kind: "invalidate", queryKey }));
    case "organization-left":
      return [
        { kind: "remove", queryKey: root },
        { kind: "invalidate", queryKey: organizationList },
      ];
  }
}

export async function syncOrganizationListCacheAfterChange(
  queryClient: QueryClient,
  userId: string,
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: organizationListQueryKey(userId) });
}

export async function syncOrganizationCacheAfterChange(
  queryClient: QueryClient,
  userId: string,
  organizationId: string,
  change: OrganizationCacheChange,
): Promise<void> {
  await Promise.all(
    getCacheEffects(userId, organizationId, change).map(({ kind, queryKey }) =>
      kind === "remove"
        ? Promise.resolve(queryClient.removeQueries({ queryKey }))
        : queryClient.invalidateQueries({ queryKey }),
    ),
  );
}
