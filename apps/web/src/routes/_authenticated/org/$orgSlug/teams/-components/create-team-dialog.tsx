import { Button } from "@org-saas/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@org-saas/ui/components/dialog";
import { Input } from "@org-saas/ui/components/input";
import { Label } from "@org-saas/ui/components/label";
import { toast } from "@org-saas/ui/components/toast";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { orgFullQueryOptions } from "@/lib/query-options";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
}

export function CreateTeamDialog({ open, onOpenChange, orgId }: CreateTeamDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      name: "",
    },
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
      void queryClient.invalidateQueries(orgFullQueryOptions(orgId));
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, "团队名称至少 2 个字符"),
      }),
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
                <Label htmlFor={field.name}>团队名称</Label>
                <Input
                  id={field.name}
                  placeholder="如：前端团队"
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

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <form.Subscribe>
              {(state) => (
                <Button type="submit" disabled={!state.canSubmit || state.isSubmitting}>
                  {state.isSubmitting ? "创建中..." : "创建团队"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
