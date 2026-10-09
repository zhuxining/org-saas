import { Button } from "@org-saas/ui/components/button";
import { Separator } from "@org-saas/ui/components/separator";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Home, LogOut, Settings, Users } from "lucide-react";

import { OrgSwitcher } from "@/components/org-switcher";
import { UserAvatar } from "@/components/user-avatar";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_authenticated/me")({
  component: PersonalSpaceLayout,
});

function PersonalSpaceLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();

  const navItems = [
    { to: "/me", label: "个人首页", icon: Home },
    { to: "/me/organizations", label: "我的组织", icon: Users },
    { to: "/me/settings/profile", label: "个人资料", icon: Settings },
  ] as const;

  return (
    <div className="flex min-h-screen">
      <aside className="border-border bg-card flex w-64 shrink-0 flex-col border-r">
        <div className="border-border flex h-14 items-center border-b px-4">
          <Link to="/" className="text-lg font-bold">
            ORG SAAS
          </Link>
        </div>

        <div className="p-3">
          <OrgSwitcher />
        </div>

        <Separator />

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
              activeProps={{
                className: "bg-accent text-accent-foreground font-medium",
              }}
              activeOptions={{ exact: true }}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <Separator />

        <div className="p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => {
              void authClient.signOut({
                fetchOptions: {
                  onSuccess: () => navigate({ to: "/" }),
                },
              });
            }}
          >
            <UserAvatar name={user.name} image={user.image} size="sm" />
            <span className="truncate text-sm">{user.name}</span>
            <LogOut className="ml-auto size-4" />
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
