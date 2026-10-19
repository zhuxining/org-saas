export const organizationQueryKeys = {
  root: (userId: string) => ["organization", userId] as const,
  contextBySlug: (userId: string, slug: string) =>
    ["organization", userId, "context", slug] as const,
  access: (userId: string, organizationId: string) =>
    ["organization", userId, organizationId, "access"] as const,
  full: (userId: string, organizationId: string) =>
    ["organization", userId, organizationId, "full"] as const,
  dashboardStats: (userId: string, organizationId: string) =>
    ["organization", userId, organizationId, "dashboard-stats"] as const,
  roles: (userId: string, organizationId: string) =>
    ["organization", userId, organizationId, "roles"] as const,
  grantableRoles: (userId: string, organizationId: string, operation: string) =>
    ["organization", userId, organizationId, "grantable-roles", operation] as const,
  archivedStatus: (userId: string, organizationId: string) =>
    ["organization", userId, organizationId, "archived-status"] as const,
};

export const organizationListQueryKey = (userId: string) => ["organizations", userId] as const;

export const platformQueryKeys = {
  root: (userId: string) => ["platform", userId] as const,
  users: (userId: string, input: { search?: string; limit: number; offset: number }) =>
    ["platform", userId, "users", input] as const,
  userSessions: (userId: string, targetUserId: string) =>
    ["platform", userId, "user-sessions", targetUserId] as const,
  organizations: (userId: string, input: { search?: string; limit: number; offset: number }) =>
    ["platform", userId, "organizations", input] as const,
};
