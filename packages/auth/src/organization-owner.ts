type OwnerRoleMembership = { role?: unknown };

export type OrganizationOwnerState<T> =
  | { status: "valid"; owner: T }
  | { status: "invalid"; reason: "missing" | "multiple" | "combined-role" };

export function hasOrganizationOwnerRole(role: unknown): boolean {
  return (
    typeof role === "string" &&
    role
      .split(",")
      .map((entry) => entry.trim())
      .includes("owner")
  );
}

export function resolveOrganizationOwner<T extends OwnerRoleMembership>(
  memberships: readonly T[],
): OrganizationOwnerState<T> {
  const owners = memberships.filter((membership) => hasOrganizationOwnerRole(membership.role));
  if (owners.length === 0) return { status: "invalid", reason: "missing" };
  if (owners.length !== 1) return { status: "invalid", reason: "multiple" };

  const owner = owners[0];
  if (!owner || owner.role !== "owner") {
    return { status: "invalid", reason: "combined-role" };
  }

  return { status: "valid", owner };
}
