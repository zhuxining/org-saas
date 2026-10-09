import { Button } from "@org-saas/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@org-saas/ui/components/dropdown-menu";
import { Separator } from "@org-saas/ui/components/separator";
import { toast } from "@org-saas/ui/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LayoutDashboard, LogOut, Settings, Users, UsersRound } from "lucide-react";

import { OrgSwitcher } from "@/components/org-switcher";
import { UserAvatar } from "@/components/user-avatar";
import { usePermission } from "@/hooks/use-permission";
import { authClient } from "@/lib/auth-client";
import { useOrgContext } from "@/lib/org-context";

export const Route = createFileRoute("/_authenticated/org/$orgSlug/_active")({
  ssr: "data-only",
  beforeLoad: ({ context, params }) => {
    const { access } = context;
    if (access.status === "archived") {
      throw redirect({ to: "/org/$orgSlug/archived", params });
    }
  },
  component: ActiveOrganizationLayout,
});

function ActiveOrganizationLayout() {
  const { org, userId, isOwner, user } = useOrgContextWithUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canUpdateSettings = usePermission({ organization: ["update"] });
  const canArchive = usePermission({ organization: ["archive"] });
  const canReadRoles = usePermission({ ac: ["read"] });

  const navItems = [
    { to: `/org/${org.slug}`, label: "概览", icon: LayoutDashboard, exact: true },
    { to: `/org/${org.slug}/members`, label: "成员", icon: Users },
    { to: `/org/${org.slug}/teams`, label: "团队", icon: UsersRound },
    ...(canReadRoles ? [{ to: `/org/${org.slug}/roles`, label: "角色", icon: Settings }] : []),
    ...(canUpdateSettings || canArchive
      ? [{ to: `/org/${org.slug}/settings`, label: "设置", icon: Settings }]
      : []),
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="border-border bg-card flex w-64 shrink-0 flex-col border-r">
        <div className="border-border flex h-14 items-center gap-2 border-b px-4">
          <Link to="/me" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
          </Link>
          <span className="truncate font-bold">{org.name}</span>
        </div>

        <div className="p-3">
          <OrgSwitcher activeOrgSlug={org.slug} userId={userId} />
        </div>

        <Separator />

        <nav className="flex-1 p-3">
          <div className="flex flex-col gap-1">
            {navItems.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                activeProps={{ className: "bg-accent text-accent-foreground font-medium" }}
                activeOptions={{ exact: exact ?? false }}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </div>
        </nav>

        <Separator />

        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" className="w-full justify-start gap-2" />}
            >
              <UserAvatar name={user.name} image={user.image} size="sm" />
              <span className="truncate text-sm">{user.name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card w-56" align="start">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/me" })}>
                <LayoutDashboard className="size-4" />
                个人中心
              </DropdownMenuItem>
              {isOwner && canArchive && (
                <DropdownMenuItem
                  onClick={() =>
                    navigate({ to: "/org/$orgSlug/settings", params: { orgSlug: org.slug } })
                  }
                >
                  <Settings className="size-4" />
                  组织设置
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  void authClient.signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        queryClient.clear();
                        void navigate({ to: "/" });
                      },
                      onError: (error) => {
                        toast.add({ title: error.error.message ?? "退出失败", type: "error" });
                      },
                    },
                  });
                }}
              >
                <LogOut className="size-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function useOrgContextWithUser() {
  const orgContext = useOrgContext();
  const user = Route.useRouteContext().user;
  return { ...orgContext, user };
}
