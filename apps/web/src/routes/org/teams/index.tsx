import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/org/teams/")({
	beforeLoad: requireActiveOrg,
	loader: async ({ context }) => {
		// 预取团队数据
		await context.queryClient.ensureQueryData(
			orpc.organization.listTeams.queryOptions({ input: {} }),
		);
	},
	component: TeamsListPage,
});

function TeamsListPage() {
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialogComponent } = useConfirmDialog();

	// 数据已在 loader 中预取，无加载状态
	const { data: teams } = useSuspenseQuery(
		orpc.organization.listTeams.queryOptions({ input: {} }),
	);
	const { data: session } = useSuspenseQuery(orpc.privateData.queryOptions());

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [newTeamName, setNewTeamName] = useState("");
	const [editingTeam, setEditingTeam] = useState<{
		id: string;
		name: string;
	} | null>(null);

	const organizationId =
		(
			session.user as {
				activeOrganizationId?: string | null;
			}
		).activeOrganizationId ?? "";

	const createTeam = useMutation(
		orpc.organization.createTeam.mutationOptions({
			onSuccess: () => {
				setIsCreateOpen(false);
				setNewTeamName("");
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listTeams.key(),
				});
			},
		}),
	);

	const updateTeam = useMutation(
		orpc.organization.updateTeam.mutationOptions({
			onSuccess: () => {
				setIsEditOpen(false);
				setEditingTeam(null);
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listTeams.key(),
				});
			},
		}),
	);

	const deleteTeam = useMutation(
		orpc.organization.removeTeam.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listTeams.key(),
				});
			},
		}),
	);

	const handleCreate = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newTeamName) return;
		createTeam.mutate({ name: newTeamName, organizationId });
	};

	const handleEdit = (team: { id: string; name: string }) => {
		setEditingTeam(team);
		setNewTeamName(team.name);
		setIsEditOpen(true);
	};

	const handleUpdate = (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingTeam) return;
		updateTeam.mutate({
			teamId: editingTeam.id,
			data: { name: newTeamName },
			organizationId,
		});
	};

	const handleDelete = async (id: string, name: string) => {
		const confirmed = await confirm({
			title: "Delete Team",
			description: `Are you sure you want to delete ${name}? This cannot be undone.`,
			confirmLabel: "Delete",
			cancelLabel: "Cancel",
			variant: "destructive",
		});
		if (confirmed) {
			deleteTeam.mutate({ teamId: id, organizationId });
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
								<BreadcrumbLink href="/org/dashboard">Org</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator className="hidden md:block" />
							<BreadcrumbItem>
								<BreadcrumbPage>Teams</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</div>
			</header>

			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="font-bold text-2xl tracking-tight">Teams</h1>
						<p className="text-muted-foreground">
							Manage teams in your organization.
						</p>
					</div>

					<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
						<DialogTrigger
							className={buttonVariants({
								className: "cursor-pointer",
							})}
						>
							<Plus className="mr-2 h-4 w-4" />
							Create Team
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create Team</DialogTitle>
								<DialogDescription>
									Enter the details for the new team.
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleCreate} className="space-y-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="name">Name</Label>
									<Input
										id="name"
										value={newTeamName}
										onChange={(e) => setNewTeamName(e.target.value)}
										placeholder="Engineering Team"
										required
									/>
								</div>
								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsCreateOpen(false)}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={createTeam.isPending}>
										{createTeam.isPending ? "Creating..." : "Create"}
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
								<TableHead>Name</TableHead>
								<TableHead>Members</TableHead>
								<TableHead>Created At</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{teams?.length === 0 ? (
								<TableRow>
									<TableCell colSpan={4} className="h-24 text-center">
										No teams found.
									</TableCell>
								</TableRow>
							) : (
								teams?.map((team) => (
									<TableRow key={team.id}>
										<TableCell className="font-medium">{team.name}</TableCell>
										<TableCell>0</TableCell>
										<TableCell>
											{new Date(team.createdAt).toLocaleDateString()}
										</TableCell>
										<TableCell className="text-right">
											<div
												className="flex justify-end gap-2"
												onClick={(e) => e.stopPropagation()}
												onKeyDown={(e) => e.stopPropagation()}
												role="none"
											>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => handleEdit(team)}
												>
													<Edit className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="text-destructive hover:bg-destructive/10 hover:text-destructive"
													onClick={() => handleDelete(team.id, team.name)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</div>

			<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Team</DialogTitle>
						<DialogDescription>Update the team name.</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleUpdate} className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="edit-name">Name</Label>
							<Input
								id="edit-name"
								value={newTeamName}
								onChange={(e) => setNewTeamName(e.target.value)}
								placeholder="Engineering Team"
								required
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsEditOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={updateTeam.isPending}>
								{updateTeam.isPending ? "Updating..." : "Update"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
