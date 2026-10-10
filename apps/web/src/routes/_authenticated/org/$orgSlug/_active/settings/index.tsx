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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@org-saas/ui/components/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@org-saas/ui/components/field";
import { Input } from "@org-saas/ui/components/input";
import { toast } from "@org-saas/ui/components/toast";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { Archive } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { usePermission } from "@/hooks/use-permission";
import { authClient } from "@/lib/auth-client";
import { useOrgContext } from "@/lib/org-context";
import { organizationQueryKeys } from "@/lib/query-options";
import { ForbiddenError } from "@/utils/errors";
import { client } from "@/utils/orpc";

export const Route = createFileRoute("/_authenticated/org/$orgSlug/_active/settings/")({
  beforeLoad: ({ context }) => {
    if (!context.access.operations.organization.update && !context.access.isOwner) {
      throw new ForbiddenError("您没有组织设置或生命周期操作权限");
    }
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { org, userId, isOwner } = useOrgContext();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const canUpdate = usePermission({ organization: ["update"] });
  const canArchive = usePermission({ organization: ["archive"] });

  const invalidateOrganization = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: organizationQueryKeys.root(userId) }),
      queryClient.invalidateQueries({ queryKey: organizationQueryKeys.full(userId, org.id) }),
      queryClient.invalidateQueries({ queryKey: organizationQueryKeys.access(userId, org.id) }),
    ]);
  };

  const form = useForm({
    defaultValues: { name: org.name, slug: org.slug },
    onSubmit: async ({ value }) => {
      const result = await authClient.organization.update({
        data: { name: value.name, slug: value.slug },
        organizationId: org.id,
      });
      if (result.error) {
        toast.add({ title: result.error.message ?? "更新失败", type: "error" });
        return;
      }

      toast.add({ title: "组织设置已更新", type: "success" });
      await invalidateOrganization();
      await router.invalidate();
      if (value.slug !== org.slug) {
        await navigate({ to: "/org/$orgSlug/settings", params: { orgSlug: value.slug } });
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

  const archiveMutation = useMutation({
    mutationFn: () => client.organization.archive({ organizationId: org.id }),
    onSuccess: async () => {
      toast.add({ title: "组织已归档", type: "success" });
      setArchiveOpen(false);
      await invalidateOrganization();
      await router.invalidate();
      await navigate({ to: "/org/$orgSlug/archived", params: { orgSlug: org.slug } });
    },
    onError: (error) => toast.add({ title: error.message || "归档失败，请重试", type: "error" }),
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">组织设置</h1>
        <p className="text-muted-foreground text-sm">仅展示当前账号有权执行的组织操作。</p>
      </div>

      {canUpdate && (
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>更新组织名称和地址</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <FieldGroup className="gap-4">
                <form.Field name="name">
                  {(field) => {
                    const invalid = field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor={field.name}>组织名称</FieldLabel>
                        <Input
                          id={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          aria-invalid={invalid}
                        />
                        {invalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Field name="slug">
                  {(field) => {
                    const invalid = field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={invalid}>
                        <FieldLabel htmlFor={field.name}>组织地址</FieldLabel>
                        <Input
                          id={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          aria-invalid={invalid}
                        />
                        {invalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Subscribe>
                  {(state) => (
                    <Button type="submit" disabled={!state.canSubmit || state.isSubmitting}>
                      {state.isSubmitting ? "保存中…" : "保存设置"}
                    </Button>
                  )}
                </form.Subscribe>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      )}

      {isOwner && canArchive && (
        <Card>
          <CardHeader>
            <CardTitle>归档组织</CardTitle>
            <CardDescription>
              归档会保留组织和历史数据，并暂停普通组织操作。组织所有者可以之后恢复。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
              <AlertDialogTrigger
                render={<Button variant="destructive" disabled={archiveMutation.isPending} />}
              >
                <Archive data-icon="inline-start" />
                归档组织
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>归档“{org.name}”？</AlertDialogTitle>
                  <AlertDialogDescription>
                    组织成员将暂时无法访问正常业务页面。组织数据会保留，你可以从归档页面恢复。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={archiveMutation.isPending}>取消</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={archiveMutation.isPending}
                    onClick={() => archiveMutation.mutate()}
                  >
                    {archiveMutation.isPending ? "归档中…" : "确认归档"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
