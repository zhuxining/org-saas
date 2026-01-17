import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/_layout/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="space-y-6">
			<div className="grid gap-4 md:grid-cols-3">
				<div className="rounded-lg border p-4">
					<h3 className="font-medium text-sm">Total Users</h3>
					<p className="font-bold text-2xl">-</p>
				</div>
				<div className="rounded-lg border p-4">
					<h3 className="font-medium text-sm">Total Organizations</h3>
					<p className="font-bold text-2xl">-</p>
				</div>
				<div className="rounded-lg border p-4">
					<h3 className="font-medium text-sm">Active Sessions</h3>
					<p className="font-bold text-2xl">-</p>
				</div>
			</div>

			<div className="rounded-lg border p-4">
				<h2 className="mb-4 font-semibold text-lg">Recent Activity</h2>
				<p className="text-muted-foreground text-sm">No recent activity</p>
			</div>
		</div>
	);
}
