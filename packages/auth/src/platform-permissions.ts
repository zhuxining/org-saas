import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

const platformAc = createAccessControl(defaultStatements);

export const platformAdminRoles = ["platform-admin"] as const;

const platformAdmin = platformAc.newRole({
  user: ["list", "get", "ban"],
  session: ["list", "revoke"],
});

const user = platformAc.newRole({});

export { platformAc };
export const platformRoles = { "platform-admin": platformAdmin, user };
