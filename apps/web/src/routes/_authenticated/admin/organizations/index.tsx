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

import { platformOrganizationsQueryOptions } from "@/lib/query-options";

const PAGE_SIZE = 25;

export const Route = createFileRoute("/_authenticated/admin/organizations/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      platformOrganizationsQueryOptions(context.user.id, { limit: PAGE_SIZE, offset: 0 }),
    );
  },
  component: PlatformOrganizationsPage,
});

function PlatformOrganizationsPage() {
  const user = Route.useRouteContext().user;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const input = {
    search: search.trim() || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const query = useQuery(platformOrganizationsQueryOptions(user.id, input));
  const data = query.data;
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">平台组织</h1>
        <p className="text-muted-foreground text-sm">
          查看组织基础信息与归档状态；此页面不进入租户业务数据。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>组织目录</CardTitle>
          <CardDescription>仅返回组织基础信息、创建时间和归档标记。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FieldGroup className="gap-2">
            <Field>
              <FieldLabel htmlFor="organization-search">按名称或地址搜索</FieldLabel>
              <Input
                id="organization-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="输入组织名称或 slug"
              />
            </Field>
          </FieldGroup>

          {query.isError && (
            <Alert variant="destructive">
              <AlertTitle>无法读取组织</AlertTitle>
              <AlertDescription>{query.error.message}</AlertDescription>
            </Alert>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>组织</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                Array.from({ length: 4 }, (_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={3}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : data?.items.length ? (
                data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-muted-foreground text-sm">{item.slug}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.archived ? "outline" : "secondary"}>
                        {item.archived ? "已归档" : "正常"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground py-10 text-center">
                    没有匹配的组织
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              共 {data?.total ?? 0} 个组织 · 第 {page + 1} / {pageCount} 页
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
