import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@org-saas/ui/components/select";
import { toast } from "@org-saas/ui/components/toast";
import { useQueryClient } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { orgFullQueryOptions } from "@/lib/query-options";

interface RoleSelectProps {
  memberId: string;
  currentRole: string;
  orgId: string;
}

export function RoleSelect({ memberId, currentRole, orgId }: RoleSelectProps) {
  const queryClient = useQueryClient();

  const handleRoleChange = async (newRole: string | null) => {
    if (!newRole || newRole === currentRole) return;

    const result = await authClient.organization.updateMemberRole({
      memberId,
      role: newRole as "admin" | "member" | "owner",
      organizationId: orgId,
    });

    if (result.error) {
      toast.add({ title: result.error.message ?? "角色更新失败", type: "error" });
    } else {
      toast.add({ title: "角色已更新", type: "success" });
      void queryClient.invalidateQueries(orgFullQueryOptions(orgId));
    }
  };

  return (
    <Select value={currentRole} onValueChange={handleRoleChange}>
      <SelectTrigger className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="owner">Owner</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="member">Member</SelectItem>
      </SelectContent>
    </Select>
  );
}
