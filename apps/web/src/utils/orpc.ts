import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { createContext } from "@wx-mini/api/context";
import { appRouter } from "@wx-mini/api/routers/index";
import { notification } from "antd";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error) => {
			notification.error({
				message: "Request Error",
				description: error.message,
			});
		},
	}),
});

const getORPCClient = createIsomorphicFn()
	.server(() =>
		createRouterClient(appRouter, {
			context: async ({ req }) => {
				return createContext({ req });
			},
		}),
	)
	.client((): RouterClient<typeof appRouter> => {
		const link = new RPCLink({
			url: `${window.location.origin}/api/rpc`,
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
