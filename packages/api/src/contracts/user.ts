import { oc } from "@orpc/contract";
import { openapi } from "@orpc/openapi";
import { z } from "zod";

export const userProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  image: z.string().nullable(),
});

export const userContract = {
  updateProfile: oc
    .meta(
      openapi({ method: "PATCH", path: "/profile", summary: "更新当前用户资料", tags: ["用户"] }),
    )
    .errors({ UNAUTHORIZED: { message: "请先登录" } })
    .input(
      z.object({
        name: z.string().min(2).max(50).optional(),
        image: z.string().url().optional(),
      }),
    )
    .output(z.object({ status: z.boolean() })),
};
