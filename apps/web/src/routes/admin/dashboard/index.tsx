import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin/dashboard/")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				orpc.organization.listOrganizations.queryOptions({ input: {} }),
			),
			context.queryClient.ensureQueryData(
				orpc.admin.listUsers.queryOptions({ input: {} }),
			),
		]);
	},
	component: AdminDashboard,
});

function AdminDashboard() {
	const { data: orgs } = useSuspenseQuery(
		orpc.organization.listOrganizations.queryOptions({ input: {} }),
	);
	const { data: users } = useSuspenseQuery(
		orpc.admin.listUsers.queryOptions({ input: {} }),
	);

	const orgCount = orgs?.length ?? 0;
	const userCount = users?.users?.length ?? 0;
	const sessionCount = 0;

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<div className="grid auto-rows-min gap-4 md:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Organizations</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-4xl">{orgCount}</div>
						<CardDescription>Total organizations in system</CardDescription>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Users</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-4xl">{userCount}</div>
						<CardDescription>Total users in system</CardDescription>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Active Sessions</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="font-bold text-4xl">{sessionCount}</div>
						<CardDescription>Currently active sessions</CardDescription>
					</CardContent>
				</Card>
			</div>
			<div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min" />
		</div>
	);
}
