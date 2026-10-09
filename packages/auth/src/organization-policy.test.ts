import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { organization } from "better-auth/plugins/organization";
import type { OrganizationOptions } from "better-auth/plugins/organization";
import { describe, expect, it } from "vite-plus/test";

import { createOrganizationPolicyPlugin, hasSingleRole } from "./organization-policy";
import { withOrganizationMutationTransactions } from "./organization-transaction";
import { ac, roles } from "./permissions";

const organizationOptions = {
  allowUserToCreateOrganization: true,
  disableOrganizationDeletion: true,
  schema: {
    organization: {
      additionalFields: {
        archivedAt: {
          type: "date",
          required: false,
          input: false,
          returned: false,
        },
        ownerMutationVersion: {
          type: "number",
          required: true,
          defaultValue: 0,
          input: false,
          returned: false,
        },
      },
    },
  },
  teams: { enabled: true },
  ac,
  dynamicAccessControl: { enabled: true },
  roles,
} as const satisfies OrganizationOptions;

function createTestAuth() {
  const memoryDb: Parameters<typeof memoryAdapter>[0] = {
    user: [],
    session: [],
    account: [],
    verification: [],
    organization: [],
    member: [],
    invitation: [],
    team: [],
    teamMember: [],
    organizationRole: [],
  };
  const auth = withOrganizationMutationTransactions(
    betterAuth({
      baseURL: "http://localhost:3000",
      secret: "test-secret-that-is-long-enough-for-better-auth",
      database: memoryAdapter(memoryDb),
      emailAndPassword: { enabled: true },
      plugins: [
        organization(organizationOptions),
        createOrganizationPolicyPlugin(organizationOptions),
      ],
    }),
  );
  return { auth, memoryDb };
}

type TestAuth = ReturnType<typeof createTestAuth>["auth"];

async function signUp(auth: TestAuth, email: string) {
  const response = await auth.handler(
    new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ email, password: "test-password-123", name: email }),
    }),
  );
  if (!response.ok) throw new Error(`Sign up failed: ${response.status}`);
  const body = (await response.json()) as { user: { id: string } };
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Sign up did not set a session cookie");
  return { userId: body.user.id, headers: new Headers({ cookie }) };
}

async function post(auth: TestAuth, path: string, headers: Headers, body: unknown) {
  return auth.handler(
    new Request(`http://localhost:3000/api/auth${path}`, {
      method: "POST",
      headers: new Headers({
        cookie: headers.get("cookie") ?? "",
        "content-type": "application/json",
        origin: "http://localhost:3000",
      }),
      body: JSON.stringify(body),
    }),
  );
}

