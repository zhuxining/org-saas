import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@org-sass/ui/components/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
			toast.error(result.error.message ?? "角色更新失败");
		} else {
			toast.success("角色已更新");
			queryClient.invalidateQueries(orgFullQueryOptions(orgId));
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
