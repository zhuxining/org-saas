import { Alert, AlertDescription, AlertTitle } from "@org-saas/ui/components/alert";
import { Badge } from "@org-saas/ui/components/badge";
import { Button } from "@org-saas/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@org-saas/ui/components/card";
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
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { platformUsersQueryOptions } from "@/lib/query-options";

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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const input = {
    search: search.trim() || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const query = useQuery(platformUsersQueryOptions(user.id, input));
  const data = query.data;
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">平台用户</h1>
        <p className="text-muted-foreground text-sm">查看普通用户基础信息和账号状态。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户目录</CardTitle>
          <CardDescription>查询结果不包含平台管理员账号及会话凭证。</CardDescription>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                Array.from({ length: 4 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={4}>
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
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-10 text-center">
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
    </div>
  );
}
