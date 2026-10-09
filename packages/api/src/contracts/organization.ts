import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

const organizationIdInput = z.object({ organizationId: z.string().min(1).max(200) });

const organizationStatusOutput = z.object({
  organizationId: z.string(),
  status: z.enum(["active", "archived"]),
  archivedAt: z.string().datetime().nullable(),
});

const effectiveOperationsSchema = z.object({
  organization: z.object({ update: z.boolean(), archive: z.boolean(), restore: z.boolean() }),
  member: z.object({ create: z.boolean(), update: z.boolean(), delete: z.boolean() }),
  invitation: z.object({ create: z.boolean(), cancel: z.boolean(), viewPending: z.boolean() }),
  team: z.object({ create: z.boolean(), update: z.boolean(), delete: z.boolean() }),
  roleDefinition: z.object({
    read: z.boolean(),
    create: z.boolean(),
    update: z.boolean(),
    delete: z.boolean(),
  }),
});

export const organizationContract = {
  accessContext: oc
    .meta(
      openapi({
        method: "GET",
        path: "/organizations/{organizationId}/access-context",
        summary: "获取当前用户的组织访问上下文",
        tags: ["组织权限"],
      }),
    )
    .errors({
      UNAUTHORIZED: { message: "请先登录" },
      FORBIDDEN: { message: "您无权访问此组织" },
      NOT_FOUND: { message: "组织不存在" },
      CONFLICT: { message: "组织所有权状态需要审查" },
    })
    .input(organizationIdInput)
    .output(
      z.object({
        organizationId: z.string(),
        role: z.string(),
        isOwner: z.boolean(),
        status: z.enum(["active", "archived"]),
        operations: effectiveOperationsSchema,
      }),
    ),
  archive: oc
    .meta(
      openapi({
        method: "POST",
        path: "/organizations/{organizationId}/archive",
        summary: "归档组织",
        tags: ["组织生命周期"],
      }),
    )
    .errors({
      UNAUTHORIZED: { message: "请先登录" },
      FORBIDDEN: { message: "仅当前组织所有者可以归档组织" },
      NOT_FOUND: { message: "组织不存在" },
      CONFLICT: { message: "组织所有权状态需要审查" },
    })
    .input(organizationIdInput)
    .output(organizationStatusOutput),
  restore: oc
    .meta(
      openapi({
        method: "POST",
        path: "/organizations/{organizationId}/restore",
        summary: "恢复已归档组织",
        tags: ["组织生命周期"],
      }),
    )
    .errors({
      UNAUTHORIZED: { message: "请先登录" },
      FORBIDDEN: { message: "仅当前组织所有者可以恢复组织" },
      NOT_FOUND: { message: "组织不存在" },
      CONFLICT: { message: "组织当前状态不允许恢复" },
    })
    .input(organizationIdInput)
    .output(organizationStatusOutput),
  archivedStatus: oc
    .meta(
      openapi({
        method: "GET",
        path: "/organizations/{organizationId}/archived-status",
        summary: "获取组织归档恢复所需的最小状态",
        tags: ["组织生命周期"],
      }),
    )
    .errors({
      UNAUTHORIZED: { message: "请先登录" },
      FORBIDDEN: { message: "仅当前组织所有者可以查看归档状态" },
      NOT_FOUND: { message: "已归档组织不存在" },
      CONFLICT: { message: "组织所有权状态需要审查" },
    })
    .input(organizationIdInput)
    .output(
      organizationStatusOutput.extend({
        name: z.string(),
        slug: z.string(),
      }),
    ),
};

export type EffectiveOrganizationOperations = z.infer<typeof effectiveOperationsSchema>;
