import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { getSession } from "@/functions/auth.fn";
import { getSafeReturnTarget } from "@/utils/return-target";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const session = await getSession();

    if (!session?.user) {
      throw redirect({
        to: "/login",
        search: { redirect: getSafeReturnTarget(location.href) },
      });
    }

    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      },
    };
  },
  component: () => <Outlet />,
});
