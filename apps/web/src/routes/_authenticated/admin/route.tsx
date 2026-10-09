import { Separator } from "@org-saas/ui/components/separator";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Building2, Users } from "lucide-react";

import { requirePlatformAdmin } from "@/utils/guards";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: "data-only",
  beforeLoad: ({ context }) => requirePlatformAdmin(context.user.role),
  component: PlatformAdminLayout,
});

function PlatformAdminLayout() {
  const links = [
    { to: "/admin/users", label: "用户", icon: Users },
    { to: "/admin/organizations", label: "组织", icon: Building2 },
  ] as const;

  return (
    <div className="flex min-h-screen">
      <aside className="border-border bg-card flex w-64 shrink-0 flex-col border-r">
        <div className="border-border flex h-14 items-center border-b px-4">
          <Link to="/me" className="font-bold">
            平台管理
          </Link>
        </div>
        <nav className="flex-1 p-3">
          <div className="flex flex-col gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm"
                activeProps={{ className: "bg-accent text-accent-foreground font-medium" }}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </div>
        </nav>
        <Separator />
        <div className="p-3">
          <Link to="/me" className="text-muted-foreground hover:text-foreground text-sm">
            返回个人中心
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
