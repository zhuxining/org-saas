import type { OrganizationAccessContext } from "@org-saas/api/contracts/organization";
import { auth } from "@org-saas/auth";
import { queryOptions } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { authClient } from "@/lib/auth-client";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/utils/errors";
import { client } from "@/utils/orpc";

function rethrowAuthorizationError(error: unknown): never {
  const details =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown; status?: unknown; statusCode?: unknown; message?: unknown })
      : undefined;
  const message = typeof details?.message === "string" ? details.message : undefined;
  const code = details?.code;
  const status = details?.status ?? details?.statusCode;

  if (code === "FORBIDDEN" || status === 403) throw new ForbiddenError(message);
  if (code === "NOT_FOUND" || status === 404) throw new NotFoundError(message);
  if (code === "UNAUTHORIZED" || status === 401) throw new UnauthorizedError(message);
  throw error;
}

const getOrganizations = createIsomorphicFn()
  .server(async () =>
    auth.api.listOrganizations({
      headers: getRequestHeaders(),
    }),
  )
  .client(async () => {
    const result = await authClient.organization.list();
    if (result.error) throw new Error(result.error.message ?? "读取组织列表失败");
    return result.data;
  });

const getOrganizationFull = createIsomorphicFn()
  .server(async (organizationId: string) =>
    auth.api.getFullOrganization({
      query: { organizationId },
      headers: getRequestHeaders(),
    }),
  )
  .client(async (organizationId: string) => {
    const result = await authClient.organization.getFullOrganization({
      query: { organizationId },
    });
    if (result.error) rethrowAuthorizationError(result.error);
    return result.data;
  });

export const organizationQueryKeys = {
  root: (userId: string) => ["organization", userId] as const,
  contextBySlug: (userId: string, slug: string) =>
    ["organization", userId, "context", slug] as const,
  access: (userId: string, organizationId: string) =>
    ["organization", userId, organizationId, "access"] as const,
  full: (userId: string, organizationId: string) =>
    ["organization", userId, organizationId, "full"] as const,
  roles: (userId: string, organizationId: string) =>
    ["organization", userId, organizationId, "roles"] as const,
  grantableRoles: (userId: string, organizationId: string, operation: string) =>
    ["organization", userId, organizationId, "grantable-roles", operation] as const,
};

export const organizationContextBySlugQueryOptions = (userId: string, slug: string) =>
  queryOptions({
    queryKey: organizationQueryKeys.contextBySlug(userId, slug),
    queryFn: async () => {
      try {
        return await client.organization.resolveBySlug({ slug });
      } catch (error) {
        rethrowAuthorizationError(error);
      }
    },
  });

export const organizationAccessQueryOptions = (userId: string, organizationId: string) =>
  queryOptions({
    queryKey: organizationQueryKeys.access(userId, organizationId),
    queryFn: async () => {
      try {
        return await client.organization.accessContext({ organizationId });
      } catch (error) {
        rethrowAuthorizationError(error);
      }
    },
    staleTime: 15_000,
  });

export const organizationFullQueryOptions = (userId: string, organizationId: string) =>
  queryOptions({
    queryKey: organizationQueryKeys.full(userId, organizationId),
    queryFn: async () => {
      try {
        return await getOrganizationFull(organizationId);
      } catch (error) {
        rethrowAuthorizationError(error);
      }
    },
  });

export const organizationRolesQueryOptions = (userId: string, organizationId: string) =>
  queryOptions({
    queryKey: organizationQueryKeys.roles(userId, organizationId),
    queryFn: async () => {
      const result = await authClient.organization.listRoles({ query: { organizationId } });
      if (result.error) throw new Error(result.error.message ?? "读取角色失败");
      return result.data;
    },
  });

export const grantableRolesQueryOptions = (
  userId: string,
  organizationId: string,
  operation: "member.create" | "member.update" | "invitation.create",
) =>
  queryOptions({
    queryKey: organizationQueryKeys.grantableRoles(userId, organizationId, operation),
    queryFn: () => client.organization.grantableRoles({ organizationId, operation }),
    staleTime: 15_000,
  });

export const orgFullQueryOptions = organizationFullQueryOptions;

export const orgListQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["organizations", userId],
    queryFn: () => getOrganizations(),
  });

export const platformQueryKeys = {
  root: (userId: string) => ["platform", userId] as const,
  users: (userId: string, input: { search?: string; limit: number; offset: number }) =>
    ["platform", userId, "users", input] as const,
  userSessions: (userId: string, targetUserId: string) =>
    ["platform", userId, "user-sessions", targetUserId] as const,
};

export const platformUsersQueryOptions = (
  userId: string,
  input: { search?: string; limit: number; offset: number },
) =>
  queryOptions({
    queryKey: platformQueryKeys.users(userId, input),
    queryFn: () => client.platform.listUsers(input),
  });

export const platformUserSessionsQueryOptions = (userId: string, targetUserId: string) =>
  queryOptions({
    queryKey: platformQueryKeys.userSessions(userId, targetUserId),
    queryFn: async () => {
      const result = await authClient.admin.listUserSessions({ userId: targetUserId });
      if (result.error) throw new Error(result.error.message ?? "读取用户会话失败");
      return result.data.sessions;
    },
  });

export const platformOrganizationsQueryOptions = (
  userId: string,
  input: { search?: string; limit: number; offset: number },
) =>
  queryOptions({
    queryKey: ["platform", userId, "organizations", input] as const,
    queryFn: () => client.platform.listOrganizations(input),
  });

export type OrganizationAccess = OrganizationAccessContext;
