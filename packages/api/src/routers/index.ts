import type { ApiContractClient } from "../contracts/index";
import { publicImplementer, protectedImplementer } from "../index";
import { betterAuthOpenAPIDocsRouter } from "./better-auth-openapi-docs";
import { dashboardRouter } from "./dashboard";
import { userRouter } from "./user";

const router = {
  healthCheck: publicImplementer.healthCheck.handler(() => {
    return "OK";
  }),
  privateData: protectedImplementer.privateData.handler(({ context }) => {
    const user = context.session.user;

    return {
      message: "This is private",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ?? null,
      },
    };
  }),
  betterAuthOpenAPIDocs: betterAuthOpenAPIDocsRouter,
  user: userRouter,
  dashboard: dashboardRouter,
};

export const appRouter = publicImplementer.router(router);
export type AppRouter = typeof appRouter;
export type AppRouterClient = ApiContractClient;
