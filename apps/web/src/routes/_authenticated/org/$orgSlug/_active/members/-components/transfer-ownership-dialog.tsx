import { hasOrganizationOwnerRole } from "@org-saas/auth/organization-owner";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@org-saas/ui/components/select";
import { toast } from "@org-saas/ui/components/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { useOrgContext } from "@/lib/org-context";
import { syncOrganizationCacheAfterChange } from "@/lib/organization-cache";
import { grantableRolesQueryOptions } from "@/lib/query-options";

interface TransferOwnershipDialogProps {
  members: Array<{
    id: string;
    userId: string;
    role: string;
    user: { name: string; email: string };
  }>;
  orgId: string;
}

export function TransferOwnershipDialog({ members, orgId }: TransferOwnershipDialogProps) {
  const { userId } = useOrgContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const currentOwner = members.find((member) => hasOrganizationOwnerRole(member.role));
  const candidates = members.filter((member) => !hasOrganizationOwnerRole(member.role));
  const [targetMemberId, setTargetMemberId] = useState(candidates[0]?.id ?? "");
  const [formerOwnerRole, setFormerOwnerRole] = useState("member");
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const rolesQuery = useQuery(grantableRolesQueryOptions(userId, orgId, "member.update"));
  const roles = rolesQuery.data ?? [];

  const transferOwnership = async () => {
    if (!targetMemberId || !roles.some((role) => role.name === formerOwnerRole)) return;
    setIsPending(true);
    try {
      const result = await authClient.organization.transferOwnership({
        organizationId: orgId,
        newOwnerMemberId: targetMemberId,
        formerOwnerRole,
      });
      if (result.error) throw new Error(result.error.message ?? "所有权转让失败");
      toast.add({ title: "组织所有权已转让", type: "success" });
      setOpen(false);
      await syncOrganizationCacheAfterChange(queryClient, userId, orgId, "ownership-transferred");
      await router.invalidate();
    } catch (error) {
      toast.add({
        title: error instanceof Error ? error.message : "所有权转让失败，请重试",
        type: "error",
      });
    } finally {
      setIsPending(false);
    }
  };

  if (!currentOwner || currentOwner.userId !== userId || candidates.length === 0) return null;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <Crown data-icon="inline-start" />
        转让组织所有权
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>转让“{currentOwner.user.name}”的组织所有权？</AlertDialogTitle>
          <AlertDialogDescription>
            新 owner 将获得组织所有权；你将保留所选角色。转让完成后，你的管理权限会按新角色变化。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-4">
          <Select value={targetMemberId} onValueChange={(value) => setTargetMemberId(value ?? "")}>
            <SelectTrigger aria-label="选择新 owner">
              <SelectValue placeholder="选择新 owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {candidates.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.user.name}（{member.user.email}）· {member.role}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={formerOwnerRole}
            onValueChange={(value) => setFormerOwnerRole(value ?? "")}
            disabled={rolesQuery.isPending || rolesQuery.isError}
          >
            <SelectTrigger aria-label="选择转让后的角色">
              <SelectValue placeholder="选择你转让后的角色" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {roles
                  .filter((role) => role.name !== "owner")
                  .map((role) => (
                    <SelectItem key={role.name} value={role.name}>
                      {role.name}
                      {role.custom ? "（自定义）" : ""}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {rolesQuery.isError && (
            <p role="alert" className="text-destructive text-sm">
              无法读取可分配角色，请关闭后重试。
            </p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>取消</AlertDialogCancel>
          <AlertDialogAction
            disabled={
              isPending ||
              rolesQuery.isPending ||
              rolesQuery.isError ||
              !targetMemberId ||
              !roles.some((role) => role.name === formerOwnerRole)
            }
            onClick={() => void transferOwnership()}
          >
            {isPending ? "转让中…" : "确认转让"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
