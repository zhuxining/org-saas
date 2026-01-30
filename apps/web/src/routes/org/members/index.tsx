import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MoreHorizontal, Plus, Shield, Trash2, X } from "lucide-react";
import { useState } from "react";

import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/org/members/")({
	// ✅ 继承父路由 /org 的 beforeLoad,无需重复检查
	loader: async ({ context }) => {
		// 并行预取成员和邀请数据
		await Promise.all([
			context.queryClient.ensureQueryData(
				orpc.organization.listMembers.queryOptions({ input: {} }),
			),
			context.queryClient.ensureQueryData(
				orpc.organization.listInvitations.queryOptions({ input: {} }),
			),
		]);
	},
	component: OrgMembersPage,
});

function OrgMembersPage() {
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialogComponent } = useConfirmDialog();

	// 数据已在 loader 中预取，无加载状态
	const { data: membersData } = useSuspenseQuery(
		orpc.organization.listMembers.queryOptions({ input: {} }),
	);
	const { data: invitationsData } = useSuspenseQuery(
		orpc.organization.listInvitations.queryOptions({ input: {} }),
	);

	const [isInviteOpen, setIsInviteOpen] = useState(false);
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState("member");

	const inviteMember = useMutation(
		orpc.organization.inviteMember.mutationOptions({
			onSuccess: () => {
				toast.success("Invitation sent successfully");
				setIsInviteOpen(false);
				setInviteEmail("");
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listInvitations.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to send invitation");
			},
		}),
	);

	const removeMember = useMutation(
		orpc.organization.removeMember.mutationOptions({
			onSuccess: () => {
				toast.success("Member removed successfully");
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listMembers.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to remove member");
			},
		}),
	);

	const updateRole = useMutation(
		orpc.organization.updateMemberRole.mutationOptions({
			onSuccess: () => {
				toast.success("Member role updated successfully");
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listMembers.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update member role");
			},
		}),
	);

	const cancelInvitation = useMutation(
		orpc.organization.cancelInvitation.mutationOptions({
			onSuccess: () => {
				toast.success("Invitation cancelled");
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listInvitations.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to cancel invitation");
			},
		}),
	);

	const handleInvite = (e: React.FormEvent) => {
		e.preventDefault();
		inviteMember.mutate({
			email: inviteEmail,
			role: inviteRole as "member" | "moderator" | "owner",
		});
	};

	const handleRemove = async (memberId: string) => {
		const confirmed = await confirm({
			title: "Remove Member",
			description: "Are you sure you want to remove this member?",
			variant: "destructive",
		});
		if (confirmed) {
			removeMember.mutate({ memberIdOrEmail: memberId });
		}
	};

	const handleRoleChange = (memberId: string, newRole: string) => {
		updateRole.mutate({
			memberId,
			role: newRole as "member" | "moderator" | "owner",
		});
	};

	const handleCancelInvite = async (invitationId: string) => {
		const confirmed = await confirm({
			title: "Cancel Invitation",
			description: "Cancel this invitation?",
			variant: "destructive",
		});
		if (confirmed) {
			cancelInvitation.mutate({ invitationId });
		}
	};

	// 角色显示组件
	const _getRoleBadge = (role: string) => {
		switch (role) {
			case "owner":
				return (
					<Badge variant="default" className="gap-1">
						<Shield className="h-3 w-3" />
						Owner
					</Badge>
				);
			case "admin":
				return (
					<Badge variant="secondary" className="gap-1">
						<Shield className="h-3 w-3" />
						Moderator
					</Badge>
				);
			default:
				return (
					<Badge variant="outline" className="gap-1">
						{role.charAt(0).toUpperCase() + role.slice(1)}
					</Badge>
				);
		}
	};

	return (
		<>
			{ConfirmDialogComponent}
			<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="font-bold text-2xl tracking-tight">Team Members</h1>
						<p className="text-muted-foreground">
							Manage who has access to this organization.
						</p>
					</div>

					<Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
						<DialogTrigger className={buttonVariants()}>
							<Plus className="mr-2 h-4 w-4" />
							Invite Member
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Invite Member</DialogTitle>
								<DialogDescription>
									Send an email invitation to join your organization.
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleInvite} className="space-y-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="email">Email Address</Label>
									<Input
										id="email"
										type="email"
										value={inviteEmail}
										onChange={(e) => setInviteEmail(e.target.value)}
										placeholder="colleague@company.com"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="role">Role</Label>
									<Select
										value={inviteRole}
										onValueChange={(val) => val && setInviteRole(val)}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select role" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="member">Member</SelectItem>
											<SelectItem value="admin">Moderator</SelectItem>
											<SelectItem value="owner">Owner</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsInviteOpen(false)}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={inviteMember.isPending}>
										{inviteMember.isPending ? "Sending..." : "Send Invitation"}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>

				<div className="overflow-hidden rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Joined At</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{membersData?.members.length === 0 ? (
								<TableRow>
									<TableCell colSpan={4} className="h-24 text-center">
										No members found.
									</TableCell>
								</TableRow>
							) : (
								membersData?.members.map((member) => (
									<TableRow key={member.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												<Avatar className="h-9 w-9">
													<AvatarImage src={member.user.image || ""} />
													<AvatarFallback>
														{member.user.name?.charAt(0) || "?"}
													</AvatarFallback>
												</Avatar>
												<div className="flex flex-col">
													<Link
														to="/org/members/$memberId"
														params={{ memberId: member.id }}
														className="font-medium hover:underline"
													>
														{member.user.name}
													</Link>
													<span className="text-muted-foreground text-xs">
														{member.user.email}
													</span>
												</div>
											</div>
										</TableCell>
										<TableCell>{_getRoleBadge(member.role)}</TableCell>
										<TableCell>
											{new Date(member.createdAt).toLocaleDateString()}
										</TableCell>
										<TableCell className="text-right">
											<DropdownMenu>
												<DropdownMenuTrigger
													className={buttonVariants({
														variant: "ghost",
														size: "icon",
													})}
												>
													<MoreHorizontal className="h-4 w-4" />
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuLabel>Change Role</DropdownMenuLabel>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														onClick={() =>
															handleRoleChange(member.id, "member")
														}
													>
														Member
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => handleRoleChange(member.id, "admin")}
													>
														Moderator
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => handleRoleChange(member.id, "owner")}
													>
														Owner
													</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem
														className="text-destructive focus:text-destructive"
														onClick={() => handleRemove(member.id)}
													>
														<Trash2 className="mr-2 h-4 w-4" /> Remove
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				{invitationsData && invitationsData.length > 0 && (
					<div className="space-y-4">
						<h2 className="font-semibold text-lg tracking-tight">
							Pending Invitations
						</h2>
						<div className="overflow-hidden rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead>Sent At</TableHead>
										<TableHead>Expires At</TableHead>
										<TableHead className="text-right">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{invitationsData.map((invite) => (
										<TableRow key={invite.id}>
											<TableCell>
												<div className="flex items-center gap-2">
													<Mail className="h-4 w-4 text-muted-foreground" />
													<span>{invite.email}</span>
												</div>
											</TableCell>
											<TableCell>{_getRoleBadge(invite.role)}</TableCell>
											<TableCell>
												{new Date(invite.createdAt).toLocaleDateString()}
											</TableCell>
											<TableCell>
												{new Date(invite.expiresAt).toLocaleDateString()}
											</TableCell>
											<TableCell className="text-right">
												<Button
													variant="ghost"
													size="sm"
													className="text-destructive hover:text-destructive"
													onClick={() => handleCancelInvite(invite.id)}
													disabled={cancelInvitation.isPending}
												>
													<X className="mr-2 h-4 w-4" />
													Cancel
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</div>
				)}
			</div>
		</>
	);
}
