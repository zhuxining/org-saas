import { Button } from "@org-saas/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@org-saas/ui/components/card";
import { Input } from "@org-saas/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@org-saas/ui/components/table";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { orpc } from "@/utils/orpc";

const pageSize = 25;

const actionLabels: Record<string, string> = {
  "user.banned": "封禁用户",
  "user.unbanned": "解除封禁",
  "session.revoked": "撤销用户会话",
  "session.revoked_all": "撤销用户全部会话",
};

export const Route = createFileRoute("/_authenticated/admin/audit/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      orpc.audit.listPlatformEvents.queryOptions({ input: { limit: pageSize, offset: 0 } }),
    );
  },
  component: PlatformAuditPage,
});

function PlatformAuditPage() {
  const [page, setPage] = useState(0);
  const [actionInput, setActionInput] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const { data } = useSuspenseQuery(
    orpc.audit.listPlatformEvents.queryOptions({
      input: {
        limit: pageSize,
        offset: page * pageSize,
        action: actionFilter || undefined,
      },
    }),
  );
  const lastPage = Math.max(0, Math.ceil(data.total / pageSize) - 1);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">平台审计</h1>
        <p className="text-muted-foreground text-sm">
          记录平台管理员的用户封禁和会话撤销操作，保留 180 天。
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>管理操作</CardTitle>
          <CardDescription>按发生时间倒序排列。</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="mb-4 flex max-w-xl gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setActionFilter(actionInput.trim());
              setPage(0);
            }}
          >
            <Input
              aria-label="按操作类型筛选"
              placeholder="操作标识，例如 user.banned"
              value={actionInput}
              onChange={(event) => setActionInput(event.target.value)}
            />
            <Button type="submit" variant="outline">
              筛选
            </Button>
            {actionFilter && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setActionInput("");
                  setActionFilter("");
                  setPage(0);
                }}
              >
                清除
              </Button>
            )}
          </form>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>操作人</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>目标用户</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(event.occurredAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {event.actorName}
                    <span className="text-muted-foreground ml-2 text-xs">{event.actorId}</span>
                  </TableCell>
                  <TableCell>{actionLabels[event.action] ?? event.action}</TableCell>
                  <TableCell className="font-mono text-xs">{event.targetId ?? "—"}</TableCell>
                </TableRow>
              ))}
              {data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-10 text-center">
                    还没有平台审计记录
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-muted-foreground text-sm">共 {data.total} 条记录</span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                上一页
              </Button>
              <Button
                variant="outline"
                disabled={page >= lastPage}
                onClick={() => setPage(page + 1)}
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
