import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/org/_layout/")({
	component: RouteComponent,
});

function RouteComponent() {
	const organizations = useQuery(
		orpc.org.organization.listOrganizations.queryOptions(),
	);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="font-bold text-2xl">My Organizations</h2>
				<Link to="/org/create">
					<Button>Create New Organization</Button>
				</Link>
			</div>

			{organizations.isLoading ? (
				<div>Loading organizations...</div>
			) : organizations.error ? (
				<div className="text-destructive">
					Error: {organizations.error.message}
				</div>
			) : organizations.data && organizations.data.length > 0 ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{organizations.data.map((org) => (
						<Card key={org.id}>
							<CardHeader>
								<CardTitle>{org.name}</CardTitle>
								<CardDescription>@{org.slug}</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex gap-2">
									<Link to={`/org/${org.id}`}>
										<Button size="sm" variant="outline">
											View
										</Button>
									</Link>
									<Link to={`/org/${org.id}/settings`}>
										<Button size="sm" variant="outline">
											Settings
										</Button>
									</Link>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			) : (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<p className="mb-4 text-muted-foreground">
							You don't have any organizations yet
						</p>
						<Link to="/org/create">
							<Button>Create Your First Organization</Button>
						</Link>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