async function createOrganization(auth: TestAuth, headers: Headers) {
  const response = await post(auth, "/organization/create", headers, {
    name: "Test organization",
    slug: `test-${crypto.randomUUID()}`,
  });
  if (!response.ok) throw new Error(`Organization creation failed: ${response.status}`);
  const body = (await response.json()) as { id: string };
  return body.id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

describe("organization role assignment policy", () => {
  it("accepts one role name", () => {
    expect(hasSingleRole("member")).toBe(true);
  });

  it("rejects role arrays, empty names, whitespace, and comma-delimited roles", () => {
    expect(hasSingleRole(["member", "admin"])).toBe(false);
    expect(hasSingleRole("")).toBe(false);
    expect(hasSingleRole(" member ")).toBe(false);
    expect(hasSingleRole("member,admin")).toBe(false);
  });
});

describe("organization owner transfer", () => {
  it("transfers ownership through HTTP and auth.api as one role change", async () => {
    const { auth } = createTestAuth();
    const owner = await signUp(auth, "owner-transfer@example.test");
    const target = await signUp(auth, "target-transfer@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    const member = await auth.api.addMember({
      body: { organizationId, userId: target.userId, role: "member" },
      headers: owner.headers,
    });

    const httpResponse = await post(auth, "/organization/transfer-ownership", owner.headers, {
      organizationId,
      newOwnerMemberId: member.id,
      formerOwnerRole: "admin",
    });
    expect(httpResponse.ok).toBe(true);
    expect(
      (await auth.api.listMembers({ query: { organizationId }, headers: owner.headers })).members,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: member.id, role: "owner" }),
        expect.objectContaining({ userId: owner.userId, role: "admin" }),
      ]),
    );

    const formerOwnerMember = (
      await auth.api.listMembers({ query: { organizationId }, headers: target.headers })
    ).members.find((candidate) => candidate.userId === owner.userId);
    if (!formerOwnerMember) throw new Error("Former owner member not found");
    await auth.api.transferOrganizationOwnership({
      body: {
        organizationId,
        newOwnerMemberId: formerOwnerMember.id,
        formerOwnerRole: "member",
      },
      headers: target.headers,
    });
    expect(
      (await auth.api.listMembers({ query: { organizationId }, headers: target.headers })).members,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: owner.userId, role: "owner" }),
        expect.objectContaining({ id: member.id, role: "member" }),
      ]),
    );
  });

  it("does not allow native membership endpoints to assign, demote, remove, or leave as owner", async () => {
    const { auth } = createTestAuth();
    const owner = await signUp(auth, "owner-native-owner@example.test");
    const target = await signUp(auth, "target-native-owner@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    const member = await auth.api.addMember({
      body: { organizationId, userId: target.userId, role: "member" },
      headers: owner.headers,
    });

    const ownerMember = (
      await auth.api.listMembers({ query: { organizationId }, headers: owner.headers })
    ).members.find((candidate) => candidate.userId === owner.userId);
    if (!ownerMember) throw new Error("Owner member not found");

    await expect(
      auth.api.transferOrganizationOwnership({
        body: {
          organizationId,
          newOwnerMemberId: "missing-member",
          formerOwnerRole: "member",
        },
        headers: owner.headers,
      }),
    ).rejects.toThrow("The new owner must be another organization member.");
    expect(
      (await auth.api.listMembers({ query: { organizationId }, headers: owner.headers })).members,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: ownerMember.id, role: "owner" })]),
    );

    await expect(
      auth.api.addMember({
        body: { organizationId, userId: target.userId, role: "owner" },
        headers: owner.headers,
      }),
    ).rejects.toThrow("Ownership can only change through an explicit transfer.");
    await expect(
      auth.api.createInvitation({
        body: { organizationId, email: "another-owner@example.test", role: "owner" },
        headers: owner.headers,
      }),
    ).rejects.toThrow("Ownership can only change through an explicit transfer.");

    expect(
      (
        await post(auth, "/organization/update-member-role", owner.headers, {
          organizationId,
          memberId: member.id,
          role: "owner",
        })
      ).status,
    ).toBe(403);
    await expect(
      auth.api.updateMemberRole({
        body: { organizationId, memberId: ownerMember.id, role: "admin" },
        headers: owner.headers,
      }),
    ).rejects.toThrow("Ownership can only change through an explicit transfer.");
    await expect(
      auth.api.removeMember({
        body: { organizationId, memberIdOrEmail: "owner-native-owner@example.test" },
        headers: owner.headers,
      }),
    ).rejects.toThrow("Transfer ownership before removing the owner.");
    await expect(
      auth.api.leaveOrganization({ body: { organizationId }, headers: owner.headers }),
    ).rejects.toThrow("Transfer ownership before leaving the organization.");
  });
});

