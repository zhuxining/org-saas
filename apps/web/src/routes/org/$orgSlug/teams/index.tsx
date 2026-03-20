import { Button } from "@org-sass/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@org-sass/ui/components/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, UsersRound } from "lucide-react";
import { useState } from "react";
import { usePermission } from "@/hooks/use-permission";
import { useOrgContext } from "@/lib/org-context";
import { orgFullQueryOptions } from "@/lib/query-options";
import { CreateTeamDialog } from "./-components/create-team-dialog";

export const Route = createFileRoute("/org/$orgSlug/teams/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			orgFullQueryOptions(context.org.id),
		);
	},
	component: TeamsPage,
});

function TeamsPage() {
	const { org } = useOrgContext();
	const { orgSlug } = Route.useParams();
	const canCreateTeam = usePermission({ team: ["create"] });
	const [createOpen, setCreateOpen] = useState(false);

	const { data } = useSuspenseQuery(orgFullQueryOptions(org.id));

	const teams =
		(
			data?.data as {
				teams?: Array<{ id: string; name: string; createdAt: Date }>;
			}
		)?.teams ?? [];

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl">团队管理</h1>
					<p className="text-muted-foreground text-sm">
						创建和管理组织内的团队
					</p>
				</div>
				{canCreateTeam && (
					<Button onClick={() => setCreateOpen(true)}>
						<Plus className="size-4" />
						创建团队
					</Button>
				)}
			</div>

			{teams.length === 0 ? (
				<Card className="flex flex-col items-center justify-center py-12">
					<UsersRound className="mb-4 size-12 text-muted-foreground" />
					<CardHeader className="items-center p-0">
						<CardTitle className="text-lg">还没有团队</CardTitle>
						<CardDescription>创建第一个团队来组织成员</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{teams.map((team) => (
						<Link
							key={team.id}
							to="/org/$orgSlug/teams/$teamId"
							params={{ orgSlug, teamId: team.id }}
						>
							<Card className="cursor-pointer transition-colors hover:bg-accent/50">
								<CardHeader>
									<div className="flex items-center gap-3">
										<UsersRound className="size-5 text-muted-foreground" />
										<CardTitle className="text-base">{team.name}</CardTitle>
									</div>
								</CardHeader>
							</Card>
						</Link>
					))}
				</div>
			)}

			<CreateTeamDialog
				open={createOpen}
				onOpenChange={setCreateOpen}
				orgId={org.id}
			/>
		</div>
	);
}
