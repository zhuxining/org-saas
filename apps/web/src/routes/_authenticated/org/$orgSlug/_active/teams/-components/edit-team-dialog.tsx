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
import { syncOrganizationCacheAfterChange } from "@/lib/organization-cache";

interface EditTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  teamId: string;
  teamName: string;
}

export function EditTeamDialog({
  open,
  onOpenChange,
  orgId,
  teamId,
  teamName,
}: EditTeamDialogProps) {
  const { userId } = useOrgContext();
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: { name: teamName },
    onSubmit: async ({ value }) => {
      const result = await authClient.organization.updateTeam({
        teamId,
        data: { name: value.name, organizationId: orgId },
      });
      if (result.error) {
        toast.add({ title: result.error.message ?? "团队名称更新失败", type: "error" });
        return;
      }
      toast.add({ title: "团队名称已更新", type: "success" });
      form.setFieldValue("name", value.name);
      onOpenChange(false);
      await syncOrganizationCacheAfterChange(queryClient, userId, orgId, "team-updated");
    },
    validators: {
      onSubmit: z.object({ name: z.string().trim().min(2, "团队名称至少 2 个字符") }),
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修改团队名称</DialogTitle>
          <DialogDescription>更新组织内的团队名称</DialogDescription>
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
                    <FieldLabel htmlFor="team-name">团队名称</FieldLabel>
                    <Input
                      id="team-name"
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
                    {state.isSubmitting ? "保存中…" : "保存名称"}
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
