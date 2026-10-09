import type { OrganizationAccessContext } from "@org-saas/api/contracts/organization";
import type { auth } from "@org-saas/auth";
import { platformAdminRoles } from "@org-saas/auth/platform-permissions";

import { getSession } from "@/functions/auth.fn";
import type { RouterAppContext } from "@/routes/__root";
import { ForbiddenError, UnauthorizedError } from "@/utils/errors";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function requireSession(_ctx: {
  context: RouterAppContext;
  location?: { href: string };
}): Promise<{
  user: NonNullable<NonNullable<Session>["user"]>;
  session: NonNullable<Session>;
}> {
  const session = await getSession();

  if (!session?.user) {
    throw new UnauthorizedError("您需要登录才能访问此页面");
  }

  return {
    user: session.user,
    session,
  };
}

export function requireOrgRole(role: string, allowedRoles: string[]): void {
  if (!allowedRoles.includes(role)) {
    throw new ForbiddenError("您没有权限访问此页面", {
      requiredRole: allowedRoles.join(" | "),
    });
  }
}

export function requireAdmin(role: string): void {
  requireOrgRole(role, ["admin", "owner"]);
}

export function requireOwner(role: string): void {
  requireOrgRole(role, ["owner"]);
}

export function requireOrgOperation(
  access: OrganizationAccessContext,
  resource: string,
  action: string,
): void {
  const operations = access.operations as Record<string, Record<string, boolean>>;
  if (operations[resource]?.[action] !== true) {
    throw new ForbiddenError("您没有权限执行此组织操作", {
      requiredPermission: { resource, actions: [action] },
    });
  }
}

export function requirePlatformAdmin(role: string | null | undefined): void {
  const roles = role?.split(",").map((item) => item.trim()) ?? [];
  if (!platformAdminRoles.some((adminRole) => roles.includes(adminRole))) {
    throw new ForbiddenError("您没有平台管理权限");
  }
}
