import { Alert } from "@org-saas/ui/components/alert";
import { Button } from "@org-saas/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@org-saas/ui/components/card";
import { toast } from "@org-saas/ui/components/toast";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { ArchiveRestore, ArrowLeft } from "lucide-react";

import { useOrgContext } from "@/lib/org-context";
import { organizationQueryKeys } from "@/lib/query-options";
import { ForbiddenError } from "@/utils/errors";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/org/$orgSlug/archived")({
  beforeLoad: ({ context, params }) => {
    if (!context.access.isOwner) {
      throw new ForbiddenError("只有组织所有者可以查看归档状态");
    }
    if (context.access.status === "active") {
      throw redirect({ to: "/org/$orgSlug", params });
    }
  },
  loader: async ({ context }) => {
    const queryKey = [
      ...organizationQueryKeys.root(context.user.id),
      context.org.id,
      "archived-status",
    ] as const;
    await context.queryClient.ensureQueryData({
      queryKey,
      queryFn: () => client.organization.archivedStatus({ organizationId: context.org.id }),
    });
  },
  component: ArchivedOrganizationPage,
});

function ArchivedOrganizationPage() {
  const { org, userId } = useOrgContext();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const queryKey = [...organizationQueryKeys.root(userId), org.id, "archived-status"] as const;
  const { data } = useSuspenseQuery({
    queryKey,
    queryFn: () => client.organization.archivedStatus({ organizationId: org.id }),
  });

  const restoreMutation = useMutation({
    mutationFn: () => client.organization.restore({ organizationId: org.id }),
    onSuccess: async () => {
      toast.add({ title: "组织已恢复", type: "success" });
      await queryClient.invalidateQueries({ queryKey: organizationQueryKeys.root(userId) });
      await router.invalidate();
      await navigate({ to: "/org/$orgSlug", params: { orgSlug: data.slug } });
    },
    onError: (error) => {
      toast.add({ title: error.message || "恢复失败，请重试", type: "error" });
    },
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center p-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>组织已归档</CardTitle>
          <CardDescription>{data.name} 已停止普通组织操作。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert>
            <p>归档期间组织数据会保留，成员、团队和管理页面暂不可访问。</p>
            <p className="text-muted-foreground text-sm">
              归档时间：{new Date(data.archivedAt ?? "").toLocaleString()}
            </p>
          </Alert>
          <div className="flex flex-wrap gap-3">
            <Button disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate()}>
              <ArchiveRestore data-icon="inline-start" />
              {restoreMutation.isPending ? "恢复中..." : "恢复组织"}
            </Button>
            <Button variant="outline" render={<a href="/me/organizations" />}>
              <ArrowLeft data-icon="inline-start" />
              返回我的组织
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
