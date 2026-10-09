import { Button } from "@org-saas/ui/components/button";
import { Checkbox } from "@org-saas/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@org-saas/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@org-saas/ui/components/field";
import { Input } from "@org-saas/ui/components/input";
import { useState } from "react";

import type { OrganizationAccess } from "@/lib/query-options";

export interface RoleDraft {
  id?: string;
  name: string;
  permission: Record<string, string[]>;
}

interface RoleEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDraft: RoleDraft | null;
  catalog: Record<string, string[]>;
  access: OrganizationAccess;
  affectedMemberCount: number;
  isSaving: boolean;
  onSave: (draft: RoleDraft) => void;
}

export function RoleEditorDialog({
  open,
  onOpenChange,
  initialDraft,
  catalog,
  access,
  affectedMemberCount,
  isSaving,
  onSave,
}: RoleEditorDialogProps) {
  const [name, setName] = useState(initialDraft?.name ?? "");
  const [permission, setPermission] = useState<Record<string, string[]>>(
    initialDraft?.permission ?? {},
  );

  const operationMap = access.operations as unknown as Record<string, Record<string, boolean>>;
  const allowed = (resource: string, action: string) =>
    operationMap[resource === "ac" ? "roleDefinition" : resource]?.[action] === true;
  const withinGrantBoundary = Object.entries(permission).every(([resource, actions]) =>
    actions.every((action) => allowed(resource, action)),
  );

  const togglePermission = (resource: string, action: string, checked: boolean) => {
    setPermission((current) => {
      const actions = new Set(current[resource] ?? []);
      if (checked) actions.add(action);
      else actions.delete(action);
      const next = { ...current };
      if (actions.size > 0) next[resource] = [...actions];
      else delete next[resource];
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialDraft?.id ? "编辑自定义角色" : "创建自定义角色"}</DialogTitle>
          <DialogDescription>
            权限选项来自服务端声明的资源和操作。保存会影响 {affectedMemberCount} 个成员。
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="role-name">角色名称</FieldLabel>
            <Input
              id="role-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：项目协调员"
              disabled={isSaving}
            />
          </Field>
          {Object.entries(catalog).map(([resource, actions]) => (
            <FieldSet key={resource}>
              <FieldLegend variant="label">{resource}</FieldLegend>
              <FieldDescription>只勾选当前操作者有权授予的操作。</FieldDescription>
              <FieldGroup className="gap-2">
                {actions.map((action) => {
                  const checked = permission[resource]?.includes(action) ?? false;
                  const canGrant = allowed(resource, action);
                  const id = `role-${resource}-${action}`;
                  return (
                    <Field
                      key={action}
                      orientation="horizontal"
                      data-disabled={!canGrant && !checked}
                    >
                      <Checkbox
                        id={id}
                        checked={checked}
                        disabled={isSaving || (!canGrant && !checked)}
                        onCheckedChange={(value) =>
                          togglePermission(resource, action, value === true)
                        }
                      />
                      <FieldLabel htmlFor={id} className="font-normal">
                        {action}
                      </FieldLabel>
                    </Field>
                  );
                })}
              </FieldGroup>
            </FieldSet>
          ))}
          {!withinGrantBoundary && (
            <p className="text-destructive text-sm">
              此角色包含你当前不能授予的操作。请先取消这些权限。
            </p>
          )}
        </FieldGroup>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            disabled={!name.trim() || !withinGrantBoundary || isSaving}
            onClick={() => onSave({ id: initialDraft?.id, name: name.trim(), permission })}
          >
            {isSaving ? "保存中…" : "保存角色"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
