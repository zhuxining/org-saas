import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/orgs/new")({
  beforeLoad: ({ location }) => {
    throw redirect({
      to: "/me/organizations/new",
      search: (previous) => previous,
      hash: location.hash,
    });
  },
});
