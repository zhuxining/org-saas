import type {} from "@/utils/orpc";

// 扩展 oRPC privateData 返回的 user 类型
declare module "@/utils/orpc" {
  interface ORPCUtils {
    privateData: {
      queryOptions(): {
        data: {
          message: string;
          user: {
            id: string;
            name: string;
            email: string;
            image?: string | null;
            activeOrganizationId?: string | null;
            activeTeamId?: string | null;
          };
        };
      };
    };
  }
}
