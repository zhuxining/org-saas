import { db } from "@org-saas/db";
import * as schema from "@org-saas/db/schema/auth";
import { env } from "@org-saas/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { createOrganizationPolicyPlugin } from "./organization-policy";
import { withOrganizationMutationTransactions } from "./organization-transaction";
import { ac, roles } from "./permissions";
import { platformAc, platformAdminRoles, platformRoles } from "./platform-permissions";

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
  teams: {
    enabled: true,
    maximumTeams: 10, // Optional: limit teams per organization
    allowRemovingAllTeams: false, // Optional: prevent removing the last team
  },
  ac,
  dynamicAccessControl: {
    enabled: true,
  },
  roles,
} as const;

const authInstance = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: schema,
    transaction: true,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  session: {
    additionalFields: {
      token: {
        type: "string",
        required: true,
        input: false,
        returned: false,
      },
    },
  },
  plugins: [
    admin({
      ac: platformAc,
      roles: platformRoles,
      defaultRole: "user",
      adminRoles: [...platformAdminRoles],
    }),
    openAPI(), // `http://localhost:3001/api/auth/reference`
    tanstackStartCookies(),
    organization(organizationOptions),
    createOrganizationPolicyPlugin(organizationOptions, platformAdminRoles),
  ],
});

export const auth = withOrganizationMutationTransactions(authInstance);

// 导出类型供客户端使用
export type Auth = typeof auth;
