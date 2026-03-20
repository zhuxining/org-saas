import { Button } from "@org-sass/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@org-sass/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@org-sass/ui/components/table";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/UserAvatar";
import { usePermission } from "@/hooks/use-permission";
import { authClient } from "@/lib/auth-client";
import { useOrgContext } from "@/lib/org-context";
import { orgFullQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/org/$orgSlug/teams/$teamId")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			orgFullQueryOptions(context.org.id),
		);
	},
	component: TeamDetailPage,
});

function TeamDetailPage() {
	const { org } = useOrgContext();
	const { orgSlug, teamId } = Route.useParams();
	const canManageTeam = usePermission({ team: ["update", "delete"] });
	const queryClient = useQueryClient();

	const { data } = useSuspenseQuery(orgFullQueryOptions(org.id));

	const fullOrg = data?.data as {
		teams?: Array<{
			id: string;
			name: string;
			members?: Array<{
				userId: string;
				user: { name: string; email: string; image?: string | null };
			}>;
		}>;
	} | null;

	const team = fullOrg?.teams?.find((t) => t.id === teamId);
	const teamMembers = team?.members ?? [];

	const handleRemoveTeam = async () => {
		const result = await authClient.organization.removeTeam({
			teamId,
			organizationId: org.id,
		});
		if (result.error) {
			toast.error(result.error.message ?? "删除失败");
		} else {
			toast.success("团队已删除");
			queryClient.invalidateQueries(orgFullQueryOptions(org.id));
		}
	};

	if (!team) {
		return (
			<div className="p-6">
				<p className="text-muted-foreground">团队不存在</p>
			</div>
		);
	}

	return (
		<div className="p-6">
			<div className="mb-6">
				<Link
					to="/org/$orgSlug/teams"
					params={{ orgSlug }}
					className="mb-4 inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
				>
					<ArrowLeft className="size-4" />
					返回团队列表
				</Link>
				<div className="flex items-center justify-between">
					<h1 className="font-bold text-2xl">{team.name}</h1>
					{canManageTeam && (
						<Button variant="destructive" size="sm" onClick={handleRemoveTeam}>
							<Trash2 className="size-4" />
							删除团队
						</Button>
					)}
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">团队成员</CardTitle>
				</CardHeader>
				<CardContent>
					{teamMembers.length === 0 ? (
						<p className="text-muted-foreground text-sm">此团队暂无成员</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>成员</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{teamMembers.map((tm) => (
									<TableRow key={tm.userId}>
										<TableCell>
											<div className="flex items-center gap-3">
												<UserAvatar name={tm.user.name} image={tm.user.image} />
												<div>
													<p className="font-medium">{tm.user.name}</p>
													<p className="text-muted-foreground text-sm">
														{tm.user.email}
													</p>
												</div>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
