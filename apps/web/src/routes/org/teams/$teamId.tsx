import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export const Route = createFileRoute("/org/teams/$teamId")({
	beforeLoad: requireActiveOrg,
	loader: async ({ context, params }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(orpc.privateData.queryOptions()),
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
	component: TeamDetailPage,
});

function TeamDetailPage() {
	const { teamId } = Route.useParams();
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialogComponent } = useConfirmDialog();

	// 数据已在 loader 中预取，无加载状态
	const { data: session } = useSuspenseQuery(orpc.privateData.queryOptions());
	const { data: teamMembers } = useSuspenseQuery(
		orpc.organization.listTeamMembers.queryOptions({
			input: {
				teamId,
			},
		}),
	);
	const { data: orgMembersData } = useSuspenseQuery(
		orpc.organization.listMembers.queryOptions({
			input: {},
		}),
	);

	const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
	const [selectedMemberId, setSelectedMemberId] = useState<string>("");

	const activeTeamId = (
		session.user as {
			activeTeamId?: string | null;
		}
	).activeTeamId;
	const isActiveTeam = activeTeamId === teamId;

	const addTeamMember = useMutation(
		orpc.organization.addTeamMember.mutationOptions({
			onSuccess: () => {
				setIsAddMemberOpen(false);
				setSelectedMemberId("");
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listTeamMembers.key(),
				});
			},
		}),
	);

	const removeTeamMember = useMutation(
		orpc.organization.removeTeamMember.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listTeamMembers.key(),
				});
			},
		}),
	);

	const setActiveTeam = useMutation(
		orpc.organization.setActiveTeam.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.privateData.key(),
				});
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

	const handleSetActiveTeam = () => {
		setActiveTeam.mutate({ teamId });
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
								<BreadcrumbLink href="/org/dashboard">Org</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator className="hidden md:block" />
							<BreadcrumbItem className="hidden md:block">
								<BreadcrumbLink href="/org/teams">Teams</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator className="hidden md:block" />
							<BreadcrumbItem>
								<BreadcrumbPage>Team Details</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</div>
			</header>

			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="font-bold text-2xl tracking-tight">Team Details</h1>
						<p className="text-muted-foreground">
							Manage team members and settings.
						</p>
					</div>

					<div className="flex gap-2">
						<Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
							<DialogTrigger
								className={buttonVariants({
									className: "cursor-pointer",
								})}
							>
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
											onValueChange={(value) =>
												setSelectedMemberId(value || "")
											}
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

						<Button
							variant={isActiveTeam ? "default" : "outline"}
							onClick={handleSetActiveTeam}
							disabled={setActiveTeam.isPending || isActiveTeam}
						>
							{isActiveTeam ? <CheckCircle className="mr-2 h-4 w-4" /> : null}
							{isActiveTeam ? "Active Team" : "Set as Active"}
						</Button>
					</div>
				</div>

				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Member</TableHead>
								<TableHead>Email</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{teamMembers?.length === 0 ? (
								<TableRow>
									<TableCell colSpan={3} className="h-24 text-center">
										No team members found.
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
											<TableCell className="text-right">
												<div className="flex justify-end gap-2">
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
												</div>
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
						to="/org/teams"
						className={buttonVariants({ variant: "ghost" })}
					>
						<X className="mr-2 h-4 w-4" />
						Back to Teams
					</Link>
				</div>
			</div>
		</>
	);
}
