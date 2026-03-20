import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import { betterAuthOpenAPIDocsRouter } from "./better-auth-openapi-docs";
import { dashboardRouter } from "./dashboard";
import { userRouter } from "./user";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	privateData: protectedProcedure.handler(({ context }) => {
		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
	betterAuthOpenAPIDocs: betterAuthOpenAPIDocsRouter,
	user: userRouter,
	dashboard: dashboardRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
