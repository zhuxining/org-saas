import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, MoreHorizontal, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
import { requireActiveOrg } from "@/utils/route-guards";

export const Route = createFileRoute("/org/members/")({
	beforeLoad: requireActiveOrg,
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
				setIsInviteOpen(false);
				setInviteEmail("");
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listInvitations.key(),
				});
			},
		}),
	);

	const removeMember = useMutation(
		orpc.organization.removeMember.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listMembers.key(),
				});
			},
		}),
	);

	const updateRole = useMutation(
		orpc.organization.updateMemberRole.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listMembers.key(),
				});
			},
		}),
	);

	const cancelInvitation = useMutation(
		orpc.organization.cancelInvitation.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listInvitations.key(),
				});
			},
		}),
	);

	const handleInvite = (e: React.FormEvent) => {
		e.preventDefault();
		inviteMember.mutate({
			email: inviteEmail,
			role: inviteRole as "member" | "admin" | "owner",
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
			role: newRole as "member" | "admin" | "owner",
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

	return (
		<>
			{ConfirmDialogComponent}
			<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
				<div className="flex items-center gap-2 px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-[orientation=vertical]:h-4"
					/>
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem className="hidden md:block">
								<BreadcrumbLink href="/org/dashboard">
									Organization
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator className="hidden md:block" />
							<BreadcrumbItem>
								<BreadcrumbPage>Members</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</div>
			</header>

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
											<SelectItem value="admin">Admin</SelectItem>
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

				<div className="rounded-md border">
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
													<span className="font-medium">
														{member.user.name}
													</span>
													<span className="text-muted-foreground text-xs">
														{member.user.email}
													</span>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="outline" className="capitalize">
												{member.role}
											</Badge>
										</TableCell>
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
														Admin
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
						<div className="rounded-md border">
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
											<TableCell>
												<Badge variant="outline" className="capitalize">
													{invite.role}
												</Badge>
											</TableCell>
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
