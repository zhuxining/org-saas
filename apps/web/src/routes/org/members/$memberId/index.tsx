import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Shield, Users, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/org/members/$memberId/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			orpc.organization.listMembers.queryOptions({ input: {} }),
		);
	},
	component: MemberDetailPage,
});

function MemberDetailPage() {
	const { memberId } = Route.useParams();
	const { data: membersData } = useSuspenseQuery(
		orpc.organization.listMembers.queryOptions({ input: {} }),
	);

	const member = membersData?.members.find((m) => m.id === memberId);

	if (!member) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<div className="text-center">
					<h2 className="font-bold text-xl">Member Not Found</h2>
					<p className="text-muted-foreground">
						The member you're looking for doesn't exist.
					</p>
					<Link
						to="/org/members"
						className={buttonVariants({
							variant: "outline",
							className: "mt-4",
						})}
					>
						Back to Members
					</Link>
				</div>
			</div>
		);
	}

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
		<div className="flex flex-1 flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl tracking-tight">Member Details</h1>
					<p className="text-muted-foreground">
						View member information and activity.
					</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Profile Information</CardTitle>
					<CardDescription>Basic member details</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center gap-4">
						<Avatar className="h-16 w-16">
							<AvatarImage src={member.user?.image} alt={member.user?.name} />
							<AvatarFallback className="font-bold text-2xl">
								{member.user?.name?.charAt(0).toUpperCase() || "?"}
							</AvatarFallback>
						</Avatar>
						<div>
							<h3 className="font-semibold text-lg">{member.user?.name}</h3>
							<p className="text-muted-foreground text-sm">
								{member.user?.email}
							</p>
						</div>
					</div>

					<Separator />

					<div className="grid gap-4 text-sm">
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Role</span>
							{getRoleBadge(member.role)}
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Member ID</span>
							<span className="font-mono text-xs">{member.id}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">User ID</span>
							<span className="font-mono text-xs">{member.userId}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-muted-foreground">Joined</span>
							<span>{new Date(member.createdAt).toLocaleDateString()}</span>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="flex justify-between">
				<Link
					to="/org/members"
					className={buttonVariants({ variant: "ghost" })}
				>
					<X className="mr-2 h-4 w-4" />
					Back to Members
				</Link>
			</div>
		</div>
	);
}
