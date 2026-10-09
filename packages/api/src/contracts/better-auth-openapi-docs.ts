import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

export const betterAuthOpenAPIDocsContract = {
  getOpenAPISchema: oc
    .meta(
      openapi({
        method: "GET",
        path: "/better-auth/openapi",
        summary: "获取 Better Auth OpenAPI Schema",
        tags: ["认证"],
      }),
    )
    .output(z.unknown()),
};
