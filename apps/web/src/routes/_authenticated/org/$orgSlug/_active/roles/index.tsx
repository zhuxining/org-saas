import { roles as builtInRoles } from "@org-saas/auth/permissions";
import { Alert, AlertDescription, AlertTitle } from "@org-saas/ui/components/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@org-saas/ui/components/alert-dialog";
import { Badge } from "@org-saas/ui/components/badge";
import { Button } from "@org-saas/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@org-saas/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@org-saas/ui/components/table";
import { toast } from "@org-saas/ui/components/toast";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { useOrgContext } from "@/lib/org-context";
import {
  organizationFullQueryOptions,
  organizationQueryKeys,
  organizationRolesQueryOptions,
} from "@/lib/query-options";
import { ForbiddenError } from "@/utils/errors";

import { RoleEditorDialog, type RoleDraft } from "./-components/role-editor-dialog";

const permissionCatalog = builtInRoles.owner.statements as unknown as Record<string, string[]>;
const builtIns = Object.entries(builtInRoles).map(([name, role]) => ({
  name,
  permission: role.statements as unknown as Record<string, string[]>,
}));

export const Route = createFileRoute("/_authenticated/org/$orgSlug/_active/roles/")({
  beforeLoad: ({ context }) => {
    if (!context.access.operations.roleDefinition.read) {
      throw new ForbiddenError("您没有查看组织角色定义的权限");
    }
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      organizationFullQueryOptions(context.user.id, context.org.id),
    );
  },
  component: OrganizationRolesPage,
});

