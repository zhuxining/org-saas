import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { orpc } from "@/utils/orpc";
import { requireAdmin } from "@/utils/route-guards";

export const Route = createFileRoute("/admin/organizations/$orgId")({
	beforeLoad: requireAdmin,
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			orpc.organization.getFullOrganization.queryOptions({
				input: { organizationId: params.orgId },
			}),
		);
	},
	component: AdminOrganizationDetailPage,
});

function AdminOrganizationDetailPage() {
	const { orgId } = Route.useParams();
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialogComponent } = useConfirmDialog();

	// 数据已在 loader 中预取，无加载状态
	const { data: org } = useSuspenseQuery(
		orpc.organization.getFullOrganization.queryOptions({
			input: { organizationId: orgId },
		}),
	);

	if (!org) {
		return null;
	}

	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");

	useEffect(() => {
		if (org) {
			setName(org.name);
			setSlug(org.slug);
		}
	}, [org]);

	const updateOrg = useMutation(
		orpc.organization.updateOrganization.mutationOptions({
			onSuccess: () => {
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
								<BreadcrumbLink href="/admin/organizations">
									Organizations
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator className="hidden md:block" />
							<BreadcrumbItem>
								<BreadcrumbPage>{org.name}</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</div>
			</header>

			<div className="flex flex-1 flex-col gap-6 p-4 pt-0">
				<div className="flex items-center justify-between">
					<h1 className="font-bold text-2xl tracking-tight">
						Organization Details
					</h1>
					<Button variant="destructive" size="sm" onClick={handleDelete}>
						<Trash2 className="mr-2 h-4 w-4" />
						Delete Organization
					</Button>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
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
									<Label>Created At</Label>
									<div className="text-muted-foreground text-sm">
										{new Date(org.createdAt).toLocaleString()}
									</div>
								</div>
								<div className="space-y-2">
									<Label>Owner</Label>
									<div className="flex items-center gap-2">
										<Avatar className="h-6 w-6">
											<AvatarImage src={""} />
											<AvatarFallback>{"?"}</AvatarFallback>
										</Avatar>
										<span className="text-sm">{"No owner"}</span>
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

					<Card>
						<CardHeader>
							<CardTitle>Members</CardTitle>
							<CardDescription>
								View organization members. (Read-only view for admin)
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="rounded-md bg-muted/30 p-4 text-center text-muted-foreground text-sm">
								<p>
									Member management for admins requires joining the organization
									context.
								</p>
								<p className="mt-2">Count: {0}</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</>
	);
}
