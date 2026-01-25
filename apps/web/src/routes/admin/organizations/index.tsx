import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Plus, Trash2 } from "lucide-react";
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
import { requireAdmin } from "@/utils/route-guards";

export const Route = createFileRoute("/admin/organizations/")({
	beforeLoad: requireAdmin,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			orpc.organization.listOrganizations.queryOptions(),
		);
	},
	component: AdminOrganizationsPage,
});

function AdminOrganizationsPage() {
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialogComponent } = useConfirmDialog();

	// 数据已在 loader 中预取，无加载状态
	const { data: orgs } = useSuspenseQuery(
		orpc.organization.listOrganizations.queryOptions(),
	);

	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [newOrgName, setNewOrgName] = useState("");
	const [newOrgSlug, setNewOrgSlug] = useState("");

	const createOrg = useMutation(
		orpc.organization.createOrganization.mutationOptions({
			onSuccess: () => {
				setIsCreateOpen(false);
				setNewOrgName("");
				setNewOrgSlug("");
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listOrganizations.key(),
				});
			},
		}),
	);

	const deleteOrg = useMutation(
		orpc.organization.deleteOrganization.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.organization.listOrganizations.key(),
				});
			},
		}),
	);

	const handleCreate = (e: React.FormEvent) => {
		e.preventDefault();
		if (!newOrgName || !newOrgSlug) return;
		createOrg.mutate({ name: newOrgName, slug: newOrgSlug });
	};

	const handleDelete = async (id: string, name: string) => {
		const confirmed = await confirm({
			title: "Delete Organization",
			description: `Are you sure you want to delete ${name}? This cannot be undone.`,
			confirmLabel: "Delete",
			cancelLabel: "Cancel",
			variant: "destructive",
		});
		if (confirmed) {
			deleteOrg.mutate({ organizationId: id });
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
								<BreadcrumbLink href="/admin/dashboard">Admin</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator className="hidden md:block" />
							<BreadcrumbItem>
								<BreadcrumbPage>Organizations</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</div>
			</header>

			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="font-bold text-2xl tracking-tight">Organizations</h1>
						<p className="text-muted-foreground">
							Manage all organizations in the system.
						</p>
					</div>

					<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
						<DialogTrigger
							className={buttonVariants({
								className: "cursor-pointer",
							})}
						>
							<Plus className="mr-2 h-4 w-4" />
							Create Organization
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create Organization</DialogTitle>
								<DialogDescription>
									Enter the details for the new organization.
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleCreate} className="space-y-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="name">Name</Label>
									<Input
										id="name"
										value={newOrgName}
										onChange={(e) => setNewOrgName(e.target.value)}
										placeholder="Acme Corp"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="slug">Slug</Label>
									<Input
										id="slug"
										value={newOrgSlug}
										onChange={(e) => setNewOrgSlug(e.target.value)}
										placeholder="acme-corp"
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
									<Button type="submit" disabled={createOrg.isPending}>
										{createOrg.isPending ? "Creating..." : "Create"}
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
								<TableHead>Slug</TableHead>
								<TableHead>Owner</TableHead>
								<TableHead>Members</TableHead>
								<TableHead>Created At</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{orgs?.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="h-24 text-center">
										No organizations found.
									</TableCell>
								</TableRow>
							) : (
								orgs?.map((org) => (
									<TableRow key={org.id}>
										<TableCell className="font-medium">{org.name}</TableCell>
										<TableCell>{org.slug}</TableCell>
										<TableCell>{"Unknown"}</TableCell>
										<TableCell>{0}</TableCell>
										<TableCell>
											{new Date(org.createdAt).toLocaleDateString()}
										</TableCell>
										<TableCell className="text-right">
											<div
												className="flex justify-end gap-2"
												onClick={(e) => e.stopPropagation()}
												onKeyDown={(e) => e.stopPropagation()}
												role="none"
											>
												<Button variant="ghost" size="icon">
													<Link
														to={"/admin/organizations/$orgId"}
														params={{ orgId: org.id }}
													>
														<Eye className="h-4 w-4" />
													</Link>
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="text-destructive hover:bg-destructive/10 hover:text-destructive"
													onClick={() => handleDelete(org.id, org.name)}
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
		</>
	);
}
