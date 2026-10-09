import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/me",
      search: (previous) => previous,
      hash: location.hash,
    });
  },
});
