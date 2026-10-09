import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/profile/")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/me/settings/profile",
      search: (previous) => previous,
      hash: location.hash,
    });
  },
});
