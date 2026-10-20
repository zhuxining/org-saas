import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

import { organizationErrorData, organizationIdSchema } from "./organization";

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
      FORBIDDEN: { message: "您无权访问此组织", data: organizationErrorData },
      NOT_FOUND: { message: "组织不存在", data: organizationErrorData },
      CONFLICT: { message: "组织所有权状态需要审查", data: organizationErrorData },
    })
    .input(z.object({ orgId: organizationIdSchema }))
    .output(
      z.object({
        memberCount: z.number(),
        teamCount: z.number(),
        pendingInvitationCount: z.number().nullable(),
      }),
    ),
};
