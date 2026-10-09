import { Button } from "@org-saas/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@org-saas/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@org-saas/ui/components/field";
import { Input } from "@org-saas/ui/components/input";
import { toast } from "@org-saas/ui/components/toast";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { useOrgContext } from "@/lib/org-context";
import { organizationFullQueryOptions, organizationQueryKeys } from "@/lib/query-options";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
}

export function CreateTeamDialog({ open, onOpenChange, orgId }: CreateTeamDialogProps) {
  const { userId } = useOrgContext();
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: { name: "" },
    onSubmit: async ({ value }) => {
      const result = await authClient.organization.createTeam({
        name: value.name,
        organizationId: orgId,
      });
      if (result.error) {
        toast.add({ title: result.error.message ?? "创建失败", type: "error" });
        return;
      }

      toast.add({ title: "团队创建成功", type: "success" });
      onOpenChange(false);
      form.reset();
      await queryClient.invalidateQueries(organizationFullQueryOptions(userId, orgId));
      await queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.access(userId, orgId),
      });
    },
    validators: {
      onSubmit: z.object({ name: z.string().min(2, "团队名称至少 2 个字符") }),
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建团队</DialogTitle>
          <DialogDescription>在组织内创建一个新团队</DialogDescription>
        </DialogHeader>
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
                    <FieldLabel htmlFor={field.name}>团队名称</FieldLabel>
                    <Input
                      id={field.name}
                      placeholder="如：前端团队"
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
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <form.Subscribe>
                {(state) => (
                  <Button type="submit" disabled={!state.canSubmit || state.isSubmitting}>
                    {state.isSubmitting ? "创建中…" : "创建团队"}
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
