import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Trash2, X } from "lucide-react";
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

export const Route = createFileRoute("/org/teams/$teamId/members")({
	beforeLoad: async ({ context }) => {
		const { requirePermission } = await import("@/utils/permission-guards");
		await requirePermission({ context }, "team", ["manage-members"]);
	},
	loader: async ({ context, params }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				orpc.organization.listTeamMembers.queryOptions({
					input: { teamId: params.teamId },
				}),
			),
			context.queryClient.ensureQueryData(
				orpc.organization.listMembers.queryOptions({ input: {} }),
			),
		]);
	},
	component: TeamMembersPage,
});

function TeamMembersPage() {
	const { teamId } = Route.useParams();
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialogComponent } = useConfirmDialog();

	const { data: teamMembers } = useSuspenseQuery(
		orpc.organization.listTeamMembers.queryOptions({
			input: { teamId },
		}),
	);
	const { data: orgMembersData } = useSuspenseQuery(
		orpc.organization.listMembers.queryOptions({ input: {} }),
	);

	const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
	const [selectedMemberId, setSelectedMemberId] = useState<string>("");

	const addTeamMember = useMutation(
		orpc.organization.addTeamMember.mutationOptions({
			onSuccess: () => {
				toast.success("Member added to team successfully");
				setIsAddMemberOpen(false);
				setSelectedMemberId("");
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listTeamMembers.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to add member to team");
			},
		}),
	);

	const removeTeamMember = useMutation(
		orpc.organization.removeTeamMember.mutationOptions({
			onSuccess: () => {
				toast.success("Member removed from team successfully");
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listTeamMembers.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to remove member from team");
			},
		}),
	);

	const handleAddMember = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedMemberId) return;
		addTeamMember.mutate({ teamId, userId: selectedMemberId });
	};

	const handleRemoveMember = async (memberId: string, memberName: string) => {
		const confirmed = await confirm({
			title: "Remove Team Member",
			description: `Are you sure you want to remove ${memberName} from this team?`,
			variant: "destructive",
		});
		if (confirmed) {
			removeTeamMember.mutate({ teamId, userId: memberId });
		}
	};

	const orgMembers = orgMembersData?.members || [];
	const availableMembers = orgMembers.filter(
		(orgMember) =>
			!teamMembers?.some(
				(teamMember) => teamMember.userId === orgMember.userId,
			),
	);

	// 创建 userId 到 member 的映射
	const memberMap = new Map(
		orgMembers.map((member) => [member.userId, member]),
	);

	return (
		<>
			{ConfirmDialogComponent}
			<div className="flex flex-1 flex-col gap-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-semibold text-lg">Manage Team Members</h2>
						<p className="text-muted-foreground text-sm">
							Add or remove members from this team
						</p>
					</div>

					<Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
						<DialogTrigger className={buttonVariants()}>
							<Plus className="mr-2 h-4 w-4" />
							Add Member
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Add Team Member</DialogTitle>
								<DialogDescription>
									Select a member from your organization to add to this team.
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleAddMember} className="space-y-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="member">Member</Label>
									<Select
										value={selectedMemberId}
										onValueChange={(val) => val && setSelectedMemberId(val)}
										required
									>
										<SelectTrigger id="member">
											<SelectValue placeholder="Select a member" />
										</SelectTrigger>
										<SelectContent>
											{availableMembers.map((member) => (
												<SelectItem key={member.userId} value={member.userId}>
													{member.user.name} ({member.user.email})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsAddMemberOpen(false)}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={addTeamMember.isPending}>
										{addTeamMember.isPending ? "Adding..." : "Add"}
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
								<TableHead>Member</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{teamMembers?.length === 0 ? (
								<TableRow>
									<TableCell colSpan={4} className="h-24 text-center">
										No team members found. Add members to get started.
									</TableCell>
								</TableRow>
							) : (
								teamMembers?.map((teamMember) => {
									const member = memberMap.get(teamMember.userId);
									if (!member) return null;
									return (
										<TableRow key={teamMember.userId}>
											<TableCell>
												<div className="flex items-center gap-2">
													<Avatar className="h-8 w-8">
														<AvatarImage
															src={member.user.image}
															alt={member.user.name}
															className="h-8 w-8"
															referrerPolicy="no-referrer"
														/>
														<AvatarFallback>
															{member.user.name.charAt(0).toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<span className="font-medium">
														{member.user.name}
													</span>
												</div>
											</TableCell>
											<TableCell>{member.user.email}</TableCell>
											<TableCell>
												<Badge variant="outline">{member.role}</Badge>
											</TableCell>
											<TableCell className="text-right">
												<Button
													variant="ghost"
													size="icon"
													className="text-destructive hover:bg-destructive/10 hover:text-destructive"
													onClick={() =>
														handleRemoveMember(
															teamMember.userId,
															member.user.name,
														)
													}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</TableCell>
										</TableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</div>

				<div className="flex justify-between">
					<Link
						to="/org/teams/$teamId"
						params={{ teamId }}
						className={buttonVariants({ variant: "ghost" })}
					>
						<X className="mr-2 h-4 w-4" />
						Back to Team Overview
					</Link>
				</div>
			</div>
		</>
	);
}
