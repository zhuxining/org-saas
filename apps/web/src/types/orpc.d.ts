import type { Context } from "@org-sass/api/context";

// 扩展 oRPC privateData 返回的 user 类型
declare module "@/utils/orpc" {
  interface ORPCUtils {
    privateData: {
      queryOptions(): {
        data: {
          message: string;
          user: Context["session"]["user"] & {
            activeOrganizationId?: string | null;
            activeTeamId?: string | null;
          };
        };
      };
    };
  }
}
