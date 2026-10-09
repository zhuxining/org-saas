import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

export const dashboardContract = {
  orgStats: oc
    .meta(
      openapi({
        method: "GET",
        path: "/organizations/{orgId}/stats",
        summary: "获取组织统计数据",
        tags: ["组织"],
      }),
    )
    .errors({
      UNAUTHORIZED: { message: "请先登录" },
      FORBIDDEN: { message: "您无权访问此组织" },
    })
    .input(z.object({ orgId: z.string() }))
    .output(
      z.object({
        memberCount: z.number(),
        teamCount: z.number(),
        pendingInvitationCount: z.number().nullable(),
      }),
    ),
};
