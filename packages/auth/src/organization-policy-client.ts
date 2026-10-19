import type { BetterAuthClientPlugin } from "better-auth/client";

import type { createOrganizationPolicyPlugin } from "./organization-policy";

export const organizationPolicyClient = () =>
  ({
    id: "organization-policy",
    $InferServerPlugin: {} as ReturnType<typeof createOrganizationPolicyPlugin>,
  }) satisfies BetterAuthClientPlugin;
