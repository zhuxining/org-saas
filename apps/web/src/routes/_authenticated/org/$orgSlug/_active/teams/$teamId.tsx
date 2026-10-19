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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@org-saas/ui/components/select";
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
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { UserAvatar } from "@/components/user-avatar";
import { usePermission } from "@/hooks/use-permission";
import { authClient } from "@/lib/auth-client";
import { useOrgContext } from "@/lib/org-context";
import { syncOrganizationCacheAfterChange } from "@/lib/organization-cache";
import { organizationFullQueryOptions } from "@/lib/query-options";

import { EditTeamDialog } from "./-components/edit-team-dialog";

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
  const canUpdateTeam = usePermission({ team: ["update"] });
  const canManageTeamMembers = usePermission({ member: ["update"] });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
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
  const organizationMembers = data?.members ?? [];
  const assignedUserIds = new Set(teamMembers.map((member) => member.userId));
  const availableMembers = organizationMembers.filter(
    (member) => !assignedUserIds.has(member.userId),
  );

  const teamMemberMutation = useMutation({
    mutationFn: async (input: { userId: string; action: "add" | "remove" }) => {
      const result =
        input.action === "add"
          ? await authClient.organization.addTeamMember({
              teamId,
              userId: input.userId,
              organizationId: org.id,
            })
          : await authClient.organization.removeTeamMember({
              teamId,
              userId: input.userId,
              organizationId: org.id,
            });
      if (result.error) throw new Error(result.error.message ?? "团队成员更新失败");
    },
    onSuccess: async (_, input) => {
      toast.add({
        title: input.action === "add" ? "成员已加入团队" : "成员已移出团队",
        type: "success",
      });
      if (input.action === "add") setSelectedUserId("");
      await syncOrganizationCacheAfterChange(queryClient, userId, org.id, "team-member-changed");
    },
    onError: (error) => toast.add({ title: error.message || "团队成员更新失败", type: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.organization.removeTeam({ teamId, organizationId: org.id });
      if (result.error) throw new Error(result.error.message ?? "删除团队失败");
    },
    onSuccess: async () => {
      toast.add({ title: "团队已删除", type: "success" });
      setDeleteOpen(false);
      await syncOrganizationCacheAfterChange(queryClient, userId, org.id, "team-deleted");
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
          <div className="flex items-center gap-2">
            {canUpdateTeam && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil data-icon="inline-start" />
                修改名称
              </Button>
            )}
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
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">团队成员</CardTitle>
          {canManageTeamMembers && (
            <div className="flex items-center gap-2">
              <Select
                value={selectedUserId}
                onValueChange={(value) => setSelectedUserId(value ?? "")}
              >
                <SelectTrigger aria-label="选择要加入团队的组织成员" className="min-w-56">
                  <SelectValue placeholder="选择组织成员" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {availableMembers.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.user.name}（{member.user.email}）
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!selectedUserId || teamMemberMutation.isPending}
                onClick={() => teamMemberMutation.mutate({ userId: selectedUserId, action: "add" })}
              >
                {teamMemberMutation.isPending ? "处理中…" : "加入团队"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <p className="text-muted-foreground text-sm">此团队暂无成员</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>成员</TableHead>
                  {canManageTeamMembers && <TableHead className="w-24">操作</TableHead>}
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
                    {canManageTeamMembers && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={teamMemberMutation.isPending}
                          onClick={() =>
                            teamMemberMutation.mutate({ userId: member.userId, action: "remove" })
                          }
                        >
                          移出团队
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <EditTeamDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        orgId={org.id}
        teamId={team.id}
        teamName={team.name}
      />
    </div>
  );
}
