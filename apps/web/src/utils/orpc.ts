import { createContext } from "@org-saas/api/context";
import type { ApiContractClient } from "@org-saas/api/contracts/index";
import { standardLimiter } from "@org-saas/api/index";
import { appRouter } from "@org-saas/api/routers/index";
import { toast } from "@org-saas/ui/components/toast";
import { COMMON_ERROR_STATUS_MAP, createORPCClient, ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

export function createQueryClient(): QueryClient {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 分钟，避免挂载时立即重新获取
        retry: false,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.state.data === undefined) return;
        const status =
          error instanceof ORPCError
            ? COMMON_ERROR_STATUS_MAP[error.code as keyof typeof COMMON_ERROR_STATUS_MAP]
            : undefined;
        const data: unknown = error instanceof ORPCError ? error.data : undefined;
        const requestId =
          typeof data === "object" && data !== null && "requestId" in data
            ? data.requestId
            : undefined;
        toast.add({
          title:
            status !== undefined && status >= 400 && status < 500 && error.message.trim()
              ? error.message
              : "暂时无法完成请求，请稍后重试",
          description:
            typeof requestId === "string" && /^[a-zA-Z0-9_-]{8,128}$/.test(requestId)
              ? `问题编号：${requestId}`
              : undefined,
          type: "error",
          actionProps: {
            children: "重试",
            onClick: () => {
              void queryClient.refetchQueries({ queryKey: query.queryKey, exact: true });
            },
          },
        });
      },
    }),
  });
  return queryClient;
}

const getORPCClient = createIsomorphicFn()
  .server((): ApiContractClient =>
    createRouterClient(appRouter, {
      context: async () => {
        try {
          const headers = getRequestHeaders();

          return {
            ...createContext({ headers }),
            ratelimiter: standardLimiter,
          };
        } catch {
          return {
            ...createContext({ headers: new Headers() }),
            ratelimiter: standardLimiter,
          };
        }
      },
    }),
  )
  .client((): ApiContractClient => {
    const link = new RPCLink({
      origin: window.location.origin,
      url: "/api/rpc",
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    });

    return createORPCClient(link);
  });

export const client: ApiContractClient = getORPCClient();
export const orpc = createTanstackQueryUtils(client);
