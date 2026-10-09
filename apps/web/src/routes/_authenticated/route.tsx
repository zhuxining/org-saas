import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getSession } from "@/functions/auth.fn";
import { getSafeReturnTarget } from "@/utils/return-target";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({
        to: "/login",
        search: { redirect: getSafeReturnTarget(location.href) },
      });
    }

    const userId = session.user.id;
    context.queryClient.removeQueries({
      predicate: ({ queryKey }) =>
        (queryKey[0] === "organization" ||
          queryKey[0] === "organizations" ||
          queryKey[0] === "platform") &&
        queryKey[1] !== userId,
    });

    return {
      user: {
        id: userId,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
        role: session.user.role ?? "user",
      },
    };
  },
  component: () => <Outlet />,
});
