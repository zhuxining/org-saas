import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@org-saas/ui/components/select";
import { toast } from "@org-saas/ui/components/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";
import { useOrgContext } from "@/lib/org-context";
import { grantableRolesQueryOptions, organizationQueryKeys } from "@/lib/query-options";

interface RoleSelectProps {
  memberId: string;
  currentRole: string;
}

export function RoleSelect({ memberId, currentRole }: RoleSelectProps) {
  const { org, userId } = useOrgContext();
  const queryClient = useQueryClient();
  const {
    data: roles = [],
    isPending,
    isError,
  } = useQuery(grantableRolesQueryOptions(userId, org.id, "member.update"));
  const mutation = useMutation({
    mutationFn: async (role: string) => {
      const result = await authClient.organization.updateMemberRole({
        memberId,
        role: role as "admin" | "member" | "owner",
        organizationId: org.id,
      });
      if (result.error) throw new Error(result.error.message ?? "角色更新失败");
    },
    onSuccess: async () => {
      toast.add({ title: "角色已更新", type: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationQueryKeys.full(userId, org.id) }),
        queryClient.invalidateQueries({ queryKey: organizationQueryKeys.access(userId, org.id) }),
        queryClient.invalidateQueries({
          queryKey: organizationQueryKeys.grantableRoles(userId, org.id, "member.update"),
        }),
      ]);
    },
    onError: (error) => toast.add({ title: error.message || "角色更新失败", type: "error" }),
  });

  if (isPending) return <span className="text-muted-foreground text-sm">读取可授予角色…</span>;
  if (isError) return <span className="text-destructive text-sm">无法读取角色</span>;
  if (!roles.some((role) => role.name === currentRole)) {
    return <RoleLabel role={currentRole} />;
  }

  return (
    <div className="space-y-2">
      <Select
        value={currentRole}
        onValueChange={(role) => {
          if (role && role !== currentRole) mutation.mutate(role);
        }}
        disabled={mutation.isPending}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {roles.map((role) => (
              <SelectItem key={role.name} value={role.name}>
                {role.name}
                {role.custom ? "（自定义）" : ""}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {mutation.isPending && (
        <span role="status" className="text-muted-foreground text-xs">
          正在更新角色…
        </span>
      )}
    </div>
  );
}

function RoleLabel({ role }: { role: string }) {
  return <span className="text-sm">{role}</span>;
}
