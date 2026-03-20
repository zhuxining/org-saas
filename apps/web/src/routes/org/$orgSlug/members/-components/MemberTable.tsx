import { Badge } from "@org-sass/ui/components/badge";
import { Button } from "@org-sass/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@org-sass/ui/components/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@org-sass/ui/components/table";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, UserMinus, X } from "lucide-react";
import { toast } from "sonner";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { usePermission } from "@/hooks/use-permission";
import { authClient } from "@/lib/auth-client";
import { orgFullQueryOptions } from "@/lib/query-options";
import { RoleSelect } from "./RoleSelect";

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
	const queryClient = useQueryClient();
	const canManageMembers = usePermission({ member: ["update", "delete"] });
	const canCancelInvite = usePermission({ invitation: ["cancel"] });

	const invalidateOrg = () =>
		queryClient.invalidateQueries(orgFullQueryOptions(orgId));

	const handleRemoveMember = async (memberIdOrEmail: string) => {
		const result = await authClient.organization.removeMember({
			memberIdOrEmail,
			organizationId: orgId,
		});
		if (result.error) {
			toast.error(result.error.message ?? "移除失败");
		} else {
			toast.success("成员已移除");
			invalidateOrg();
		}
	};

	const handleCancelInvitation = async (invitationId: string) => {
		const result = await authClient.organization.cancelInvitation({
			invitationId,
		});
		if (result.error) {
			toast.error(result.error.message ?? "取消失败");
		} else {
			toast.success("邀请已取消");
			invalidateOrg();
		}
	};

	const pendingInvitations = invitations.filter(
		(inv) => inv.status === "pending",
	);

	return (
		<div className="space-y-6">
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
										<p className="text-muted-foreground text-sm">
											{m.user.email}
										</p>
									</div>
								</div>
							</TableCell>
							<TableCell>
								{canManageMembers ? (
									<RoleSelect
										memberId={m.id}
										currentRole={m.role}
										orgId={orgId}
									/>
								) : (
									<RoleBadge role={m.role} />
								)}
							</TableCell>
							<TableCell>
								{canManageMembers && m.role !== "owner" && (
									<DropdownMenu>
										<DropdownMenuTrigger
											render={<Button variant="ghost" size="icon" />}
										>
											<MoreHorizontal className="size-4" />
										</DropdownMenuTrigger>
										<DropdownMenuContent className="bg-card" align="end">
											<DropdownMenuItem
												variant="destructive"
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
					<h3 className="mb-3 font-semibold text-lg">待处理邀请</h3>
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