function OrganizationRolesPage() {
  const { access, org, userId } = useOrgContext();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<RoleDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [roleFeedback, setRoleFeedback] = useState<string | null>(null);
  const rolesQuery = useQuery(organizationRolesQueryOptions(userId, org.id));
  const { data: organizationData } = useSuspenseQuery(organizationFullQueryOptions(userId, org.id));
  const members = organizationData?.members ?? [];
  const invitations = organizationData?.invitations ?? [];
  const canViewInvitations = access.operations.invitation.viewPending;
  const canCreate = access.operations.roleDefinition.create;
  const canUpdate = access.operations.roleDefinition.update;
  const canDelete = access.operations.roleDefinition.delete;

  const invalidateRoleData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: organizationQueryKeys.roles(userId, org.id) }),
      queryClient.invalidateQueries({ queryKey: organizationQueryKeys.full(userId, org.id) }),
      queryClient.invalidateQueries({ queryKey: organizationQueryKeys.access(userId, org.id) }),
      queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.grantableRoles(userId, org.id, "member.update"),
      }),
      queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.grantableRoles(userId, org.id, "invitation.create"),
      }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: async (value: RoleDraft) => {
      if (value.id) {
        const result = await authClient.organization.updateRole({
          organizationId: org.id,
          roleId: value.id,
          data: { roleName: value.name, permission: value.permission },
        });
        if (result.error) throw new Error(result.error.message ?? "保存角色失败");
      } else {
        const result = await authClient.organization.createRole({
          organizationId: org.id,
          role: value.name,
          permission: value.permission,
        });
        if (result.error) throw new Error(result.error.message ?? "创建角色失败");
      }
    },
    onSuccess: async () => {
      toast.add({ title: "角色已保存", type: "success" });
      setDraft(null);
      await invalidateRoleData();
    },
    onError: (error) => {
      const message = error.message || "角色保存失败，请重试";
      setRoleFeedback(message);
      toast.add({ title: message, type: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const result = await authClient.organization.deleteRole({
        organizationId: org.id,
        roleId,
      });
      if (result.error) throw new Error(result.error.message ?? "删除角色失败");
    },
    onSuccess: async () => {
      toast.add({ title: "角色已删除", type: "success" });
      setDeleteTarget(null);
      await invalidateRoleData();
    },
    onError: (error) => {
      const message = error.message || "角色仍被成员或待处理邀请引用";
      setRoleFeedback(message);
      toast.add({ title: message, type: "error" });
    },
  });

  const openDraft = (value: RoleDraft) => {
    setRoleFeedback(null);
    setDraft(value);
  };

  const memberCount = (role: string) => members.filter((member) => member.role === role).length;
  const invitationCount = (role: string) =>
    invitations.filter((invitation) => invitation.status === "pending" && invitation.role === role)
      .length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">组织角色</h1>
          <p className="text-muted-foreground text-sm">
            预置角色只读；自定义角色仅组合服务端支持且当前操作者可授予的权限。
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => openDraft({ name: "", permission: {} })}>
            <Plus data-icon="inline-start" />
            创建角色
          </Button>
        )}
      </div>

      {roleFeedback && (
        <Alert variant="destructive">
          <AlertTitle>角色操作未完成</AlertTitle>
          <AlertDescription>{roleFeedback}</AlertDescription>
          <p className="text-sm">
            如果角色仍被使用，请先在成员页面调整成员角色；待处理邀请需要有邀请权限的成员先取消。
          </p>
        </Alert>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">预置角色</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {builtIns.map(({ name, permission }) => (
            <Card key={name}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{name}</span>
                  <Badge variant="outline">预置 · 只读</Badge>
                </CardTitle>
                <CardDescription>平台维护的组织角色定义。</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <PermissionBadges permission={permission} />
                {canCreate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      openDraft({
                        name: `${name}-copy`,
                        permission: Object.fromEntries(
                          Object.entries(permission).map(([resource, actions]) => [
                            resource,
                            [...actions],
                          ]),
                        ),
                      })
                    }
                  >
                    <Copy data-icon="inline-start" />
                    复制权限
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>自定义角色</CardTitle>
          <CardDescription>
            保存角色会影响列出的成员数量。删除操作会由服务端再次检查成员和待处理邀请引用。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rolesQuery.isPending ? (
            <p className="text-muted-foreground text-sm">正在读取角色…</p>
          ) : rolesQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>无法读取角色</AlertTitle>
              <AlertDescription>{rolesQuery.error.message}</AlertDescription>
            </Alert>
          ) : rolesQuery.data.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">尚未创建自定义角色</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>角色</TableHead>
                  <TableHead>权限</TableHead>
                  <TableHead>成员</TableHead>
                  <TableHead>待处理邀请</TableHead>
                  <TableHead className="w-40">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolesQuery.data.map((role) => {
                  const permission = normalizePermission(role.permission);
                  const assignedMembers = memberCount(role.role);
                  const pendingInvitations = invitationCount(role.role);
                  const grantable = withinGrantBoundary(permission, access);
                  const adminEquivalent = hasAdminPermissions(permission);
                  const protectedRole = adminEquivalent && !access.isOwner;
                  const blockedByReferences =
                    assignedMembers > 0 || (canViewInvitations && pendingInvitations > 0);

                  return (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.role}</TableCell>
                      <TableCell>
                        <PermissionBadges permission={permission} />
                      </TableCell>
                      <TableCell>{assignedMembers}</TableCell>
                      <TableCell>{canViewInvitations ? pendingInvitations : "受限"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {canUpdate && grantable && !protectedRole && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openDraft({
                                  id: role.id,
                                  name: role.role,
                                  permission,
                                })
                              }
                            >
                              编辑
                            </Button>
                          )}
                          {canDelete && !protectedRole && (
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={blockedByReferences || deleteMutation.isPending}
                              aria-label={`删除角色 ${role.role}`}
                              onClick={() => setDeleteTarget({ id: role.id, name: role.role })}
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                        {assignedMembers > 0 && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            先为这些成员调整角色后才能删除。
                          </p>
                        )}
                        {canViewInvitations && pendingInvitations > 0 && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            先取消引用此角色的待处理邀请。
                          </p>
                        )}
                        {!canViewInvitations && canDelete && (
                          <p className="text-muted-foreground mt-1 text-xs">
                            待处理邀请引用由服务器在删除时检查。
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RoleEditorDialog
        key={draft ? `${draft.id ?? "new"}:${draft.name}` : "closed"}
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
        initialDraft={draft}
        catalog={permissionCatalog}
        access={access}
        affectedMemberCount={draft?.id ? memberCount(draft.name) : 0}
        isSaving={saveMutation.isPending}
        onSave={(value) => saveMutation.mutate(value)}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除自定义角色“{deleteTarget?.name}”？</AlertDialogTitle>
            <AlertDialogDescription>
              有成员或待处理邀请引用时，服务端会拒绝删除。请先调整成员角色或处理邀请。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!deleteTarget || deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "删除中…" : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function normalizePermission(value: unknown): Record<string, string[]> {
  if (typeof value === "string") {
    try {
      return normalizePermission(JSON.parse(value) as unknown);
    } catch {
      return {};
    }
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string[]] =>
        Array.isArray(entry[1]) && entry[1].every((action) => typeof action === "string"),
    ),
  );
}

function withinGrantBoundary(
  permission: Record<string, string[]>,
  access: ReturnType<typeof useOrgContext>["access"],
): boolean {
  const operations = access.operations as unknown as Record<string, Record<string, boolean>>;
  return Object.entries(permission).every(([resource, actions]) =>
    actions.every(
      (action) => operations[resource === "ac" ? "roleDefinition" : resource]?.[action] === true,
    ),
  );
}

function hasAdminPermissions(permission: Record<string, string[]>): boolean {
  const admin = builtInRoles.admin.statements as unknown as Record<string, string[]>;
  return Object.entries(admin).every(([resource, actions]) =>
    actions.every((action) => permission[resource]?.includes(action)),
  );
}

function PermissionBadges({ permission }: { permission: Record<string, string[]> }) {
  const entries = Object.entries(permission).flatMap(([resource, actions]) =>
    actions.map((action) => `${resource}.${action}`),
  );
  if (entries.length === 0)
    return <span className="text-muted-foreground text-sm">无额外权限</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map((entry) => (
        <Badge key={entry} variant="secondary">
          {entry}
        </Badge>
      ))}
    </div>
  );
}
