import { Button } from "@org-sass/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@org-sass/ui/components/card";
import { Skeleton } from "@org-sass/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Plus } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/")({
	component: DashboardIndex,
});

function DashboardIndex() {
	const navigate = useNavigate();
	const { data, isPending } = useQuery({
		queryKey: ["organizations"],
		queryFn: () => authClient.organization.list(),
	});

	const orgs = data?.data ?? [];

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl">Dashboard</h1>
					<p className="text-muted-foreground text-sm">
						管理你的组织和个人设置
					</p>
				</div>
				<Button onClick={() => navigate({ to: "/dashboard/orgs/new" })}>
					<Plus className="size-4" />
					创建组织
				</Button>
			</div>

			<h2 className="mb-4 font-semibold text-lg">我的组织</h2>

			{isPending ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
			) : orgs.length === 0 ? (
				<Card className="flex flex-col items-center justify-center py-12">
					<Building2 className="mb-4 size-12 text-muted-foreground" />
					<CardHeader className="items-center p-0">
						<CardTitle className="text-lg">还没有加入任何组织</CardTitle>
						<CardDescription>创建一个新组织或等待邀请加入</CardDescription>
					</CardHeader>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{orgs.map(
						(org: {
							id: string;
							name: string;
							slug: string;
							logo?: string | null;
							createdAt: Date;
						}) => (
							<Card
								key={org.id}
								className="cursor-pointer transition-colors hover:bg-accent/50"
								onClick={() => navigate({ to: `/org/${org.slug}` as string })}
							>
								<CardHeader className="flex-row items-center gap-3">
									<UserAvatar name={org.name} image={org.logo} size="lg" />
									<div className="min-w-0 flex-1">
										<CardTitle className="truncate text-base">
											{org.name}
										</CardTitle>
										<CardDescription className="text-xs">
											/{org.slug}
										</CardDescription>
									</div>
								</CardHeader>
							</Card>
						),
					)}
				</div>
			)}
		</div>
	);
}
