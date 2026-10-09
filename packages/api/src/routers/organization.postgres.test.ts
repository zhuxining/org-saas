import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterClient } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { describe, expect, it } from "vite-plus/test";

import type { ApiContractClient } from "../contracts/index";

const permissionTestDatabaseUrl = process.env.PERMISSION_TEST_DATABASE_URL;
const postgresDescribe = permissionTestDatabaseUrl ? describe : describe.skip;

async function loadEnvironment() {
  if (!permissionTestDatabaseUrl) throw new Error("PERMISSION_TEST_DATABASE_URL is required");
  process.env.DATABASE_URL = permissionTestDatabaseUrl;
  process.env.BETTER_AUTH_SECRET = "permission-api-test-secret-that-is-never-used";
  process.env.BETTER_AUTH_URL = "http://localhost:3000";
  process.env.CORS_ORIGIN = "http://localhost:3000";

  const [dbModule, schema, authModule, apiContext, apiIndex, apiRouters] = await Promise.all([
    import("@org-saas/db"),
    import("@org-saas/db/schema/auth"),
    import("@org-saas/auth"),
    import("../context"),
    import("../index"),
    import("./index"),
  ]);

  return {
    db: dbModule.db,
    eq: dbModule.eq,
    and: dbModule.and,
    schema,
    auth: authModule.auth,
    createContext: apiContext.createContext,
    standardLimiter: apiIndex.standardLimiter,
    appRouter: apiRouters.appRouter,
  };
}

type Environment = Awaited<ReturnType<typeof loadEnvironment>>;

function createCaller(environment: Environment, headers: Headers) {
  return createRouterClient(environment.appRouter, {
    context: async () => ({
      ...environment.createContext({ headers }),
      ratelimiter: environment.standardLimiter,
    }),
  });
}

function createHttpCaller(environment: Environment, sessionHeaders: Headers) {
  const handler = new RPCHandler(environment.appRouter);
  const link = new RPCLink({
    origin: "http://localhost",
    url: "/api/rpc",
    fetch: async (input, init) => {
      const requestHeaders = new Headers(init?.headers);
      const cookie = sessionHeaders.get("cookie");
      if (cookie) requestHeaders.set("cookie", cookie);
      const request = new Request(input, { ...init, headers: requestHeaders });
      const result = await handler.handle(request, {
        prefix: "/api/rpc",
        context: {
          ...environment.createContext({ req: request }),
          ratelimiter: environment.standardLimiter,
        },
      });
      return result.response ?? new Response("Not found", { status: 404 });
    },
  });
  return createORPCClient<ApiContractClient>(link);
}

