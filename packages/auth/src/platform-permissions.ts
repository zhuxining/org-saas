import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

const platformAc = createAccessControl(defaultStatements);

export const platformAdminRoles = ["platform-admin"] as const;

export function hasPlatformAdminRole(role: unknown): boolean {
  return (
    typeof role === "string" &&
    role
      .split(",")
      .map((entry) => entry.trim())
      .some((entry) => platformAdminRoles.includes(entry as (typeof platformAdminRoles)[number]))
  );
}

const platformAdmin = platformAc.newRole({
  user: ["list", "get", "ban"],
  session: ["list", "revoke"],
});

const user = platformAc.newRole({});

export { platformAc };
export const platformRoles = { "platform-admin": platformAdmin, user };
