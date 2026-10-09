import { auth } from "@org-saas/auth";
import { ORPCError } from "@orpc/server";

import { protectedImplementer } from "../index";

export const userRouter = {
  updateProfile: protectedImplementer.user.updateProfile.handler(async ({ context, input }) => {
    const updated = await auth.api.updateUser({
      body: {
        name: input.name,
        image: input.image,
      },
      headers: context.headers,
    });

    if (!updated) {
      throw new ORPCError("NOT_FOUND", { message: "用户不存在" });
    }

    return updated;
  }),
};
