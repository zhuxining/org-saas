import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin/_layout/organizations")({
	component: RouteComponent,
});

function RouteComponent() {
	const queryClient = useQueryClient();

	const organizations = useQuery(
		orpc.admin.organization.listOrganizations.queryOptions({
			limit: 50,
			offset: 0,
		}),
	);

	const deleteOrganization = useMutation({
		mutationFn: async (organizationId: string) => {
			return orpc.admin.organization.deleteOrganization({ organizationId });
		},
		onSuccess: () => {
			queryClient.invalidateQueries(
				orpc.admin.organization.listOrganizations.queryKey(),
			);
			toast.success("Organization deleted successfully");
		},
		onError: () => {
			toast.error("Failed to delete organization");
		},
	});

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="font-bold text-2xl">Organizations</h2>
			</div>

			{organizations.isLoading ? (
				<div>Loading organizations...</div>
			) : organizations.error ? (
				<div className="text-destructive">
					Error: {organizations.error.message}
				</div>
			) : (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Slug</TableHead>
								<TableHead>Members</TableHead>
								<TableHead>Created</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{organizations.data?.map((org) => (
								<TableRow key={org.id}>
									<TableCell className="font-medium">{org.name}</TableCell>
									<TableCell>
										<code className="text-muted-foreground text-sm">
											{org.slug}
										</code>
									</TableCell>
									<TableCell>{org.members?.length || 0}</TableCell>
									<TableCell>
										{new Date(org.createdAt).toLocaleDateString()}
									</TableCell>
									<TableCell>
										<Button
											size="sm"
											variant="destructive"
											onClick={() => {
												if (
													confirm(
														`Are you sure you want to delete "${org.name}"?`,
													)
												) {
													deleteOrganization.mutate(org.id);
												}
											}}
											disabled={deleteOrganization.isPending}
										>
											Delete
										</Button>
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
