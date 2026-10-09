import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

const organizationIdInput = z.object({ organizationId: z.string().min(1).max(200) });

const organizationStatusOutput = z.object({
  organizationId: z.string(),
  status: z.enum(["active", "archived"]),
  archivedAt: z.string().datetime().nullable(),
});

const organizationSummaryOutput = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  createdAt: z.string().datetime(),
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

const organizationAccessOutput = z.object({
  organizationId: z.string(),
  role: z.string(),
  isOwner: z.boolean(),
  status: z.enum(["active", "archived"]),
  operations: effectiveOperationsSchema,
});

export const organizationContract = {
  resolveBySlug: oc
    .meta(
      openapi({
        method: "GET",
        path: "/organizations/by-slug/{slug}",
        summary: "解析当前用户可访问的组织上下文",
        tags: ["组织权限"],
      }),
    )
    .errors({
      UNAUTHORIZED: { message: "请先登录" },
      FORBIDDEN: { message: "您无权访问此组织" },
      NOT_FOUND: { message: "组织不存在" },
      CONFLICT: { message: "组织所有权状态需要审查" },
    })
    .input(z.object({ slug: z.string().min(1).max(200) }))
    .output(
      z.object({
        organization: organizationSummaryOutput,
        access: organizationAccessOutput,
      }),
    ),
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
    .output(organizationAccessOutput),
  grantableRoles: oc
    .meta(
      openapi({
        method: "GET",
        path: "/organizations/{organizationId}/grantable-roles",
        summary: "获取当前用户可授予的组织角色名称",
        tags: ["组织权限"],
      }),
    )
    .errors({
      UNAUTHORIZED: { message: "请先登录" },
      FORBIDDEN: { message: "您无权在此组织授予角色" },
      NOT_FOUND: { message: "组织不存在" },
      CONFLICT: { message: "组织所有权状态需要审查" },
    })
    .input(
      organizationIdInput.extend({
        operation: z.enum(["member.create", "member.update", "invitation.create"]),
      }),
    )
    .output(z.array(z.object({ name: z.string(), custom: z.boolean() }))),
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
export type OrganizationAccessContext = z.infer<typeof organizationAccessOutput>;
