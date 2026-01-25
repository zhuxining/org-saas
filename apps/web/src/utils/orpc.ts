import { createContext } from "@org-sass/api/context";
import { standardLimiter } from "@org-sass/api/index";
import { appRouter } from "@org-sass/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
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
			context: async ({ req }) => {
				return {
					...(await createContext({ req })),
					ratelimiter: standardLimiter,
				};
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

// oRPC + TanStack Query 集成配置
// 使用 experimental_defaults 集中管理默认的 toast 提示
// 注意: 这是实验性 API，可能在未来版本中变化
export const orpc = createTanstackQueryUtils(client, {
	experimental_defaults: {
		organization: {
			// Mutations - 统一的 toast 提示
			createOrganization: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Organization created successfully");
					},
				},
			},
			inviteMember: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Invitation sent successfully");
					},
				},
			},
			removeMember: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Member removed");
					},
				},
			},
			updateMemberRole: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Role updated");
					},
				},
			},
			cancelInvitation: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Invitation cancelled");
					},
				},
			},
			createTeam: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Team created successfully");
					},
				},
			},
			updateTeam: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Team updated successfully");
					},
				},
			},
			removeTeam: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Team deleted");
					},
				},
			},
			addTeamMember: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Member added to team");
					},
				},
			},
			removeTeamMember: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Member removed from team");
					},
				},
			},
			setActiveTeam: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Active team updated");
					},
				},
			},
			updateOrganization: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Organization updated successfully");
					},
				},
			},
			deleteOrganization: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Organization deleted");
					},
				},
			},
			acceptInvitation: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Invitation accepted successfully");
					},
				},
			},
			rejectInvitation: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("Invitation rejected");
					},
				},
			},
		},
		admin: {
			createUser: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("User created successfully");
					},
				},
			},
			setRole: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("User role updated");
					},
				},
			},
			banUser: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("User banned");
					},
				},
			},
			unbanUser: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("User unbanned");
					},
				},
			},
			removeUser: {
				mutationOptions: {
					onSuccess: () => {
						toast.success("User removed");
					},
				},
			},
		},
	},
});