describe("organization policy plugin endpoint coverage", () => {
  it("rejects multi-role invitation requests through HTTP and auth.api", async () => {
    const { auth } = createTestAuth();
    const owner = await signUp(auth, "owner@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    const body = {
      organizationId,
      email: "invitee@example.test",
      role: ["member", "admin"],
    };

    const httpResponse = await post(auth, "/organization/invite-member", owner.headers, body);
    expect(httpResponse.status).toBe(400);

    await expect(auth.api.createInvitation({ body, headers: owner.headers })).rejects.toThrow(
      "Exactly one organization role is required.",
    );
  });

  it("denies member and anonymous access to add-member", async () => {
    const { auth } = createTestAuth();
    const owner = await signUp(auth, "owner-add-member@example.test");
    const member = await signUp(auth, "member-add-member@example.test");
    const newMember = await signUp(auth, "new-add-member@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    await auth.api.addMember({
      body: { organizationId, userId: member.userId, role: "member" },
      headers: owner.headers,
    });

    await expect(
      auth.api.addMember({
        body: { organizationId, userId: newMember.userId, role: "member" },
        headers: member.headers,
      }),
    ).rejects.toThrow("You are not allowed to perform this organization operation.");
    await expect(
      auth.api.addMember({
        body: { organizationId, userId: newMember.userId, role: ["member", "admin"] },
        headers: owner.headers,
      }),
    ).rejects.toThrow("Exactly one organization role is required.");
    await expect(
      auth.api.addMember({
        body: { organizationId, userId: newMember.userId, role: "member" },
      }),
    ).rejects.toBeDefined();
  });

  it("blocks admins from granting admin-equivalent roles through invitations", async () => {
    const { auth } = createTestAuth();
    const owner = await signUp(auth, "owner-grant@example.test");
    const adminUser = await signUp(auth, "admin-grant@example.test");
    const otherAdmin = await signUp(auth, "other-admin@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    const adminMember = await auth.api.addMember({
      body: { organizationId, userId: adminUser.userId, role: "admin" },
      headers: owner.headers,
    });
    await auth.api.addMember({
      body: { organizationId, userId: otherAdmin.userId, role: "admin" },
      headers: owner.headers,
    });
    const privilegedRole = await post(auth, "/organization/create-role", owner.headers, {
      organizationId,
      role: "role-manager",
      permission: { ac: ["create"] },
    });
    expect(privilegedRole.ok).toBe(true);
    const adminEquivalentRole = await post(auth, "/organization/create-role", owner.headers, {
      organizationId,
      role: "operations-admin",
      permission: roles.admin.statements,
    });
    expect(adminEquivalentRole.ok).toBe(true);
    const customAdmin = await signUp(auth, "custom-admin@example.test");
    // Dynamic role names are validated at runtime but omitted from Better Auth's generated role union.
    const addMember = auth.api.addMember as unknown as (input: {
      body: { organizationId: string; userId: string; role: string };
      headers: Headers;
    }) => Promise<unknown>;
    await addMember({
      body: { organizationId, userId: customAdmin.userId, role: "operations-admin" },
      headers: owner.headers,
    });

    await expect(
      auth.api.createInvitation({
        body: { organizationId, email: "another-admin@example.test", role: "admin" },
        headers: adminUser.headers,
      }),
    ).rejects.toThrow("Only an owner may assign owner or admin-equivalent roles.");
    const newAdmin = await signUp(auth, "new-admin@example.test");
    await expect(
      auth.api.addMember({
        body: { organizationId, userId: newAdmin.userId, role: "admin" },
        headers: adminUser.headers,
      }),
    ).rejects.toThrow("Only an owner may assign owner or admin-equivalent roles.");
    await expect(
      auth.api.createInvitation({
        body: { organizationId, email: "role-manager@example.test", role: "role-manager" },
        headers: adminUser.headers,
      }),
    ).rejects.toThrow("You cannot grant permissions you do not hold.");
    await expect(
      auth.api.createInvitation({
        body: {
          organizationId,
          email: "operations-admin@example.test",
          role: "operations-admin",
        },
        headers: adminUser.headers,
      }),
    ).rejects.toThrow("Only an owner may assign owner or admin-equivalent roles.");
    await expect(
      auth.api.removeMember({
        body: { organizationId, memberIdOrEmail: "other-admin@example.test" },
        headers: adminUser.headers,
      }),
    ).rejects.toThrow("Only an owner may change or remove this member.");
    await expect(
      auth.api.removeMember({
        body: { organizationId, memberIdOrEmail: "custom-admin@example.test" },
        headers: adminUser.headers,
      }),
    ).rejects.toThrow("Only an owner may change or remove this member.");
    await expect(
      auth.api.updateMemberRole({
        body: { organizationId, memberId: adminMember.id, role: "member" },
        headers: adminUser.headers,
      }),
    ).rejects.toThrow("Only an owner may change or remove this member.");
  });

  it("cleans only the removed member's team links in the target organization", async () => {
    const { auth, memoryDb } = createTestAuth();
    const owner = await signUp(auth, "owner-remove-member@example.test");
    const member = await signUp(auth, "member-remove@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    const team = await auth.api.createTeam({
      body: { organizationId, name: "Support" },
      headers: owner.headers,
    });
    await auth.api.addMember({
      body: { organizationId, userId: member.userId, role: "member", teamId: team.id },
      headers: owner.headers,
    });
    expect(
      memoryDb.teamMember?.filter(
        (candidate: unknown) => isRecord(candidate) && candidate.userId === member.userId,
      ).length,
    ).toBe(1);

    await auth.api.removeMember({
      body: { organizationId, memberIdOrEmail: "member-remove@example.test" },
      headers: owner.headers,
    });
    expect(
      memoryDb.teamMember?.filter(
        (candidate: unknown) => isRecord(candidate) && candidate.userId === member.userId,
      ).length,
    ).toBe(0);
    expect(
      memoryDb.teamMember?.filter(
        (candidate: unknown) => isRecord(candidate) && candidate.userId === owner.userId,
      ).length,
    ).toBe(1);
  });

  it("prevents deleting a role referenced by a member through HTTP and auth.api", async () => {
    const { auth, memoryDb } = createTestAuth();
    const owner = await signUp(auth, "owner-member-role-delete@example.test");
    const member = await signUp(auth, "member-role-delete@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    expect(
      (
        await post(auth, "/organization/create-role", owner.headers, {
          organizationId,
          role: "support",
          permission: {},
        })
      ).ok,
    ).toBe(true);
    const memberRecord = await auth.api.addMember({
      body: { organizationId, userId: member.userId, role: "member" },
      headers: owner.headers,
    });
    const updatedMember = await post(auth, "/organization/update-member-role", owner.headers, {
      organizationId,
      memberId: memberRecord.id,
      role: "support",
    });
    expect(updatedMember.ok).toBe(true);

    const deletion = await post(auth, "/organization/delete-role", owner.headers, {
      organizationId,
      roleName: "support",
    });
    expect(deletion.status).toBe(400);
    await expect(
      auth.api.deleteOrgRole({
        body: { organizationId, roleName: "support" },
        headers: owner.headers,
      }),
    ).rejects.toThrow("A role assigned to an organization member cannot be deleted.");
    expect(
      memoryDb.organizationRole?.some(
        (candidate: unknown) => isRecord(candidate) && candidate.role === "support",
      ),
    ).toBe(true);
  });

  it("prevents deleting a role referenced by a pending invitation", async () => {
    const { auth } = createTestAuth();
    const owner = await signUp(auth, "owner-role-delete@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    const createRole = await post(auth, "/organization/create-role", owner.headers, {
      organizationId,
      role: "support",
      permission: {},
    });
    expect(createRole.ok).toBe(true);
    const invite = await post(auth, "/organization/invite-member", owner.headers, {
      organizationId,
      email: "support-user@example.test",
      role: "support",
    });
    expect(invite.ok).toBe(true);

    const deletion = await post(auth, "/organization/delete-role", owner.headers, {
      organizationId,
      roleName: "support",
    });
    expect(deletion.status).toBe(400);
    await expect(
      auth.api.deleteOrgRole({
        body: { organizationId, roleName: "support" },
        headers: owner.headers,
      }),
    ).rejects.toThrow("A role assigned to a pending invitation cannot be deleted.");
  });

  it("blocks accepting an archived organization invitation by invitation ID", async () => {
    const { auth, memoryDb } = createTestAuth();
    const owner = await signUp(auth, "owner-archive-invite@example.test");
    const invitee = await signUp(auth, "archive-invitee@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    const invite = await post(auth, "/organization/invite-member", owner.headers, {
      organizationId,
      email: "archive-invitee@example.test",
      role: "member",
    });
    expect(invite.ok).toBe(true);
    const invitation = (await invite.json()) as { id: string };
    const organizationRow = memoryDb.organization?.find(
      (candidate: unknown) => isRecord(candidate) && candidate.id === organizationId,
    );
    if (!isRecord(organizationRow)) throw new Error("Organization row not found in memory fixture");
    organizationRow.archivedAt = new Date();

    await expect(
      auth.api.acceptInvitation({
        body: { invitationId: invitation.id },
        headers: invitee.headers,
      }),
    ).rejects.toThrow("This organization is archived.");
  });

  it("blocks archived organizations through direct HTTP, auth.api, and activation", async () => {
    const { auth, memoryDb } = createTestAuth();
    const owner = await signUp(auth, "archived-owner@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    const organizationRow = memoryDb.organization?.find(
      (candidate: unknown) => isRecord(candidate) && candidate.id === organizationId,
    );
    if (!isRecord(organizationRow)) throw new Error("Organization row not found in memory fixture");
    organizationRow.archivedAt = new Date();

    const httpResponse = await auth.handler(
      new Request(
        `http://localhost:3000/api/auth/organization/get-full-organization?organizationId=${organizationId}`,
        { headers: { cookie: owner.headers.get("cookie") ?? "" } },
      ),
    );
    expect(httpResponse.status).toBe(403);

    await expect(
      auth.api.getFullOrganization({
        query: { organizationId },
        headers: owner.headers,
      }),
    ).rejects.toThrow("This organization is archived.");

    await expect(
      auth.api.setActiveOrganization({
        body: { organizationId },
        headers: owner.headers,
      }),
    ).rejects.toThrow("This organization is archived.");
  });
});
