import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@org-sass/ui/components/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Users, UsersRound } from "lucide-react";
import { useOrgContext } from "@/lib/org-context";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/org/$orgSlug/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			orpc.dashboard.orgStats.queryOptions({
				input: { orgId: context.org.id },
			}),
		);
	},
	component: OrgDashboard,
});

function OrgDashboard() {
	const { org } = useOrgContext();

	const { data: stats } = useSuspenseQuery(
		orpc.dashboard.orgStats.queryOptions({ input: { orgId: org.id } }),
	);

	const statCards = [
		{ label: "成员", value: stats?.memberCount ?? 0, icon: Users },
		{ label: "团队", value: stats?.teamCount ?? 0, icon: UsersRound },
		{
			label: "待处理邀请",
			value: stats?.pendingInvitationCount ?? 0,
			icon: Mail,
		},
	];

	return (
		<div className="p-6">
			<h1 className="mb-6 font-bold text-2xl">{org.name}</h1>

			<div className="grid gap-4 sm:grid-cols-3">
				{statCards.map(({ label, value, icon: Icon }) => (
					<Card key={label}>
						<CardHeader className="flex-row items-center justify-between pb-2">
							<CardTitle className="font-medium text-muted-foreground text-sm">
								{label}
							</CardTitle>
							<Icon className="size-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<p className="font-bold text-2xl">{value}</p>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
