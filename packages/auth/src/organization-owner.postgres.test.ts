import { runWithTransaction } from "@better-auth/core/context";
import { betterAuth, getCurrentAdapter } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { createAccessControl } from "better-auth/plugins/access";
import { admin } from "better-auth/plugins/admin";
import { defaultStatements } from "better-auth/plugins/admin/access";
import { organization } from "better-auth/plugins/organization";
import type { OrganizationOptions } from "better-auth/plugins/organization";
import { describe, expect, it } from "vite-plus/test";

import { createOrganizationPolicyPlugin } from "./organization-policy";
import { withOrganizationMutationTransactions } from "./organization-transaction";
import { ac, roles } from "./permissions";

const permissionTestDatabaseUrl = process.env.PERMISSION_TEST_DATABASE_URL;
const postgresDescribe = permissionTestDatabaseUrl ? describe : describe.skip;

const platformAccessControl = createAccessControl(defaultStatements);
const testPlatformRoles = {
  "platform-admin": platformAccessControl.newRole({ user: ["delete"] }),
  user: platformAccessControl.newRole({}),
};

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

function createTestAuth(database: Parameters<typeof drizzleAdapter>[0], failTransfers = false) {
  const failurePlugin = {
    id: "test-transfer-failure",
    hooks: {
      after: [
        {
          matcher: ({ path }: { path?: string }) =>
            failTransfers && path === "/organization/transfer-ownership",
          handler: createAuthMiddleware(async () => {
            throw new Error("Force transfer rollback after writes.");
          }),
        },
      ],
    },
  };
  const authInstance = betterAuth({
    baseURL: "http://localhost:3000",
    secret: "postgres-test-secret-value-that-is-never-used",
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: databaseSchema,
      transaction: true,
    }),
    emailAndPassword: { enabled: true },
    plugins: [
      admin({
        ac: platformAccessControl,
        roles: testPlatformRoles,
        defaultRole: "user",
        adminRoles: ["platform-admin"],
      }),
      organization(organizationOptions),
      createOrganizationPolicyPlugin(organizationOptions, ["platform-admin"]),
      ...(failTransfers ? [failurePlugin] : []),
    ],
  });
  return withOrganizationMutationTransactions(authInstance);
}

let databaseSchema: typeof import("@org-saas/db/schema/auth");

async function loadDatabase() {
  if (!permissionTestDatabaseUrl) throw new Error("PERMISSION_TEST_DATABASE_URL is required");
  process.env.DATABASE_URL = permissionTestDatabaseUrl;
  process.env.BETTER_AUTH_SECRET = "postgres-test-secret-value-that-is-never-used";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  const [{ db }, schema] = await Promise.all([
    import("@org-saas/db"),
    import("@org-saas/db/schema/auth"),
  ]);
  databaseSchema = schema;
  return db;
}

async function signUp(auth: ReturnType<typeof createTestAuth>, email: string) {
  const response = await auth.handler(
    new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ email, password: "{{SECRET_1h5ytbb4}}", name: email }),
    }),
  );
  if (!response.ok) throw new Error(`Sign up failed: ${response.status}`);
  const body = (await response.json()) as { user: { id: string } };
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Sign up did not set a session cookie");
  return { userId: body.user.id, headers: new Headers({ cookie }), email };
}

async function createOrganization(
  auth: ReturnType<typeof createTestAuth>,
  headers: Headers,
): Promise<string> {
  const organization = await auth.api.createOrganization({
    body: { name: "Permission test", slug: `permission-${crypto.randomUUID()}` },
    headers,
  });
  return organization.id;
}

async function ownerMembers(
  auth: ReturnType<typeof createTestAuth>,
  organizationId: string,
  headers: Headers,
) {
  const { members } = await auth.api.listMembers({ query: { organizationId }, headers });
  return members.filter((member) => member.role === "owner");
}

