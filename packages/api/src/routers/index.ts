import type { RouterClient } from "@orpc/server";

import { publicImplementer, protectedImplementer } from "../index";
import { betterAuthOpenAPIDocsRouter } from "./better-auth-openapi-docs";
import { dashboardRouter } from "./dashboard";
import { userRouter } from "./user";

export const appRouter = {
  healthCheck: publicImplementer.healthCheck.handler(() => {
    return "OK";
  }),
  privateData: protectedImplementer.privateData.handler(({ context }) => {
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
