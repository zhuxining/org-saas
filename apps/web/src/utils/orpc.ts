import { createContext } from "@org-saas/api/context";
import type { ApiContractClient } from "@org-saas/api/contracts/index";
import { standardLimiter } from "@org-saas/api/index";
import { appRouter } from "@org-saas/api/routers/index";
import { toast } from "@org-saas/ui/components/toast";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { RetryAfterPlugin } from "@orpc/client/plugins";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 分钟，避免挂载时立即重新获取
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        toast.add({
          title: `Error: ${error.message}`,
          type: "error",
          actionProps: {
            children: "retry",
            onClick: () => query.invalidate(),
          },
        });
      },
    }),
  });
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
      plugins: [
        new RetryAfterPlugin({
          condition: (response, _options) => {
            // Override condition to determine if a request should be retried
            return response.status === 429 || response.status === 503;
          },
          maxAttempts: 5, // Maximum retry attempts
          timeout: 5 * 60 * 1000, // Maximum time to spend retrying (ms)
        }),
      ],
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
