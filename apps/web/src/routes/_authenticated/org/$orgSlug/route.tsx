import { createFileRoute, Outlet } from "@tanstack/react-router";

import { OrgContext } from "@/lib/org-context";
import {
  organizationAccessQueryOptions,
  organizationContextBySlugQueryOptions,
  organizationQueryKeys,
} from "@/lib/query-options";

export const Route = createFileRoute("/_authenticated/org/$orgSlug")({
  beforeLoad: async ({ context, params }) => {
    const user = context.user;
    const queryClient = context.queryClient;
    const resolved = await queryClient.fetchQuery(
      organizationContextBySlugQueryOptions(user.id, params.orgSlug),
    );
    const accessOptions = organizationAccessQueryOptions(user.id, resolved.organization.id);
    queryClient.setQueryData(accessOptions.queryKey, resolved.access);
    const organizationRootKey = organizationQueryKeys.root(user.id);
    queryClient.removeQueries({
      predicate: (query) => {
        const key = query.queryKey;
        if (key[0] !== organizationRootKey[0] || key[1] !== organizationRootKey[1]) return false;
        if (key[2] === "context") return key[3] !== params.orgSlug;
        return typeof key[2] === "string" && key[2] !== resolved.organization.id;
      },
    });

    return {
      user,
      org: {
        ...resolved.organization,
        createdAt: new Date(resolved.organization.createdAt),
      },
      role: resolved.access.role,
      access: resolved.access,
    };
  },
  component: OrganizationContextLayout,
});

function OrganizationContextLayout() {
  const { access, org, role, user } = Route.useRouteContext();

  return (
    <OrgContext.Provider
      value={{
        userId: user.id,
        org,
        role,
        isOwner: access.isOwner,
        access,
      }}
    >
      <Outlet />
    </OrgContext.Provider>
  );
}
