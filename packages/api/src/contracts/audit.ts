import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

const auditSummary = z.record(z.string(), z.union([z.string(), z.array(z.string())]));
const auditEvent = z.object({
  id: z.string(),
  scope: z.enum(["organization", "platform"]),
  organizationId: z.string().nullable(),
  actorId: z.string(),
  actorName: z.string(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string().nullable(),
  summary: auditSummary,
  occurredAt: z.string().datetime(),
});
const pagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  action: z.string().trim().min(1).max(100).optional(),
  actorId: z.string().trim().min(1).max(200).optional(),
  targetType: z.string().trim().min(1).max(100).optional(),
});
const auditPage = z.object({
  items: z.array(auditEvent),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
});

export const auditContract = {
  listOrganizationEvents: oc
    .meta(
      openapi({
        method: "GET",
        path: "/organizations/{organizationId}/audit",
        summary: "查询组织审计记录",
        tags: ["组织审计"],
      }),
    )
    .errors({
      UNAUTHORIZED: { message: "请先登录" },
      FORBIDDEN: { message: "您无权查看此组织的审计记录" },
      NOT_FOUND: { message: "组织不存在" },
      CONFLICT: { message: "组织所有权状态需要审查" },
    })
    .input(pagination.extend({ organizationId: z.string().min(1).max(200) }))
    .output(auditPage),
  listPlatformEvents: oc
    .meta(
      openapi({
        method: "GET",
        path: "/platform/audit",
        summary: "查询平台管理审计记录",
        tags: ["平台管理"],
      }),
    )
    .errors({
      UNAUTHORIZED: { message: "请先登录" },
      FORBIDDEN: { message: "需要平台管理员权限" },
    })
    .input(pagination)
    .output(auditPage),
};

export type AuditPage = z.infer<typeof auditPage>;
export type AuditEvent = z.infer<typeof auditEvent>;
