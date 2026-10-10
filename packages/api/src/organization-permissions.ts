import { roles } from "@org-saas/auth/permissions";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePermissionMap(value: unknown): Record<string, string[]> {
  let parsed = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return {};
    }
  }
  if (!isRecord(parsed)) return {};

  const entries = Object.entries(parsed);
  if (
    entries.some(
      ([, actions]) =>
        !Array.isArray(actions) || actions.some((action) => typeof action !== "string"),
    )
  ) {
    return {};
  }
  return parsed as Record<string, string[]>;
}

export function getRoleStatements(role: string, customPermission?: unknown) {
  const staticStatements = Object.hasOwn(roles, role)
    ? (roles[role as keyof typeof roles].statements as Record<string, string[]>)
    : {};
  const dynamicStatements = parsePermissionMap(customPermission);
  const result = { ...staticStatements };
  for (const [resource, actions] of Object.entries(dynamicStatements)) {
    result[resource] = [...new Set([...(result[resource] ?? []), ...actions])];
  }
  return result;
}

export function roleAllows(
  statements: Record<string, string[]>,
  resource: string,
  action: string,
): boolean {
  return statements[resource]?.includes(action) ?? false;
}
