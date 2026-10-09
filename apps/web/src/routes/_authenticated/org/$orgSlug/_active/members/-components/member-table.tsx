import { Badge } from "@org-saas/ui/components/badge";
import { Button } from "@org-saas/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@org-saas/ui/components/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@org-saas/ui/components/table";
import { toast } from "@org-saas/ui/components/toast";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, UserMinus, X } from "lucide-react";
import { useState } from "react";

import { RoleBadge } from "@/components/role-badge";
import { UserAvatar } from "@/components/user-avatar";
import { usePermission } from "@/hooks/use-permission";
import { authClient } from "@/lib/auth-client";
import { useOrgContext } from "@/lib/org-context";
import { organizationQueryKeys } from "@/lib/query-options";

import { RoleSelect } from "./role-select";

interface MemberTableProps {
  members: Array<{
    id: string;
    userId: string;
    role: string;
    createdAt: Date;
    user: { name: string; email: string; image?: string | null };
  }>;
  invitations: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
  }>;
  orgId: string;
}

export function MemberTable({ members, invitations, orgId }: MemberTableProps) {
  const { userId } = useOrgContext();
  const queryClient = useQueryClient();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const canUpdateMembers = usePermission({ member: ["update"] });
  const canDeleteMembers = usePermission({ member: ["delete"] });
  const canCancelInvite = usePermission({ invitation: ["cancel"] });

  const invalidateOrg = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: organizationQueryKeys.full(userId, orgId) }),
      queryClient.invalidateQueries({ queryKey: organizationQueryKeys.access(userId, orgId) }),
      queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.grantableRoles(userId, orgId, "member.update"),
      }),
      queryClient.invalidateQueries({
        queryKey: organizationQueryKeys.grantableRoles(userId, orgId, "invitation.create"),
      }),
    ]);
  };

  const handleRemoveMember = async (memberIdOrEmail: string) => {
    setPendingAction(memberIdOrEmail);
    try {
      const result = await authClient.organization.removeMember({
        memberIdOrEmail,
        organizationId: orgId,
      });
      if (result.error) throw new Error(result.error.message ?? "移除失败");
      toast.add({ title: "成员已移除", type: "success" });
      await invalidateOrg();
    } catch (error) {
      toast.add({ title: error instanceof Error ? error.message : "移除失败", type: "error" });
    } finally {
      setPendingAction(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setPendingAction(invitationId);
    try {
      const result = await authClient.organization.cancelInvitation({ invitationId });
      if (result.error) throw new Error(result.error.message ?? "取消失败");
      toast.add({ title: "邀请已取消", type: "success" });
      await invalidateOrg();
    } catch (error) {
      toast.add({ title: error instanceof Error ? error.message : "取消失败", type: "error" });
    } finally {
      setPendingAction(null);
    }
  };

  const pendingInvitations = invitations.filter((inv) => inv.status === "pending");

  return (
    <div className="space-y-6">
      {pendingAction && (
        <p role="status" className="text-muted-foreground text-sm">
          正在处理组织成员操作…
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>成员</TableHead>
            <TableHead>角色</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <UserAvatar name={m.user.name} image={m.user.image} />
                  <div>
                    <p className="font-medium">{m.user.name}</p>
                    <p className="text-muted-foreground text-sm">{m.user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {canUpdateMembers ? (
                  <RoleSelect memberId={m.id} currentRole={m.role} />
                ) : (
                  <RoleBadge role={m.role} />
                )}
              </TableCell>
              <TableCell>
                {canDeleteMembers && m.role !== "owner" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-card" align="end">
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={pendingAction === m.userId}
                        onClick={() => handleRemoveMember(m.userId)}
                      >
                        <UserMinus className="size-4" />
                        移除成员
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pendingInvitations.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold">待处理邀请</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvitations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={inv.role} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">待接受</Badge>
                  </TableCell>
                  <TableCell>
                    {canCancelInvite && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pendingAction === inv.id}
                        onClick={() => handleCancelInvitation(inv.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
