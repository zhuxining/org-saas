import { Button } from "@org-saas/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@org-saas/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@org-saas/ui/components/field";
import { Input } from "@org-saas/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@org-saas/ui/components/select";
import { toast } from "@org-saas/ui/components/toast";
import { useForm } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { useOrgContext } from "@/lib/org-context";
import { grantableRolesQueryOptions, organizationQueryKeys } from "@/lib/query-options";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
}

export function InviteMemberDialog({ open, onOpenChange, orgId }: InviteMemberDialogProps) {
  const { userId } = useOrgContext();
  const queryClient = useQueryClient();
  const grantableRoles = useQuery(grantableRolesQueryOptions(userId, orgId, "invitation.create"));
  const form = useForm({
    defaultValues: { email: "", role: "member" },
    onSubmit: async ({ value }) => {
      try {
        if (!grantableRoles.data?.some((role) => role.name === value.role)) {
          toast.add({ title: "你当前不能授予此角色", type: "error" });
          return;
        }
        const result = await authClient.organization.inviteMember({
          email: value.email,
          role: value.role,
          organizationId: orgId,
        });

        if (result.error) throw new Error(result.error.message ?? "邀请失败");

        toast.add({ title: `已向 ${value.email} 发送邀请`, type: "success" });
        onOpenChange(false);
        form.reset();
        await queryClient.invalidateQueries({
          queryKey: organizationQueryKeys.full(userId, orgId),
        });
      } catch (error) {
        toast.add({
          title: error instanceof Error ? error.message : "邀请失败，请重试",
          type: "error",
        });
      }
    },
    validators: {
      onSubmit: z.object({
        email: z.email("请输入有效的邮箱地址"),
        role: z.string().min(1, "请选择一个角色"),
      }),
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>邀请成员</DialogTitle>
          <DialogDescription>通过邮箱地址邀请新成员加入组织</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <FieldGroup className="gap-4">
            <form.Field name="email">
              {(field) => {
                const invalid = field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor={field.name}>邮箱</FieldLabel>
                    <Input
                      id={field.name}
                      type="email"
                      placeholder="user@example.com"
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

            <form.Field name="role">
              {(field) => (
                <Field data-disabled={grantableRoles.isPending || grantableRoles.isError}>
                  <FieldLabel>角色</FieldLabel>
                  {grantableRoles.isPending ? (
                    <FieldDescription>正在读取可授予角色…</FieldDescription>
                  ) : grantableRoles.isError ? (
                    <FieldDescription className="text-destructive">
                      无法读取可授予角色，请关闭后重试。
                    </FieldDescription>
                  ) : (
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value ?? "")}
                    >
                      <SelectTrigger aria-label="选择角色">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {grantableRoles.data.map((role) => (
                            <SelectItem key={role.name} value={role.name}>
                              {role.name}
                              {role.custom ? "（自定义）" : ""}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </Field>
              )}
            </form.Field>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <form.Subscribe>
                {(state) => (
                  <Button
                    type="submit"
                    disabled={
                      !state.canSubmit ||
                      state.isSubmitting ||
                      grantableRoles.isPending ||
                      grantableRoles.isError
                    }
                  >
                    {state.isSubmitting ? "发送中…" : "发送邀请"}
                  </Button>
                )}
              </form.Subscribe>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
