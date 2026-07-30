import { createContext } from "@org-sass/api/context";
import { standardLimiter } from "@org-sass/api/index";
import { appRouter } from "@org-sass/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { RetryAfterPlugin } from "@orpc/client/plugins";
import type { RouterClient } from "@orpc/server";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 分钟，避免挂载时立即重新获取
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      toast.error(`Error: ${error.message}`, {
        action: {
          label: "retry",
          onClick: query.invalidate,
        },
      });
    },
  }),
});

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(appRouter, {
      context: async () => {
        try {
          const headers = getRequestHeaders();

          return {
            ...(await createContext({ headers })),
            ratelimiter: standardLimiter,
          };
        } catch {
          return {
            ...(await createContext({ headers: new Headers() })),
            ratelimiter: standardLimiter,
          };
        }
      },
    }),
  )
  .client((): RouterClient<typeof appRouter> => {
    const link = new RPCLink({
      url: `${window.location.origin}/api/rpc`,
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

export const client: RouterClient<typeof appRouter> = getORPCClient();
export const orpc = createTanstackQueryUtils(client);