async function signUp(environment: Environment, email: string) {
  const response = await environment.auth.handler(
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
  return { userId: body.user.id, email, headers: new Headers({ cookie }) };
}

postgresDescribe("restricted organization and platform API", () => {
  it("limits invitation visibility and allows only the owner to archive and restore", async () => {
    const environment = await loadEnvironment();
    const owner = await signUp(environment, `api-owner-${crypto.randomUUID()}@example.test`);
    const memberUser = await signUp(environment, `api-member-${crypto.randomUUID()}@example.test`);
    const invitationManager = await signUp(
      environment,
      `api-invitation-manager-${crypto.randomUUID()}@example.test`,
    );
    const organization = await environment.auth.api.createOrganization({
      body: { name: "API privacy test", slug: `api-privacy-${crypto.randomUUID()}` },
      headers: owner.headers,
    });
    await environment.auth.api.addMember({
      body: { organizationId: organization.id, userId: memberUser.userId, role: "member" },
      headers: owner.headers,
    });
    await environment.auth.api.createOrgRole({
      body: {
        organizationId: organization.id,
        role: "invitation-manager",
        permission: { invitation: ["create"], team: ["create"] },
      },
      headers: owner.headers,
    });
    const addMemberWithDynamicRole = environment.auth.api.addMember as unknown as (input: {
      body: { organizationId: string; userId: string; role: string };
      headers: Headers;
    }) => Promise<unknown>;
    await addMemberWithDynamicRole({
      body: {
        organizationId: organization.id,
        userId: invitationManager.userId,
        role: "invitation-manager",
      },
      headers: owner.headers,
    });
    await environment.auth.api.createInvitation({
      body: {
        organizationId: organization.id,
        email: `api-invite-${crypto.randomUUID()}@example.test`,
        role: "member",
      },
      headers: owner.headers,
    });

    const ownerClient = createCaller(environment, owner.headers);
    const memberClient = createCaller(environment, memberUser.headers);
    const invitationManagerClient = createCaller(environment, invitationManager.headers);
    const memberStats = await memberClient.dashboard.orgStats({ orgId: organization.id });
    const ownerStats = await ownerClient.dashboard.orgStats({ orgId: organization.id });
    const invitationManagerStats = await invitationManagerClient.dashboard.orgStats({
      orgId: organization.id,
    });
    const ownerResolved = await ownerClient.organization.resolveBySlug({ slug: organization.slug });
    expect(ownerResolved).toMatchObject({
      organization: { id: organization.id, slug: organization.slug },
      access: { role: "owner", isOwner: true, status: "active" },
    });
    const memberResolved = await memberClient.organization.resolveBySlug({
      slug: organization.slug,
    });
    expect(memberResolved.access).toMatchObject({
      role: "member",
      isOwner: false,
      status: "active",
      operations: { organization: { update: false, archive: false } },
    });

    const ownerAccess = await ownerClient.organization.accessContext({
      organizationId: organization.id,
    });
    expect(ownerAccess).toMatchObject({
      role: "owner",
      isOwner: true,
      status: "active",
      operations: {
        organization: { archive: true, restore: false },
        invitation: { viewPending: true },
      },
    });
    const memberHttpStats = await createHttpCaller(
      environment,
      memberUser.headers,
    ).dashboard.orgStats({
      orgId: organization.id,
    });
    expect(memberStats.pendingInvitationCount).toBeNull();
    expect(memberHttpStats.pendingInvitationCount).toBeNull();
    expect(ownerStats.pendingInvitationCount).toBe(1);
    expect(invitationManagerStats.pendingInvitationCount).toBe(1);
    expect(
      (await memberClient.organization.accessContext({ organizationId: organization.id }))
        .operations.invitation.viewPending,
    ).toBe(false);
    const invitationManagerAccess = await invitationManagerClient.organization.accessContext({
      organizationId: organization.id,
    });
    expect(invitationManagerAccess.operations).toMatchObject({
      invitation: { create: true, viewPending: true },
      team: { create: true },
      member: { create: false },
    });

    await expect(
      memberClient.organization.archive({ organizationId: organization.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const archived = await createHttpCaller(environment, owner.headers).organization.archive({
      organizationId: organization.id,
    });
    expect(archived.status).toBe("archived");
    expect(archived.archivedAt).toBeTruthy();
    await expect(
      memberClient.organization.archivedStatus({ organizationId: organization.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(memberClient.dashboard.orgStats({ orgId: organization.id })).rejects.toMatchObject(
      { code: "FORBIDDEN" },
    );

    const ownerOrganizations = await environment.auth.api.listOrganizations({
      headers: owner.headers,
    });
    expect(ownerOrganizations.some((item) => item.id === organization.id)).toBe(true);
    const ownerArchivedContext = await ownerClient.organization.accessContext({
      organizationId: organization.id,
    });
    const archivedResolved = await ownerClient.organization.resolveBySlug({
      slug: organization.slug,
    });
    expect(archivedResolved.access.status).toBe("archived");
    expect(ownerArchivedContext.status).toBe("archived");
    expect(ownerArchivedContext.operations.organization).toEqual({
      update: false,
      archive: false,
      restore: true,
    });
    expect(ownerArchivedContext.operations.member.create).toBe(false);
    const status = await ownerClient.organization.archivedStatus({
      organizationId: organization.id,
    });
    expect(status).toEqual({
      organizationId: organization.id,
      name: "API privacy test",
      slug: organization.slug,
      status: "archived",
      archivedAt: archived.archivedAt,
    });

    const restored = await createHttpCaller(environment, owner.headers).organization.restore({
      organizationId: organization.id,
    });
    expect(restored).toEqual({
      organizationId: organization.id,
      status: "active",
      archivedAt: null,
    });
    const activeStatus = await environment.db
      .select({ archivedAt: environment.schema.organization.archivedAt })
      .from(environment.schema.organization)
      .where(environment.eq(environment.schema.organization.id, organization.id));
    expect(activeStatus[0]?.archivedAt).toBeNull();
  });

  it("rejects cross-organization identifiers and returns basic platform DTOs", async () => {
    const environment = await loadEnvironment();
    const userA = await signUp(environment, `api-a-${crypto.randomUUID()}@example.test`);
    const userB = await signUp(environment, `api-b-${crypto.randomUUID()}@example.test`);
    const organizationA = await environment.auth.api.createOrganization({
      body: { name: "API org A", slug: `api-org-a-${crypto.randomUUID()}` },
      headers: userA.headers,
    });
    const organizationB = await environment.auth.api.createOrganization({
      body: { name: "API org B", slug: `api-org-b-${crypto.randomUUID()}` },
      headers: userB.headers,
    });
    const clientA = createCaller(environment, userA.headers);

    await expect(
      clientA.organization.accessContext({ organizationId: organizationB.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      clientA.organization.archive({ organizationId: organizationB.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      createHttpCaller(environment, userA.headers).organization.accessContext({
        organizationId: organizationB.id,
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const platformAdmin = await signUp(
      environment,
      `api-platform-${crypto.randomUUID()}@example.test`,
    );
    const ordinaryUser = await signUp(
      environment,
      `api-managed-user-${crypto.randomUUID()}@example.test`,
    );
    await environment.db
      .update(environment.schema.user)
      .set({ role: "user,platform-admin" })
      .where(environment.eq(environment.schema.user.id, platformAdmin.userId));
    const adminClient = createCaller(environment, platformAdmin.headers);
    await expect(
      adminClient.organization.accessContext({ organizationId: organizationB.id }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      adminClient.organization.resolveBySlug({ slug: organizationB.slug }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    await environment.auth.api.createOrgRole({
      body: {
        organizationId: organizationA.id,
        role: "member-role-manager",
        permission: { member: ["update"], team: ["create"] },
      },
      headers: userA.headers,
    });
    const addMemberWithCustomRole = environment.auth.api.addMember as unknown as (input: {
      body: { organizationId: string; userId: string; role: string };
      headers: Headers;
    }) => Promise<unknown>;
    await addMemberWithCustomRole({
      body: {
        organizationId: organizationA.id,
        userId: ordinaryUser.userId,
        role: "member-role-manager",
      },
      headers: userA.headers,
    });
    const managerClient = createCaller(environment, ordinaryUser.headers);
    const assignableRoles = await managerClient.organization.grantableRoles({
      organizationId: organizationA.id,
      operation: "member.update",
    });
    expect(assignableRoles.map(({ name }) => name)).toEqual(
      expect.arrayContaining(["member", "member-role-manager"]),
    );
    expect(assignableRoles.map(({ name }) => name)).not.toEqual(
      expect.arrayContaining(["owner", "admin"]),
    );
    await expect(
      managerClient.organization.grantableRoles({
        organizationId: organizationA.id,
        operation: "invitation.create",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    const managerRoleRow = await environment.db
      .select({ id: environment.schema.organizationRole.id })
      .from(environment.schema.organizationRole)
      .where(
        environment.and(
          environment.eq(environment.schema.organizationRole.organizationId, organizationA.id),
          environment.eq(environment.schema.organizationRole.role, "member-role-manager"),
        ),
      );
    const managerRoleId = managerRoleRow[0]?.id;
    if (!managerRoleId) throw new Error("Custom manager role is missing");
    await environment.auth.api.updateOrgRole({
      body: {
        organizationId: organizationA.id,
        roleId: managerRoleId,
        data: { permission: { team: ["create"] } },
      },
      headers: userA.headers,
    });
    const refreshedManagerAccess = await managerClient.organization.accessContext({
      organizationId: organizationA.id,
    });
    expect(refreshedManagerAccess.operations.member.update).toBe(false);
    await expect(
      managerClient.organization.grantableRoles({
        organizationId: organizationA.id,
        operation: "member.update",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const organizations = await adminClient.platform.listOrganizations({
      search: organizationA.slug,
      limit: 10,
      offset: 0,
    });
    expect(organizations.items).toEqual([
      expect.objectContaining({
        id: organizationA.id,
        name: "API org A",
        slug: organizationA.slug,
      }),
    ]);
    expect(Object.keys(organizations.items[0] ?? {}).sort()).toEqual(
      ["archived", "createdAt", "id", "name", "slug"].sort(),
    );

    await expect(clientA.platform.listUsers({ limit: 10, offset: 0 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    const users = await adminClient.platform.listUsers({
      search: ordinaryUser.email,
      limit: 10,
      offset: 0,
    });
    expect(users.items).toEqual([
      expect.objectContaining({ id: ordinaryUser.userId, email: ordinaryUser.email }),
    ]);
    expect(Object.keys(users.items[0] ?? {}).sort()).toEqual(
      ["banned", "createdAt", "email", "emailVerified", "id", "image", "name"].sort(),
    );
    const platformAdmins = await adminClient.platform.listUsers({
      search: platformAdmin.email,
      limit: 10,
      offset: 0,
    });
    expect(platformAdmins.items).toEqual([]);

    await expect(
      environment.auth.api.setRole({
        body: { userId: ordinaryUser.userId, role: "platform-admin" },
        headers: platformAdmin.headers,
      }),
    ).rejects.toThrow("You are not allowed to change users role");
    const setRoleResponse = await environment.auth.handler(
      new Request("http://localhost:3000/api/auth/admin/set-role", {
        method: "POST",
        headers: {
          cookie: platformAdmin.headers.get("cookie") ?? "",
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ userId: ordinaryUser.userId, role: "platform-admin" }),
      }),
    );
    expect(setRoleResponse.status).toBe(403);
    const unchangedUser = await environment.db
      .select({ role: environment.schema.user.role })
      .from(environment.schema.user)
      .where(environment.eq(environment.schema.user.id, ordinaryUser.userId));
    expect(unchangedUser[0]?.role).toBe("user");

    await expect(
      environment.auth.api.listUserSessions({
        body: { userId: ordinaryUser.userId },
        headers: ordinaryUser.headers,
      }),
    ).rejects.toThrow("You are not allowed to list users sessions");
    const sessions = await environment.auth.api.listUserSessions({
      body: { userId: ordinaryUser.userId },
      headers: platformAdmin.headers,
    });
    expect(sessions.sessions).toHaveLength(1);
    expect(sessions.sessions[0]).not.toHaveProperty("token");
    const sessionListResponse = await environment.auth.handler(
      new Request("http://localhost:3000/api/auth/admin/list-user-sessions", {
        method: "POST",
        headers: {
          cookie: platformAdmin.headers.get("cookie") ?? "",
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ userId: ordinaryUser.userId }),
      }),
    );
    expect(sessionListResponse.status).toBe(200);
    const sessionListBody = (await sessionListResponse.json()) as {
      sessions: Array<Record<string, unknown>>;
    };
    expect(sessionListBody.sessions).toHaveLength(1);
    expect(sessionListBody.sessions[0]).not.toHaveProperty("token");

    await environment.auth.api.revokeUserSessions({
      body: { userId: ordinaryUser.userId },
      headers: platformAdmin.headers,
    });
    const revokedSessions = await environment.auth.api.listUserSessions({
      body: { userId: ordinaryUser.userId },
      headers: platformAdmin.headers,
    });
    expect(revokedSessions.sessions).toHaveLength(0);

    await environment.auth.api.banUser({
      body: { userId: ordinaryUser.userId, banReason: "integration test" },
      headers: platformAdmin.headers,
    });
    const bannedUser = await environment.db
      .select({ banned: environment.schema.user.banned })
      .from(environment.schema.user)
      .where(environment.eq(environment.schema.user.id, ordinaryUser.userId));
    expect(bannedUser[0]?.banned).toBe(true);
    await environment.auth.api.unbanUser({
      body: { userId: ordinaryUser.userId },
      headers: platformAdmin.headers,
    });
    const unbannedUser = await environment.db
      .select({ banned: environment.schema.user.banned })
      .from(environment.schema.user)
      .where(environment.eq(environment.schema.user.id, ordinaryUser.userId));
    expect(unbannedUser[0]?.banned).toBe(false);
  });
});
