import type { RouterContractClient } from "@orpc/contract";

import { betterAuthOpenAPIDocsContract } from "./better-auth-openapi-docs";
import { dashboardContract } from "./dashboard";
import { organizationContract } from "./organization";
import { platformContract } from "./platform";
import { systemContract } from "./system";
import { userContract } from "./user";

export const apiContract = {
  ...systemContract,
  betterAuthOpenAPIDocs: betterAuthOpenAPIDocsContract,
  user: userContract,
  dashboard: dashboardContract,
  organization: organizationContract,
  platform: platformContract,
};

export type ApiContractClient = RouterContractClient<typeof apiContract>;
