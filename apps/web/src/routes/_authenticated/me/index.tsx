import { Button } from "@org-saas/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@org-saas/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, UserRound } from "lucide-react";

import { UserAvatar } from "@/components/user-avatar";

export const Route = createFileRoute("/_authenticated/me/")({
  component: PersonalOverview,
});

function PersonalOverview() {
  const { user } = Route.useRouteContext();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">个人中心</h1>
        <p className="text-muted-foreground text-sm">管理你的个人资料和组织入口</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-4">
          <UserAvatar name={user.name} image={user.image} size="lg" />
          <div className="min-w-0">
            <CardTitle className="truncate">{user.name}</CardTitle>
            <CardDescription className="truncate">{user.email}</CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <Building2 className="text-muted-foreground mb-2 size-5" />
            <CardTitle>我的组织</CardTitle>
            <CardDescription>查看你可以访问的组织，或创建新组织</CardDescription>
            <Button render={<Link to="/me/organizations" />} className="mt-2 w-fit">
              查看组织
            </Button>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <UserRound className="text-muted-foreground mb-2 size-5" />
            <CardTitle>个人资料</CardTitle>
            <CardDescription>更新你的姓名和头像</CardDescription>
            <Button
              variant="outline"
              render={<Link to="/me/settings/profile" />}
              className="mt-2 w-fit"
            >
              编辑资料
            </Button>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