postgresDescribe("PostgreSQL organization owner transaction boundary", () => {
  it("serializes transfer against removal and concurrent transfers", async () => {
    const db = await loadDatabase();
    const auth = createTestAuth(db);
    const owner = await signUp(auth, `owner-${crypto.randomUUID()}@example.test`);
    const target = await signUp(auth, `target-${crypto.randomUUID()}@example.test`);
    const organizationId = await createOrganization(auth, owner.headers);
    const targetMember = await auth.api.addMember({
      body: { organizationId, userId: target.userId, role: "member" },
      headers: owner.headers,
    });

    const removal = auth.handler(
      new Request("http://localhost:3000/api/auth/organization/remove-member", {
        method: "POST",
        headers: {
          cookie: owner.headers.get("cookie") ?? "",
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ organizationId, memberIdOrEmail: target.email }),
      }),
    );
    const transfer = auth.api.transferOrganizationOwnership({
      body: {
        organizationId,
        newOwnerMemberId: targetMember.id,
        formerOwnerRole: "admin",
      },
      headers: owner.headers,
    });
    const [removalResult, transferResult] = await Promise.allSettled([removal, transfer]);
    const removalStatus =
      removalResult.status === "fulfilled" ? removalResult.value.status : undefined;
    const transferSucceeded = transferResult.status === "fulfilled";
    const ownersAfterRace = await ownerMembers(auth, organizationId, owner.headers);
    expect(ownersAfterRace).toHaveLength(1);
    expect(
      (removalStatus === 200 && !transferSucceeded) || (removalStatus === 403 && transferSucceeded),
    ).toBe(true);

    const second = await signUp(auth, `second-${crypto.randomUUID()}@example.test`);
    const third = await signUp(auth, `third-${crypto.randomUUID()}@example.test`);
    const secondMember = await auth.api.addMember({
      body: { organizationId, userId: second.userId, role: "member" },
      headers: owner.headers,
    });
    const thirdMember = await auth.api.addMember({
      body: { organizationId, userId: third.userId, role: "member" },
      headers: owner.headers,
    });
    const currentOwner = ownersAfterRace[0];
    if (!currentOwner) throw new Error("Organization lost its owner");
    const currentOwnerMember = (
      await auth.api.listMembers({ query: { organizationId }, headers: owner.headers })
    ).members.find((member) => member.id === currentOwner.id);
    if (!currentOwnerMember) throw new Error("Owner member is missing");
    const currentOwnerHeaders =
      currentOwnerMember.userId === owner.userId
        ? owner.headers
        : currentOwnerMember.userId === target.userId
          ? target.headers
          : currentOwnerMember.userId === second.userId
            ? second.headers
            : third.headers;
    const concurrentTransfers = await Promise.allSettled([
      auth.api.transferOrganizationOwnership({
        body: {
          organizationId,
          newOwnerMemberId: secondMember.id,
          formerOwnerRole: "admin",
        },
        headers: currentOwnerHeaders,
      }),
      auth.api.transferOrganizationOwnership({
        body: {
          organizationId,
          newOwnerMemberId: thirdMember.id,
          formerOwnerRole: "admin",
        },
        headers: currentOwnerHeaders,
      }),
    ]);
    expect(concurrentTransfers.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await ownerMembers(auth, organizationId, currentOwnerHeaders)).toHaveLength(1);
  });

  it("clears only the removed user's team links and releases seats", async () => {
    const db = await loadDatabase();
    const auth = createTestAuth(db);
    const owner = await signUp(auth, `team-cleanup-owner-${crypto.randomUUID()}@example.test`);
    const target = await signUp(auth, `team-cleanup-target-${crypto.randomUUID()}@example.test`);
    const firstOrganizationId = await createOrganization(auth, owner.headers);
    const firstTeam = await auth.api.createTeam({
      body: { organizationId: firstOrganizationId, name: "First team" },
      headers: owner.headers,
    });
    await auth.api.addMember({
      body: {
        organizationId: firstOrganizationId,
        userId: target.userId,
        role: "member",
        teamId: firstTeam.id,
      },
      headers: owner.headers,
    });

    const secondOrganizationId = await createOrganization(auth, owner.headers);
    const secondTeam = await auth.api.createTeam({
      body: { organizationId: secondOrganizationId, name: "Second team" },
      headers: owner.headers,
    });
    await auth.api.addMember({
      body: {
        organizationId: secondOrganizationId,
        userId: target.userId,
        role: "member",
        teamId: secondTeam.id,
      },
      headers: owner.headers,
    });

    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/organization/remove-member", {
        method: "POST",
        headers: {
          cookie: owner.headers.get("cookie") ?? "",
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          organizationId: firstOrganizationId,
          memberIdOrEmail: target.email,
        }),
      }),
    );
    expect(response.status).toBe(200);
    const adapter = await getCurrentAdapter((await auth.$context).adapter);
    const teamMembers = await adapter.findMany({
      model: "teamMember",
      where: [{ field: "userId", value: target.userId }],
    });
    expect(teamMembers).toEqual([expect.objectContaining({ teamId: secondTeam.id })]);
    const firstTeamAfterRemoval = await adapter.findOne({
      model: "team",
      where: [{ field: "id", value: firstTeam.id }],
    });
    const secondTeamAfterRemoval = await adapter.findOne({
      model: "team",
      where: [{ field: "id", value: secondTeam.id }],
    });
    expect(firstTeamAfterRemoval).toMatchObject({ memberCount: 0 });
    expect(secondTeamAfterRemoval).toMatchObject({ memberCount: 1 });
  });

  it("fails closed on existing multiple owners without changing their roles", async () => {
    const db = await loadDatabase();
    const auth = createTestAuth(db);
    const owner = await signUp(auth, `multiple-owner-${crypto.randomUUID()}@example.test`);
    const existingMember = await signUp(
      auth,
      `multiple-member-${crypto.randomUUID()}@example.test`,
    );
    const newMember = await signUp(auth, `multiple-new-member-${crypto.randomUUID()}@example.test`);
    const organizationId = await createOrganization(auth, owner.headers);
    const member = await auth.api.addMember({
      body: { organizationId, userId: existingMember.userId, role: "member" },
      headers: owner.headers,
    });
    const adapter = await getCurrentAdapter((await auth.$context).adapter);
    await adapter.update({
      model: "member",
      where: [{ field: "id", value: member.id }],
      update: { role: "owner" },
    });

    await expect(
      auth.api.addMember({
        body: { organizationId, userId: newMember.userId, role: "member" },
        headers: owner.headers,
      }),
    ).rejects.toThrow("Organization membership changes require exactly one owner");
    const members = (
      await auth.api.listMembers({ query: { organizationId }, headers: owner.headers })
    ).members;
    expect(members.filter((candidate) => candidate.role === "owner")).toHaveLength(2);
    expect(members).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: newMember.userId })]),
    );

    await adapter.update({
      model: "member",
      where: [{ field: "userId", value: owner.userId }],
      update: { role: "admin" },
    });
    await adapter.update({
      model: "member",
      where: [{ field: "id", value: member.id }],
      update: { role: "admin" },
    });
    await expect(
      auth.api.addMember({
        body: { organizationId, userId: newMember.userId, role: "member" },
        headers: owner.headers,
      }),
    ).rejects.toThrow("Organization membership changes require exactly one owner");
    const ownerlessMembers = (
      await auth.api.listMembers({ query: { organizationId }, headers: owner.headers })
    ).members;
    expect(ownerlessMembers.filter((candidate) => candidate.role === "owner")).toHaveLength(0);
  });

  it("serializes owner leave and removal against transfer", async () => {
    const db = await loadDatabase();
    const auth = createTestAuth(db);

    const leaveOwner = await signUp(auth, `leave-owner-${crypto.randomUUID()}@example.test`);
    const leaveTarget = await signUp(auth, `leave-target-${crypto.randomUUID()}@example.test`);
    const leaveOrganizationId = await createOrganization(auth, leaveOwner.headers);
    const leaveTargetMember = await auth.api.addMember({
      body: { organizationId: leaveOrganizationId, userId: leaveTarget.userId, role: "member" },
      headers: leaveOwner.headers,
    });
    const leaveRace = await Promise.allSettled([
      auth.api.leaveOrganization({
        body: { organizationId: leaveOrganizationId },
        headers: leaveOwner.headers,
      }),
      auth.api.transferOrganizationOwnership({
        body: {
          organizationId: leaveOrganizationId,
          newOwnerMemberId: leaveTargetMember.id,
          formerOwnerRole: "admin",
        },
        headers: leaveOwner.headers,
      }),
    ]);
    expect(leaveRace[1]?.status).toBe("fulfilled");
    const leaveOwners = await ownerMembers(auth, leaveOrganizationId, leaveTarget.headers);
    expect(leaveOwners).toHaveLength(1);
    expect(leaveOwners[0]?.userId).toBe(leaveTarget.userId);

    const removeOwner = await signUp(auth, `remove-owner-${crypto.randomUUID()}@example.test`);
    const removeActor = await signUp(auth, `remove-actor-${crypto.randomUUID()}@example.test`);
    const removeOrganizationId = await createOrganization(auth, removeOwner.headers);
    const removeActorMember = await auth.api.addMember({
      body: { organizationId: removeOrganizationId, userId: removeActor.userId, role: "admin" },
      headers: removeOwner.headers,
    });
    const removeRace = await Promise.allSettled([
      auth.api.removeMember({
        body: { organizationId: removeOrganizationId, memberIdOrEmail: removeOwner.email },
        headers: removeActor.headers,
      }),
      auth.api.transferOrganizationOwnership({
        body: {
          organizationId: removeOrganizationId,
          newOwnerMemberId: removeActorMember.id,
          formerOwnerRole: "admin",
        },
        headers: removeOwner.headers,
      }),
    ]);
    expect(removeRace[1]?.status).toBe("fulfilled");
    const removeOwners = await ownerMembers(auth, removeOrganizationId, removeActor.headers);
    expect(removeOwners).toHaveLength(1);
    expect(removeOwners[0]?.userId).toBe(removeActor.userId);
  });

  it("keeps the owner invariant during concurrent account removal and transfer", async () => {
    const db = await loadDatabase();
    const auth = createTestAuth(db);
    const owner = await signUp(auth, `account-owner-${crypto.randomUUID()}@example.test`);
    const target = await signUp(auth, `account-admin-${crypto.randomUUID()}@example.test`);
    const organizationId = await createOrganization(auth, owner.headers);
    const targetMember = await auth.api.addMember({
      body: { organizationId, userId: target.userId, role: "member" },
      headers: owner.headers,
    });
    const adapter = await getCurrentAdapter((await auth.$context).adapter);
    const unprivilegedRemoval = await auth.handler(
      new Request("http://localhost:3000/api/auth/admin/remove-user", {
        method: "POST",
        headers: {
          cookie: target.headers.get("cookie") ?? "",
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ userId: owner.userId }),
      }),
    );
    expect(unprivilegedRemoval.status).toBe(403);
    await adapter.update({
      model: "user",
      where: [{ field: "id", value: target.userId }],
      update: { role: "platform-admin" },
    });

    const removalRequest = () =>
      auth.handler(
        new Request("http://localhost:3000/api/auth/admin/remove-user", {
          method: "POST",
          headers: {
            cookie: target.headers.get("cookie") ?? "",
            "content-type": "application/json",
            origin: "http://localhost:3000",
          },
          body: JSON.stringify({ userId: owner.userId }),
        }),
      );
    const removal = removalRequest();
    const transfer = auth.api.transferOrganizationOwnership({
      body: {
        organizationId,
        newOwnerMemberId: targetMember.id,
        formerOwnerRole: "admin",
      },
      headers: owner.headers,
    });
    const [removalResult, transferResult] = await Promise.allSettled([removal, transfer]);
    expect(transferResult.status).toBe("fulfilled");
    expect(removalResult.status).toBe("fulfilled");
    if (removalResult.status !== "fulfilled") throw new Error("Account removal request failed");
    let removalResponse = removalResult.value;
    expect([200, 403]).toContain(removalResponse.status);
    if (removalResponse.status === 403) removalResponse = await removalRequest();
    expect(removalResponse.status).toBe(200);
    const removedUser = await adapter.findOne({
      model: "user",
      where: [{ field: "id", value: owner.userId }],
    });
    expect(removedUser).toBeNull();
    const owners = await ownerMembers(auth, organizationId, target.headers);
    expect(owners).toHaveLength(1);
    expect(owners[0]?.userId).toBe(target.userId);
  });

  it("guards direct auth.api account deletion during ownership transfer", async () => {
    const db = await loadDatabase();
    const auth = createTestAuth(db);
    const owner = await signUp(auth, `api-account-owner-${crypto.randomUUID()}@example.test`);
    const target = await signUp(auth, `api-account-admin-${crypto.randomUUID()}@example.test`);
    const organizationId = await createOrganization(auth, owner.headers);
    const targetMember = await auth.api.addMember({
      body: { organizationId, userId: target.userId, role: "member" },
      headers: owner.headers,
    });
    const adapter = await getCurrentAdapter((await auth.$context).adapter);
    await adapter.update({
      model: "user",
      where: [{ field: "id", value: target.userId }],
      update: { role: "platform-admin" },
    });

    const deletion = auth.api.removeUser({
      body: { userId: owner.userId },
      headers: target.headers,
    });
    const transfer = auth.api.transferOrganizationOwnership({
      body: {
        organizationId,
        newOwnerMemberId: targetMember.id,
        formerOwnerRole: "admin",
      },
      headers: owner.headers,
    });
    const [deletionResult, transferResult] = await Promise.allSettled([deletion, transfer]);
    expect(transferResult.status).toBe("fulfilled");
    if (deletionResult.status === "rejected") {
      await auth.api.removeUser({ body: { userId: owner.userId }, headers: target.headers });
    }
    expect(
      await adapter.findOne({ model: "user", where: [{ field: "id", value: owner.userId }] }),
    ).toBeNull();
    const owners = await ownerMembers(auth, organizationId, target.headers);
    expect(owners).toHaveLength(1);
    expect(owners[0]?.userId).toBe(target.userId);
  });

  it("rolls back direct adapter writes through Better Auth transaction context", async () => {
    const db = await loadDatabase();
    const auth = createTestAuth(db);
    const owner = await signUp(auth, `transaction-owner-${crypto.randomUUID()}@example.test`);
    const target = await signUp(auth, `transaction-target-${crypto.randomUUID()}@example.test`);
    const organizationId = await createOrganization(auth, owner.headers);
    const member = await auth.api.addMember({
      body: { organizationId, userId: target.userId, role: "member" },
      headers: owner.headers,
    });
    const baseAdapter = (await auth.$context).adapter;
    await expect(
      runWithTransaction(baseAdapter, async () => {
        const adapter = await getCurrentAdapter(baseAdapter);
        await adapter.update({
          model: "member",
          where: [{ field: "id", value: member.id }],
          update: { role: "admin" },
        });
        throw new Error("Force adapter transaction rollback.");
      }),
    ).rejects.toThrow("Force adapter transaction rollback.");

    const members = (
      await auth.api.listMembers({ query: { organizationId }, headers: owner.headers })
    ).members;
    expect(members).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: member.id, role: "member" })]),
    );
  });

  it("rolls back ownership changes when an HTTP after-hook returns an error", async () => {
    const db = await loadDatabase();
    const auth = createTestAuth(db, true);
    const owner = await signUp(auth, `rollback-owner-${crypto.randomUUID()}@example.test`);
    const target = await signUp(auth, `rollback-target-${crypto.randomUUID()}@example.test`);
    const organizationId = await createOrganization(auth, owner.headers);
    const targetMember = await auth.api.addMember({
      body: { organizationId, userId: target.userId, role: "member" },
      headers: owner.headers,
    });

    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/organization/transfer-ownership", {
        method: "POST",
        headers: {
          cookie: owner.headers.get("cookie") ?? "",
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          organizationId,
          newOwnerMemberId: targetMember.id,
          formerOwnerRole: "admin",
        }),
      }),
    );
    expect(response.ok).toBe(false);
    const members = (
      await auth.api.listMembers({ query: { organizationId }, headers: owner.headers })
    ).members;
    expect(members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: owner.userId, role: "owner" }),
        expect.objectContaining({ id: targetMember.id, role: "member" }),
      ]),
    );
    expect(members.filter((member) => member.role === "owner")).toHaveLength(1);
  });
});
