import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@org-saas/ui/components/alert-dialog";
import { Button } from "@org-saas/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@org-saas/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@org-saas/ui/components/table";
import { toast } from "@org-saas/ui/components/toast";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";

import { UserAvatar } from "@/components/user-avatar";
import { usePermission } from "@/hooks/use-permission";
import { authClient } from "@/lib/auth-client";
import { useOrgContext } from "@/lib/org-context";
import { organizationFullQueryOptions, organizationQueryKeys } from "@/lib/query-options";

export const Route = createFileRoute("/_authenticated/org/$orgSlug/_active/teams/$teamId")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      organizationFullQueryOptions(context.user.id, context.org.id),
    );
  },
  component: TeamDetailPage,
});

function TeamDetailPage() {
  const { org, userId } = useOrgContext();
  const { orgSlug, teamId } = Route.useParams();
  const canDeleteTeam = usePermission({ team: ["delete"] });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data } = useSuspenseQuery(organizationFullQueryOptions(userId, org.id));
  const teams = data?.teams as unknown as
    | Array<{
        id: string;
        name: string;
        members?: Array<{
          userId: string;
          user: { name: string; email: string; image?: string | null };
        }>;
      }>
    | undefined;
  const team = teams?.find((candidate) => candidate.id === teamId);
  const teamMembers = team?.members ?? [];

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.organization.removeTeam({ teamId, organizationId: org.id });
      if (result.error) throw new Error(result.error.message ?? "删除团队失败");
    },
    onSuccess: async () => {
      toast.add({ title: "团队已删除", type: "success" });
      setDeleteOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationQueryKeys.full(userId, org.id) }),
        queryClient.invalidateQueries({ queryKey: organizationQueryKeys.access(userId, org.id) }),
      ]);
      await navigate({ to: "/org/$orgSlug/teams", params: { orgSlug } });
    },
    onError: (error) => toast.add({ title: error.message || "删除失败，请重试", type: "error" }),
  });

  if (!team) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">团队不存在</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          to="/org/$orgSlug/teams"
          params={{ orgSlug }}
          className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" />
          返回团队列表
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{team.name}</h1>
          {canDeleteTeam && (
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger
                render={
                  <Button variant="destructive" size="sm" disabled={deleteMutation.isPending} />
                }
              >
                <Trash2 data-icon="inline-start" />
                删除团队
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>删除团队“{team.name}”？</AlertDialogTitle>
                  <AlertDialogDescription>团队成员关系会被移除。</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                  >
                    {deleteMutation.isPending ? "删除中…" : "确认删除"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">团队成员</CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <p className="text-muted-foreground text-sm">此团队暂无成员</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>成员</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member) => (
                  <TableRow key={member.userId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar name={member.user.name} image={member.user.image} />
                        <div>
                          <p className="font-medium">{member.user.name}</p>
                          <p className="text-muted-foreground text-sm">{member.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
