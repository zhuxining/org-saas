import { Button } from "@org-saas/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@org-saas/ui/components/card";
import { Input } from "@org-saas/ui/components/input";
import { Label } from "@org-saas/ui/components/label";
import { Separator } from "@org-saas/ui/components/separator";
import { toast } from "@org-saas/ui/components/toast";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { useOrgContext } from "@/lib/org-context";
import { requireAdmin } from "@/utils/guards";

export const Route = createFileRoute("/org/$orgSlug/settings/")({
  component: SettingsPage,
});

function SettingsPage() {
  const { org, role } = useOrgContext();
  const navigate = useNavigate();

  requireAdmin(role);

  const form = useForm({
    defaultValues: {
      name: org.name,
      slug: org.slug,
    },
    onSubmit: async ({ value }) => {
      const result = await authClient.organization.update({
        data: {
          name: value.name,
          slug: value.slug,
        },
        organizationId: org.id,
      });

      if (result.error) {
        toast.add({ title: result.error.message ?? "更新失败", type: "error" });
        return;
      }

      toast.add({ title: "组织设置已更新", type: "success" });
      if (value.slug !== org.slug) {
        void navigate({
          to: "/org/$orgSlug/settings",
          params: { orgSlug: value.slug },
        });
      }
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "组织名称至少 2 个字符"),
        slug: z
          .string()
          .min(2, "Slug 至少 2 个字符")
          .regex(/^[a-z0-9-]+$/, "Slug 只能包含小写字母、数字和连字符"),
      }),
    },
  });

  const handleDelete = async () => {
    if (role !== "owner") {
      toast.add({ title: "只有 Owner 可以删除组织", type: "error" });
      return;
    }

    const confirmed = window.confirm(`确定要删除组织 "${org.name}" 吗？此操作无法撤销。`);
    if (!confirmed) return;

    const result = await authClient.organization.delete({
      organizationId: org.id,
    });

    if (result.error) {
      toast.add({ title: result.error.message ?? "删除失败", type: "error" });
    } else {
      toast.add({ title: "组织已删除", type: "success" });
      void navigate({ to: "/dashboard" });
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">组织设置</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>更新组织的名称和 URL</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}
            className="space-y-4"
          >
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>组织名称</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-destructive text-sm">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Field name="slug">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Slug</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-destructive text-sm">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </form.Field>

            <form.Subscribe>
              {(state) => (
                <Button type="submit" disabled={!state.canSubmit || state.isSubmitting}>
                  {state.isSubmitting ? "保存中..." : "保存"}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </CardContent>
      </Card>

      {role === "owner" && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">危险区域</CardTitle>
            <CardDescription>删除组织将移除所有成员、团队和数据，此操作无法撤销</CardDescription>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <Button variant="destructive" onClick={handleDelete}>
              删除组织
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
