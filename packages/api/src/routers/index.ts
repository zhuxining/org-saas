import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { adminRouter } from "./admin";
import { orgRouter } from "./org";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	admin: adminRouter,
	org: orgRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
