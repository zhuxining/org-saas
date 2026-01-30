import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Crown, Shield, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/admin/organizations/$orgId/members")({
	loader: async ({ context, params }) => {
		// Admin 专用 API，无需是组织成员
		await context.queryClient.ensureQueryData(
			orpc.admin.getFullOrganizationById.queryOptions({
				input: { organizationId: params.orgId },
			}),
		);
	},
	component: AdminOrgMembersPage,
});

function AdminOrgMembersPage() {
	const { orgId } = Route.useParams();

	const { data: org } = useSuspenseQuery(
		orpc.admin.getFullOrganizationById.queryOptions({
			input: { organizationId: orgId },
		}),
	);

	if (!org) {
		return null;
	}

	const members = org.members || [];

	const getRoleBadge = (role: string) => {
		switch (role) {
			case "owner":
				return (
					<Badge variant="default" className="gap-1">
						<Crown className="h-3 w-3" />
						Owner
					</Badge>
				);
			case "moderator":
				return (
					<Badge variant="secondary" className="gap-1">
						<Shield className="h-3 w-3" />
						Moderator
					</Badge>
				);
			default:
				return (
					<Badge variant="outline" className="gap-1">
						<Users className="h-3 w-3" />
						Member
					</Badge>
				);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Organization Members</CardTitle>
				<CardDescription>
					View all members of this organization. (Read-only view for admin)
				</CardDescription>
			</CardHeader>
			<CardContent>
				{members.length === 0 ? (
					<div className="py-8 text-center text-muted-foreground text-sm">
						No members in this organization
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>Role</TableHead>
								<TableHead className="text-right">Joined</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{members.map((member) => (
								<TableRow key={member.id}>
									<TableCell>
										<div className="flex items-center gap-2">
											<Avatar className="h-6 w-6">
												<AvatarImage src={member.user?.image || ""} />
												<AvatarFallback>
													{member.user?.name?.charAt(0).toUpperCase() || "?"}
												</AvatarFallback>
											</Avatar>
											<div>
												<div className="font-medium text-sm">
													{member.user?.name}
												</div>
												<div className="text-muted-foreground text-xs">
													{member.user?.email}
												</div>
											</div>
										</div>
									</TableCell>
									<TableCell>{getRoleBadge(member.role)}</TableCell>
									<TableCell className="text-right text-muted-foreground text-xs">
										{new Date(member.createdAt).toLocaleDateString()}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
}
