import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin/dashboard/")({
	component: AdminDashboard,
});

function AdminDashboard() {
	const { data: orgs, isLoading: orgsLoading } = useQuery(
		orpc.organization.listOrganizations.queryOptions(),
	);

	const { data: users, isLoading: usersLoading } = useQuery(
		orpc.admin.listUsers.queryOptions(),
	);

	const { data: session, isLoading: sessionLoading } = useQuery(
		orpc.privateData.queryOptions(),
	);

	if (sessionLoading || orgsLoading || usersLoading) {
		return (
			<div className="space-y-4 p-8">
				<Skeleton className="h-12 w-1/3" />
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-20 w-full" />
			</div>
		);
	}

	if (!session?.user) {
		const { redirect } = require("react");
		redirect({ to: "/login" });
	}

	const role = session.user.role;
	if (
		!role ||
		(Array.isArray(role) && !role.includes("admin")) ||
		(typeof role === "string" && role !== "admin")
	) {
		const { redirect } = require("react");
		redirect({ to: "/org/dashboard" });
	}

	const orgCount = orgs?.length || 0;
	const userCount = users?.length || 0;
	const sessionCount = 0;

	return (
		<>
			<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12" />
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
		</>
	);
}
