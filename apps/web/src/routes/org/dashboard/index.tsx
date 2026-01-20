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

export const Route = createFileRoute("/org/dashboard/")({
	component: OrgDashboard,
});

function OrgDashboard() {
	const { data: session, isLoading: sessionLoading } = useQuery(
		orpc.privateData.queryOptions(),
	);

	const { isLoading: orgLoading } = useQuery(
		orpc.organization.getFullOrganization.queryOptions({
			organizationId: session?.user?.activeOrganizationId || "",
		}),
	);

	const { data: members, isLoading: membersLoading } = useQuery(
		orpc.organization.listMembers.queryOptions({
			organizationId: session?.user?.activeOrganizationId || "",
		}),
	);

	const { data: teams, isLoading: teamsLoading } = useQuery(
		orpc.organization.listTeams.queryOptions({
			organizationId: session?.user?.activeOrganizationId || "",
		}),
	);

	const { data: invitations, isLoading: invitationsLoading } = useQuery(
		orpc.organization.listInvitations.queryOptions({
			organizationId: session?.user?.activeOrganizationId || "",
		}),
	);

	const _isLoading =
		sessionLoading ||
		orgLoading ||
		membersLoading ||
		teamsLoading ||
		invitationsLoading;

	if (!session?.user) {
		return null;
	}

	if (!session?.user?.activeOrganizationId) {
		return (
			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-20 w-full" />
			</div>
		);
	}

	const membersCount = members?.length || 0;
	const teamsCount = teams?.length || 0;
	const pendingInvitationsCount = invitations?.length || 0;

	return (
		<>
			<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12" />
			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				<div className="grid auto-rows-min gap-4 md:grid-cols-3">
					<Card>
						<CardHeader>
							<CardTitle>Members</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="font-bold text-4xl">{membersCount}</div>
							<CardDescription>Total members in organization</CardDescription>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Teams</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="font-bold text-4xl">{teamsCount}</div>
							<CardDescription>Total teams in organization</CardDescription>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Pending Invitations</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="font-bold text-4xl">
								{pendingInvitationsCount}
							</div>
							<CardDescription>Pending invitations</CardDescription>
						</CardContent>
					</Card>
				</div>
				<div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min" />
			</div>
		</>
	);
}
