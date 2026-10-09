import { betterAuthOpenAPIDocsContract } from "./better-auth-openapi-docs";
import { dashboardContract } from "./dashboard";
import { systemContract } from "./system";
import { userContract } from "./user";

export const apiContract = {
  ...systemContract,
  betterAuthOpenAPIDocs: betterAuthOpenAPIDocsContract,
  user: userContract,
  dashboard: dashboardContract,
};
