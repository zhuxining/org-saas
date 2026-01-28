import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Crown,
	Mail,
	Save,
	Shield,
	ShieldAlert,
	Trash2,
	Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/admin/organizations/$orgId")({
	loader: async ({ context, params }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				orpc.organization.getFullOrganization.queryOptions({
					input: { organizationId: params.orgId },
				}),
			),
			context.queryClient.ensureQueryData(
				orpc.organization.listInvitations.queryOptions({
					input: { organizationId: params.orgId },
				}),
			),
		]);
	},
	component: AdminOrganizationDetailPage,
});

function AdminOrganizationDetailPage() {
	const { orgId } = Route.useParams();
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { confirm, ConfirmDialogComponent } = useConfirmDialog();

	// 数据已在 loader 中预取
	const { data: org } = useSuspenseQuery(
		orpc.organization.getFullOrganization.queryOptions({
			input: { organizationId: orgId },
		}),
	);

	const { data: invitations } = useSuspenseQuery(
		orpc.organization.listInvitations.queryOptions({
			input: { organizationId: orgId },
		}),
	);

	if (!org) {
		return null;
	}

	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
	const [newOwnerId, setNewOwnerId] = useState("");

	useEffect(() => {
		if (org) {
			setName(org.name);
			setSlug(org.slug);
		}
	}, [org]);

	const updateOrg = useMutation(
		orpc.organization.updateOrganization.mutationOptions({
			onSuccess: () => {
				toast.success("Organization updated successfully");
				queryClient.invalidateQueries({
					queryKey: orpc.organization.getFullOrganization.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update organization");
			},
		}),
	);

	const deleteOrg = useMutation(
		orpc.organization.deleteOrganization.mutationOptions({
			onSuccess: () => {
				toast.success("Organization deleted successfully");
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listOrganizations.key(),
				});
				navigate({ to: "/admin/organizations" });
			},
			onError: (error) => {
				toast.error(error.message || "Failed to delete organization");
			},
		}),
	);

	const transferOwnership = useMutation(
		orpc.admin.transferOrganizationOwnership.mutationOptions({
			onSuccess: () => {
				toast.success("Ownership transferred successfully");
				setIsTransferDialogOpen(false);
				setNewOwnerId("");
				queryClient.invalidateQueries({
					queryKey: orpc.organization.getFullOrganization.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to transfer ownership");
			},
		}),
	);

	const handleUpdate = (e: React.FormEvent) => {
		e.preventDefault();
		updateOrg.mutate({
			organizationId: orgId,
			data: { name, slug },
		});
	};

	const handleDelete = async () => {
		const confirmed = await confirm({
			title: "Delete Organization",
			description: "Are you sure? This action cannot be undone.",
			confirmLabel: "Delete",
			cancelLabel: "Cancel",
			variant: "destructive",
		});
		if (confirmed) {
			deleteOrg.mutate({ organizationId: orgId });
		}
	};

	const handleTransferOwnership = async () => {
		if (!newOwnerId) return;
		transferOwnership.mutate({
			organizationId: orgId,
			newOwnerId,
		});
	};

	// 计算统计数据
	const members = org.members || [];
	const owner = members.find((m) => m.role === "owner");
	const moderators = members.filter((m) => m.role === "moderator");
	const regularMembers = members.filter((m) => m.role === "member");

	const getRoleBadge = (role: string) => {
		switch (role) {
			case "owner":
				return (
					<Badge variant="default" className="gap-1">
						<Crown className="h-3 w-3" />
						Owner
					</Badge>
				);
			case "moderator":
				return (
					<Badge variant="secondary" className="gap-1">
						<Shield className="h-3 w-3" />
						Moderator
					</Badge>
				);
			default:
				return (
					<Badge variant="outline" className="gap-1">
						<Users className="h-3 w-3" />
						Member
					</Badge>
				);
		}
	};

	return (
		<>
			{ConfirmDialogComponent}
			<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
				<div className="flex items-center justify-between">
					<h1 className="font-bold text-2xl tracking-tight">
						Organization Details
					</h1>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsTransferDialogOpen(true)}
						>
							<Crown className="mr-2 h-4 w-4" />
							Transfer Ownership
						</Button>
						<Button variant="destructive" size="sm" onClick={handleDelete}>
							<Trash2 className="mr-2 h-4 w-4" />
							Delete Organization
						</Button>
					</div>
				</div>

				<div className="grid gap-6 md:grid-cols-3">
					{/* 统计卡片 */}
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								Total Members
							</CardTitle>
							<Users className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">{members.length}</div>
							<p className="text-muted-foreground text-xs">
								{owner ? 1 : 0} owner, {moderators.length} moderators,{" "}
								{regularMembers.length} members
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">
								Pending Invitations
							</CardTitle>
							<Mail className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-bold text-2xl">
								{invitations?.length || 0}
							</div>
							<p className="text-muted-foreground text-xs">
								Awaiting acceptance
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="font-medium text-sm">Created</CardTitle>
							<ShieldAlert className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="font-medium text-sm">
								{new Date(org.createdAt).toLocaleDateString()}
							</div>
							<p className="text-muted-foreground text-xs">
								{new Date(org.createdAt).toLocaleTimeString()}
							</p>
						</CardContent>
					</Card>
				</div>

				<div className="grid gap-6 lg:grid-cols-2">
					{/* 基本信息卡片 */}
					<Card>
						<CardHeader>
							<CardTitle>General Information</CardTitle>
							<CardDescription>
								Update basic organization details.
							</CardDescription>
						</CardHeader>
						<form onSubmit={handleUpdate}>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="name">Name</Label>
									<Input
										id="name"
										value={name}
										onChange={(e) => setName(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="slug">Slug</Label>
									<Input
										id="slug"
										value={slug}
										onChange={(e) => setSlug(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label>Owner</Label>
									<div className="flex items-center gap-2">
										<Avatar className="h-6 w-6">
											<AvatarImage src={owner?.user?.image || ""} />
											<AvatarFallback>
												{owner?.user?.name?.charAt(0).toUpperCase() || "?"}
											</AvatarFallback>
										</Avatar>
										<span className="text-sm">
											{owner?.user?.name || "No owner"}
										</span>
									</div>
								</div>
							</CardContent>
							<CardFooter>
								<Button type="submit" disabled={updateOrg.isPending}>
									<Save className="mr-2 h-4 w-4" />
									Save Changes
								</Button>
							</CardFooter>
						</form>
					</Card>

					{/* 成员列表卡片 */}
					<Card>
						<CardHeader>
							<CardTitle>Members</CardTitle>
							<CardDescription>
								View organization members. (Read-only view for admin)
							</CardDescription>
						</CardHeader>
						<CardContent>
							{members.length === 0 ? (
								<div className="py-8 text-center text-muted-foreground text-sm">
									No members in this organization
								</div>
							) : (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>User</TableHead>
											<TableHead>Role</TableHead>
											<TableHead className="text-right">Joined</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{members.map((member) => (
											<TableRow key={member.id}>
												<TableCell>
													<div className="flex items-center gap-2">
														<Avatar className="h-6 w-6">
															<AvatarImage src={member.user?.image || ""} />
															<AvatarFallback>
																{member.user?.name?.charAt(0).toUpperCase() ||
																	"?"}
															</AvatarFallback>
														</Avatar>
														<div>
															<div className="font-medium text-sm">
																{member.user?.name}
															</div>
															<div className="text-muted-foreground text-xs">
																{member.user?.email}
															</div>
														</div>
													</div>
												</TableCell>
												<TableCell>{getRoleBadge(member.role)}</TableCell>
												<TableCell className="text-right text-muted-foreground text-xs">
													{new Date(member.createdAt).toLocaleDateString()}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</CardContent>
					</Card>
				</div>

				{/* 邀请列表卡片 */}
				<Card>
					<CardHeader>
						<CardTitle>Pending Invitations</CardTitle>
						<CardDescription>
							Invitations sent to join this organization.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{!invitations || invitations.length === 0 ? (
							<div className="py-8 text-center text-muted-foreground text-sm">
								No pending invitations
							</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead>Expires</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{invitations.map((invitation) => (
										<TableRow key={invitation.id}>
											<TableCell>{invitation.email}</TableCell>
											<TableCell>
												<Badge variant="outline">{invitation.role}</Badge>
											</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{new Date(invitation.expiresAt).toLocaleString()}
											</TableCell>
											<TableCell>
												<Badge
													variant={
														invitation.status === "accepted"
															? "default"
															: "secondary"
													}
												>
													{invitation.status}
												</Badge>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			</div>

			{/* 转移所有权对话框 */}
			<Dialog
				open={isTransferDialogOpen}
				onOpenChange={setIsTransferDialogOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Transfer Organization Ownership</DialogTitle>
						<DialogDescription>
							Transfer ownership of "{org.name}" to another user. The current
							owner will be demoted to moderator.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="newOwnerId">New Owner User ID</Label>
							<Input
								id="newOwnerId"
								value={newOwnerId}
								onChange={(e) => setNewOwnerId(e.target.value)}
								placeholder="Enter user ID"
							/>
							<p className="text-muted-foreground text-xs">
								Enter the ID of the user who will become the new owner
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsTransferDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							disabled={transferOwnership.isPending || !newOwnerId}
							onClick={handleTransferOwnership}
						>
							{transferOwnership.isPending
								? "Transferring..."
								: "Transfer Ownership"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
