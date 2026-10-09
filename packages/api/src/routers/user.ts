import { auth } from "@org-saas/auth";

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

    return updated;
  }),
};
