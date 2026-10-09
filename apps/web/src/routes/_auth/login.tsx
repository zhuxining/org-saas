import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { getSignInDestination, getSafeReturnTarget } from "@/utils/return-target";

export const Route = createFileRoute("/_auth/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: getSafeReturnTarget(search.redirect),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const [showSignIn, setShowSignIn] = useState(false);
  const { redirect } = Route.useSearch();
  const redirectTo = getSignInDestination(redirect);

  return showSignIn ? (
    <SignInForm redirectTo={redirectTo} onSwitchToSignUp={() => setShowSignIn(false)} />
  ) : (
    <SignUpForm redirectTo={redirectTo} onSwitchToSignIn={() => setShowSignIn(true)} />
  );
}
