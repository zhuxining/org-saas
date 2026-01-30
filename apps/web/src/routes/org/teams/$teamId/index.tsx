import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle, Users, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/org/teams/$teamId/")({
	loader: async ({ context, params }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(orpc.privateData.queryOptions()),
			context.queryClient.ensureQueryData(
				orpc.organization.listTeamMembers.queryOptions({
					input: { teamId: params.teamId },
				}),
			),
			context.queryClient.ensureQueryData(
				orpc.organization.listMembers.queryOptions({ input: {} }),
			),
		]);
	},
	component: TeamOverviewPage,
});

function TeamOverviewPage() {
	const { teamId } = Route.useParams();
	const queryClient = useQueryClient();

	const { data: session } = useSuspenseQuery(orpc.privateData.queryOptions());
	const { data: teamMembers } = useSuspenseQuery(
		orpc.organization.listTeamMembers.queryOptions({
			input: { teamId },
		}),
	);
	const { data: orgMembersData } = useSuspenseQuery(
		orpc.organization.listMembers.queryOptions({ input: {} }),
	);

	const activeTeamId = (
		session.user as {
			activeTeamId?: string | null;
		}
	).activeTeamId;
	const isActiveTeam = activeTeamId === teamId;

	const setActiveTeam = useMutation(
		orpc.organization.setActiveTeam.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.privateData.key(),
				});
			},
		}),
	);

	const handleSetActiveTeam = () => {
		setActiveTeam.mutate({ teamId });
	};

	// 创建 userId 到 member 的映射
	const memberMap = new Map(
		orgMembersData?.members.map((member) => [member.userId, member]),
	);

	return (
		<div className="flex flex-1 flex-col gap-4">
			<div className="grid gap-6 md:grid-cols-3">
				{/* 成员数量统计卡片 */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Total Members</CardTitle>
						<Users className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{teamMembers?.length || 0}</div>
						<p className="text-muted-foreground text-xs">
							Active members in this team
						</p>
					</CardContent>
				</Card>

				{/* 活跃团队状态卡片 */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Status</CardTitle>
						<CheckCircle className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						{isActiveTeam ? (
							<>
								<div className="font-semibold text-sm">Active Team</div>
								<p className="text-muted-foreground text-xs">
									This is your currently active team
								</p>
							</>
						) : (
							<>
								<Button
									variant="outline"
									size="sm"
									onClick={handleSetActiveTeam}
									disabled={setActiveTeam.isPending}
									className="w-full"
								>
									<CheckCircle className="mr-2 h-4 w-4" />
									Set as Active
								</Button>
								<p className="mt-2 text-muted-foreground text-xs">
									Make this your active team
								</p>
							</>
						)}
					</CardContent>
				</Card>

				{/* 快速操作卡片 */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">Actions</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<Link
							to="/org/teams/$teamId/members"
							params={{ teamId }}
							className={buttonVariants({
								variant: "outline",
								className: "w-full",
							})}
						>
							Manage Members
						</Link>
					</CardContent>
				</Card>
			</div>

			{/* 成员列表 */}
			<Card>
				<CardHeader>
					<CardTitle>Team Members</CardTitle>
					<CardDescription>Members who belong to this team</CardDescription>
				</CardHeader>
				<CardContent>
					{teamMembers?.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground text-sm">
							No members in this team yet.
							<Link
								to="/org/teams/$teamId/members"
								params={{ teamId }}
								className={buttonVariants({
									variant: "link",
									className: "ml-2",
								})}
							>
								Add members
							</Link>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Member</TableHead>
									<TableHead>Role</TableHead>
									<TableHead className="text-right">Joined</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{teamMembers?.map((teamMember) => {
									const member = memberMap.get(teamMember.userId);
									if (!member) return null;
									return (
										<TableRow key={teamMember.userId}>
											<TableCell>
												<div className="flex items-center gap-2">
													<Avatar className="h-8 w-8">
														<AvatarImage
															src={member.user.image}
															alt={member.user.name}
															className="h-8 w-8"
															referrerPolicy="no-referrer"
														/>
														<AvatarFallback>
															{member.user.name.charAt(0).toUpperCase()}
														</AvatarFallback>
													</Avatar>
													<span className="font-medium">
														{member.user.name}
													</span>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline">{member.role}</Badge>
											</TableCell>
											<TableCell className="text-right text-muted-foreground text-xs">
												{new Date(teamMember.createdAt).toLocaleDateString()}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<div className="flex justify-between">
				<Link to="/org/teams" className={buttonVariants({ variant: "ghost" })}>
					<X className="mr-2 h-4 w-4" />
					Back to Teams
				</Link>
			</div>
		</div>
	);
}
