import type { auth } from "@org-saas/auth";
import { platformAc, platformRoles } from "@org-saas/auth/platform-permissions";
import { createAuthClient } from "better-auth/client";
import { adminClient, organizationClient } from "better-auth/client/plugins";

// 使用服务端 auth 的类型来创建类型安全的客户端
export const authClient = createAuthClient({
  plugins: [
    adminClient({ ac: platformAc, roles: platformRoles }),
    organizationClient({
      teams: {
        enabled: true,
      },
      dynamicAccessControl: {
        enabled: true,
      },
    }),
  ],
});

// 导出类型供使用
export type Session = typeof auth.$Infer.Session;
export type Organization = typeof auth.$Infer.Organization;
