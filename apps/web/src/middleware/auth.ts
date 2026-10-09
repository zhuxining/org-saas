import { createSessionGetter } from "@org-saas/auth/session";
import { createMiddleware } from "@tanstack/react-start";

export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  return next({
    context: {
      getSession: createSessionGetter(request.headers),
      headers: request.headers,
    },
  });
});
