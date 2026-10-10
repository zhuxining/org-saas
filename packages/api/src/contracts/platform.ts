import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

export const platformPaginationInput = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

const organizationSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  archived: z.boolean(),
  createdAt: z.string().datetime(),
});

const userSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  image: z.string().nullable(),
  emailVerified: z.boolean(),
  banned: z.boolean(),
  createdAt: z.string().datetime(),
});

function paginatedOutput<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative(),
  });
}

export const platformContract = {
  listOrganizations: oc
    .meta(
      openapi({
        method: "GET",
        path: "/platform/organizations",
        summary: "分页查询组织基础信息",
        tags: ["平台管理"],
      }),
    )
    .errors({
      UNAUTHORIZED: { message: "请先登录" },
      FORBIDDEN: { message: "需要平台管理员权限" },
    })
    .input(platformPaginationInput)
    .output(paginatedOutput(organizationSummarySchema)),
  listUsers: oc
    .meta(
      openapi({
        method: "GET",
        path: "/platform/users",
        summary: "分页查询普通用户基础信息",
        tags: ["平台管理"],
      }),
    )
    .errors({
      UNAUTHORIZED: { message: "请先登录" },
      FORBIDDEN: { message: "需要平台管理员权限" },
    })
    .input(platformPaginationInput)
    .output(paginatedOutput(userSummarySchema)),
};

export type PlatformPaginationInput = z.infer<typeof platformPaginationInput>;
