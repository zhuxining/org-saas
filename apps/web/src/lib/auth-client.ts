import type { auth } from "@org-sass/auth";
import { createAuthClient } from "better-auth/client";
import { organizationClient } from "better-auth/client/plugins";

// 使用服务端 auth 的类型来创建类型安全的客户端
export const authClient = createAuthClient({
  plugins: [
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
