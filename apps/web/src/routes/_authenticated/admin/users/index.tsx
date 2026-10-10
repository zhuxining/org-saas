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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@org-saas/ui/components/dialog";
import { Field, FieldGroup, FieldLabel } from "@org-saas/ui/components/field";
import { Input } from "@org-saas/ui/components/input";
import { Skeleton } from "@org-saas/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@org-saas/ui/components/table";
import { toast } from "@org-saas/ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import {
  platformQueryKeys,
  platformUserSessionsQueryOptions,
  platformUsersQueryOptions,
} from "@/lib/query-options";

const PAGE_SIZE = 25;

export const Route = createFileRoute("/_authenticated/admin/users/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      platformUsersQueryOptions(context.user.id, { limit: PAGE_SIZE, offset: 0 }),
    );
  },
  component: PlatformUsersPage,
});

function PlatformUsersPage() {
  const user = Route.useRouteContext().user;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [banTarget, setBanTarget] = useState<{
    id: string;
    name: string;
    banned: boolean;
  } | null>(null);
  const [banReason, setBanReason] = useState("");
  const [sessionsTarget, setSessionsTarget] = useState<{ id: string; name: string } | null>(null);
  const [revokeSessionsOpen, setRevokeSessionsOpen] = useState(false);
  const input = {
    search: search.trim() || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const query = useQuery(platformUsersQueryOptions(user.id, input));
  const sessionsQuery = useQuery({
    ...platformUserSessionsQueryOptions(user.id, sessionsTarget?.id ?? ""),
    enabled: sessionsTarget !== null,
  });
  const data = query.data;
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  const banMutation = useMutation({
    mutationFn: async (target: { id: string; banned: boolean; reason: string }) => {
      const result = target.banned
        ? await authClient.admin.unbanUser({ userId: target.id })
        : await authClient.admin.banUser({
            userId: target.id,
            banReason: target.reason,
          });
      if (result.error) throw new Error(result.error.message ?? "更新账号状态失败");
    },
    onSuccess: async (_result, target) => {
      toast.add({ title: target.banned ? "用户已解封" : "用户已封禁", type: "success" });
      setBanTarget(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...platformQueryKeys.root(user.id), "users"] }),
        queryClient.invalidateQueries({
          queryKey: platformQueryKeys.userSessions(user.id, target.id),
        }),
      ]);
    },
    onError: (error) => toast.add({ title: error.message || "更新账号状态失败", type: "error" }),
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const result = await authClient.admin.revokeUserSessions({ userId: targetUserId });
      if (result.error) throw new Error(result.error.message ?? "撤销会话失败");
    },
    onSuccess: async () => {
      toast.add({ title: "用户会话已撤销", type: "success" });
      setRevokeSessionsOpen(false);
      if (sessionsTarget) {
        await queryClient.invalidateQueries({
          queryKey: platformQueryKeys.userSessions(user.id, sessionsTarget.id),
        });
      }
    },
    onError: (error) => toast.add({ title: error.message || "撤销会话失败", type: "error" }),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">平台用户</h1>
        <p className="text-muted-foreground text-sm">查询普通用户、管理账号封禁状态及登录会话。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户目录</CardTitle>
          <CardDescription>平台管理员账号不出现在普通用户管理列表中。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup className="gap-2">
            <Field>
              <FieldLabel htmlFor="user-search">按姓名或邮箱搜索</FieldLabel>
              <Input
                id="user-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="输入姓名或邮箱"
              />
            </Field>
          </FieldGroup>

          {query.isError && (
            <Alert variant="destructive">
              <AlertTitle>无法读取用户</AlertTitle>
              <AlertDescription>{query.error.message}</AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>邮箱验证</TableHead>
                <TableHead>账号状态</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead>管理</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                Array.from({ length: 4 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : data?.items.length ? (
                data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-muted-foreground text-sm">{item.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.emailVerified ? "secondary" : "outline"}>
                        {item.emailVerified ? "已验证" : "未验证"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.banned ? "destructive" : "secondary"}>
                        {item.banned ? "已封禁" : "正常"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSessionsTarget({ id: item.id, name: item.name })}
                        >
                          管理会话
                        </Button>
                        <Button
                          size="sm"
                          variant={item.banned ? "outline" : "destructive"}
                          onClick={() => {
                            setBanReason("");
                            setBanTarget({ id: item.id, name: item.name, banned: item.banned });
                          }}
                        >
                          {item.banned ? "解封" : "封禁"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                    没有匹配的用户
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              共 {data?.total ?? 0} 个用户 · 第 {page + 1} / {pageCount} 页
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page === 0 || query.isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                disabled={page + 1 >= pageCount || query.isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                下一页
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={sessionsTarget !== null}
        onOpenChange={(open) => !open && setSessionsTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sessionsTarget?.name} 的登录会话</DialogTitle>
            <DialogDescription>
              查看会话时间和客户端信息，或撤销该用户的全部会话。
            </DialogDescription>
          </DialogHeader>
          {sessionsQuery.isPending ? (
            <p role="status" className="text-muted-foreground text-sm">
              正在读取会话…
            </p>
          ) : sessionsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>无法读取会话</AlertTitle>
              <AlertDescription>{sessionsQuery.error.message}</AlertDescription>
            </Alert>
          ) : sessionsQuery.data?.length ? (
            <div className="max-h-64 space-y-3 overflow-y-auto">
              {sessionsQuery.data.map((session) => (
                <div key={session.id} className="border-border rounded-md border p-3 text-sm">
                  <p>创建时间：{new Date(session.createdAt).toLocaleString()}</p>
                  <p>到期时间：{new Date(session.expiresAt).toLocaleString()}</p>
                  <p className="text-muted-foreground">IP：{session.ipAddress ?? "未知"}</p>
                  <p className="text-muted-foreground break-all">
                    设备：{session.userAgent ?? "未知"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">此用户没有有效会话。</p>
          )}
          <Button
            variant="destructive"
            disabled={!sessionsQuery.data?.length || revokeSessionsMutation.isPending}
            onClick={() => setRevokeSessionsOpen(true)}
          >
            撤销全部会话
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={banTarget !== null} onOpenChange={(open) => !open && setBanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {banTarget?.banned ? "解封" : "封禁"}用户“{banTarget?.name}”？
            </AlertDialogTitle>
            <AlertDialogDescription>
              {banTarget?.banned
                ? "该用户将可以重新登录。"
                : "封禁会阻止该用户登录，平台管理员账号不在此列表中。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {!banTarget?.banned && (
            <Field>
              <FieldLabel htmlFor="platform-ban-reason">封禁原因</FieldLabel>
              <Input
                id="platform-ban-reason"
                value={banReason}
                onChange={(event) => setBanReason(event.target.value)}
                placeholder="说明封禁原因"
                disabled={banMutation.isPending}
              />
            </Field>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={banMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant={banTarget?.banned ? "default" : "destructive"}
              disabled={
                !banTarget || banMutation.isPending || (!banTarget.banned && !banReason.trim())
              }
              onClick={() =>
                banTarget && banMutation.mutate({ ...banTarget, reason: banReason.trim() })
              }
            >
              {banMutation.isPending ? "处理中…" : banTarget?.banned ? "确认解封" : "确认封禁"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revokeSessionsOpen} onOpenChange={setRevokeSessionsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>撤销 {sessionsTarget?.name} 的全部会话？</AlertDialogTitle>
            <AlertDialogDescription>
              该用户的所有现有登录会话都会失效，需要重新登录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeSessionsMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!sessionsTarget || revokeSessionsMutation.isPending}
              onClick={() => sessionsTarget && revokeSessionsMutation.mutate(sessionsTarget.id)}
            >
              {revokeSessionsMutation.isPending ? "撤销中…" : "确认撤销"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
