import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

import { userProfileSchema } from "./user";

export const systemContract = {
  healthCheck: oc
    .meta(openapi({ method: "GET", path: "/health", summary: "服务健康检查", tags: ["系统"] }))
    .output(z.literal("OK")),
  privateData: oc
    .meta(openapi({ method: "GET", path: "/me", summary: "获取当前用户信息", tags: ["系统"] }))
    .errors({ UNAUTHORIZED: { message: "请先登录" } })
    .output(
      z.object({
        message: z.string(),
        user: userProfileSchema,
      }),
    ),
};
