import { describe, expect, it } from "vite-plus/test";

import { roles } from "./permissions";
import { platformRoles } from "./platform-permissions";

describe("organization role permissions", () => {
  it("does not grant management writes to members", () => {
    expect(roles.member.authorize({ organization: ["update"] }).success).toBe(false);
    expect(roles.member.authorize({ member: ["create", "update", "delete"] }).success).toBe(false);
    expect(roles.member.authorize({ invitation: ["create", "cancel"] }).success).toBe(false);
    expect(roles.member.authorize({ team: ["create", "update", "delete"] }).success).toBe(false);
    expect(roles.member.authorize({ ac: ["create", "update", "delete"] }).success).toBe(false);
  });

  it("keeps dynamic role definition writes away from organization admins", () => {
    expect(roles.admin.authorize({ ac: ["create", "update", "delete"] }).success).toBe(false);
    expect(roles.admin.authorize({ member: ["create", "update", "delete"] }).success).toBe(true);
  });

  it("limits owners to approved organization management permissions", () => {
    expect(roles.owner.authorize({ organization: ["update"] }).success).toBe(true);
    expect(roles.owner.authorize({ member: ["create", "update", "delete"] }).success).toBe(true);
    expect(roles.owner.authorize({ invitation: ["create", "cancel"] }).success).toBe(true);
    expect(roles.owner.authorize({ team: ["create", "update", "delete"] }).success).toBe(true);
    expect(roles.owner.authorize({ ac: ["create", "read", "update", "delete"] }).success).toBe(
      true,
    );
    expect(roles.owner.authorize({ organization: ["delete"] }).success).toBe(false);
  });
});

describe("platform administrator permissions", () => {
  it("keeps the default user without administrative permissions", () => {
    expect(platformRoles.user.authorize({ user: ["list", "get", "ban"] }).success).toBe(false);
    expect(platformRoles.user.authorize({ session: ["list", "revoke"] }).success).toBe(false);
  });

  it("grants only basic user access, bans, and session inspection or revocation", () => {
    const role = platformRoles["platform-admin"];

    expect(role.authorize({ user: ["list", "get", "ban"] }).success).toBe(true);
    expect(role.authorize({ session: ["list", "revoke"] }).success).toBe(true);
    expect(role.authorize({ user: ["impersonate"] }).success).toBe(false);
    expect(role.authorize({ user: ["set-role"] }).success).toBe(false);
    expect(
      role.authorize({ user: ["delete", "update", "set-password", "set-email"] }).success,
    ).toBe(false);
    expect(role.authorize({ session: ["delete"] }).success).toBe(false);
  });
});
