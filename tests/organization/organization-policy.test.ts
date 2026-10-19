import { createOrganizationPolicyPlugin, hasSingleRole } from "@org-saas/auth/organization-policy";
import { withOrganizationMutationTransactions } from "@org-saas/auth/organization-transaction";
import { ac, roles } from "@org-saas/auth/permissions";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { organization } from "better-auth/plugins/organization";
import type { OrganizationOptions } from "better-auth/plugins/organization";
import { describe, expect, it } from "vite-plus/test";

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

const auditSchemaPlugin = {
  id: "test-audit-schema",
  schema: {
    auditLog: {
      fields: {
        scope: { type: "string" },
        organizationId: { type: "string", required: false },
        actorId: { type: "string" },
        actorName: { type: "string" },
        action: { type: "string" },
        targetType: { type: "string" },
        targetId: { type: "string", required: false },
        summary: { type: "json" },
        occurredAt: { type: "date", defaultValue: () => new Date() },
      },
    },
  },
} as const;

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
    auditLog: [],
  };
  const auth = withOrganizationMutationTransactions(
    betterAuth({
      baseURL: "http://localhost:3000",
      secret: "test-secret-that-is-long-enough-for-better-auth",
      database: memoryAdapter(memoryDb),
      emailAndPassword: { enabled: true },
      plugins: [
        organization(organizationOptions),
        auditSchemaPlugin,
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

describe("organization audit records", () => {
  it("stores invitation events by organization without recording the invitee email", async () => {
    const { auth, memoryDb } = createTestAuth();
    const owner = await signUp(auth, "audit-owner@example.test");
    const inviteeEmail = "private-invitee@example.test";
    const organizationId = await createOrganization(auth, owner.headers);

    await auth.api.createInvitation({
      body: { organizationId, email: inviteeEmail, role: "member" },
      headers: owner.headers,
    });

    const invitationAudit = memoryDb.auditLog?.find(
      (candidate: unknown) => isRecord(candidate) && candidate.action === "invitation.sent",
    );
    if (!isRecord(invitationAudit)) throw new Error("Invitation audit record was not created");
    expect(invitationAudit).toMatchObject({
      scope: "organization",
      organizationId,
      actorId: owner.userId,
      action: "invitation.sent",
      targetType: "invitation",
    });
    const summary =
      typeof invitationAudit.summary === "string"
        ? (JSON.parse(invitationAudit.summary) as unknown)
        : invitationAudit.summary;
    expect(summary).toEqual({ role: "member" });
    expect(JSON.stringify(invitationAudit)).not.toContain(inviteeEmail);
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

  it("fails closed when an owner row combines the owner role with another role", async () => {
    const { auth, memoryDb } = createTestAuth();
    const owner = await signUp(auth, "combined-owner-role@example.test");
    const newMember = await signUp(auth, "combined-owner-new-member@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    const ownerRow = memoryDb.member?.find(
      (candidate: unknown) => isRecord(candidate) && candidate.organizationId === organizationId,
    );
    if (!isRecord(ownerRow)) throw new Error("Owner membership row not found");
    ownerRow.role = "owner,admin";

    await expect(
      auth.api.addMember({
        body: { organizationId, userId: newMember.userId, role: "member" },
        headers: owner.headers,
      }),
    ).rejects.toThrow("Organization membership changes require exactly one owner");
    expect(
      memoryDb.member?.some(
        (candidate: unknown) => isRecord(candidate) && candidate.userId === newMember.userId,
      ),
    ).toBe(false);
  });

  it("allows a regular member to leave while preserving the sole owner", async () => {
    const { auth } = createTestAuth();
    const owner = await signUp(auth, "owner-leave-member@example.test");
    const leavingMember = await signUp(auth, "member-leave@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    await auth.api.addMember({
      body: { organizationId, userId: leavingMember.userId, role: "member" },
      headers: owner.headers,
    });

    const response = await post(auth, "/organization/leave", leavingMember.headers, {
      organizationId,
    });

    expect(response.ok).toBe(true);
    const members = (
      await auth.api.listMembers({ query: { organizationId }, headers: owner.headers })
    ).members;
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ userId: owner.userId, role: "owner" });
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
    const roleManager = await signUp(auth, "role-manager@example.test");
    await addMember({
      body: { organizationId, userId: roleManager.userId, role: "role-manager" },
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
        body: { organizationId, memberIdOrEmail: "role-manager@example.test" },
        headers: adminUser.headers,
      }),
    ).rejects.toThrow("You cannot change or remove a member whose role exceeds your permissions.");
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

  it("hides pending invitations from ordinary members on HTTP and auth.api", async () => {
    const { auth } = createTestAuth();
    const owner = await signUp(auth, "owner-full-org-visibility@example.test");
    const ordinaryMember = await signUp(auth, "member-full-org-visibility@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    await auth.api.addMember({
      body: { organizationId, userId: ordinaryMember.userId, role: "member" },
      headers: owner.headers,
    });
    await auth.api.createInvitation({
      body: { organizationId, email: "pending-full-org-visibility@example.test", role: "member" },
      headers: owner.headers,
    });

    const memberOrganization = await auth.api.getFullOrganization({
      query: { organizationId },
      headers: ordinaryMember.headers,
    });
    expect(memberOrganization?.invitations).toEqual([]);
    expect(
      await auth.api.listInvitations({
        query: { organizationId },
        headers: ordinaryMember.headers,
      }),
    ).toEqual([]);
    expect(
      await auth.api.listInvitations({ query: { organizationId }, headers: owner.headers }),
    ).toHaveLength(1);
    await expect(
      auth.api.listOrgRoles({
        query: { organizationId },
        headers: ordinaryMember.headers,
      }),
    ).rejects.toThrow("You are not allowed to list a role");

    const ownerOrganization = await auth.api.getFullOrganization({
      query: { organizationId },
      headers: owner.headers,
    });
    expect(ownerOrganization?.invitations).toHaveLength(1);

    const httpResponse = await auth.handler(
      new Request(
        `http://localhost:3000/api/auth/organization/get-full-organization?organizationId=${organizationId}`,
        { headers: { cookie: ordinaryMember.headers.get("cookie") ?? "" } },
      ),
    );
    expect(httpResponse.ok).toBe(true);
    const httpOrganization = (await httpResponse.json()) as { invitations?: unknown[] };
    expect(httpOrganization.invitations).toEqual([]);

    const httpInvitationsResponse = await auth.handler(
      new Request(
        `http://localhost:3000/api/auth/organization/list-invitations?organizationId=${organizationId}`,
        { headers: { cookie: ordinaryMember.headers.get("cookie") ?? "" } },
      ),
    );
    expect(httpInvitationsResponse.ok).toBe(true);
    await expect(httpInvitationsResponse.json()).resolves.toEqual([]);
  });

  it("rejects accepting an invitation after its sender leaves the organization", async () => {
    const { auth, memoryDb } = createTestAuth();
    const owner = await signUp(auth, "owner-stale-invite@example.test");
    const inviter = await signUp(auth, "inviter-stale-invite@example.test");
    const invitee = await signUp(auth, "invitee-stale-invite@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    await auth.api.addMember({
      body: { organizationId, userId: inviter.userId, role: "admin" },
      headers: owner.headers,
    });
    const invitationResponse = await post(auth, "/organization/invite-member", inviter.headers, {
      organizationId,
      email: "invitee-stale-invite@example.test",
      role: "member",
    });
    expect(invitationResponse.ok).toBe(true);
    const invitation = (await invitationResponse.json()) as { id: string };
    await auth.api.removeMember({
      body: { organizationId, memberIdOrEmail: "inviter-stale-invite@example.test" },
      headers: owner.headers,
    });

    await expect(
      auth.api.acceptInvitation({
        body: { invitationId: invitation.id },
        headers: invitee.headers,
      }),
    ).rejects.toThrow("The invitation sender is no longer a member of this organization.");
    const invitationRow = memoryDb.invitation?.find(
      (candidate: unknown) => isRecord(candidate) && candidate.id === invitation.id,
    );
    expect(invitationRow).toMatchObject({ status: "pending" });
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
      auth.api.getInvitation({ query: { id: invitation.id }, headers: invitee.headers }),
    ).rejects.toThrow("This organization is archived.");

    await expect(
      auth.api.acceptInvitation({
        body: { invitationId: invitation.id },
        headers: invitee.headers,
      }),
    ).rejects.toThrow("This organization is archived.");
  });

  it("rejects organization IDs and slugs that point to different organizations", async () => {
    const { auth, memoryDb } = createTestAuth();
    const owner = await signUp(auth, "owner-mismatched-org-reference@example.test");
    const organizationId = await createOrganization(auth, owner.headers);
    const secondOrganization = await auth.api.createOrganization({
      body: {
        name: "Archived organization",
        slug: `archived-${crypto.randomUUID()}`,
      },
      headers: owner.headers,
    });
    const archivedRow = memoryDb.organization?.find(
      (candidate: unknown) => isRecord(candidate) && candidate.id === secondOrganization.id,
    );
    if (!isRecord(archivedRow)) throw new Error("Second organization row not found");
    archivedRow.archivedAt = new Date();

    await expect(
      auth.api.getFullOrganization({
        query: { organizationId, organizationSlug: secondOrganization.slug },
        headers: owner.headers,
      }),
    ).rejects.toThrow("The organization ID and slug must identify the same organization.");
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
