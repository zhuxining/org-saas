import { Button } from "@org-sass/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@org-sass/ui/components/dropdown-menu";
import { Skeleton } from "@org-sass/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Building2, ChevronsUpDown, Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { UserAvatar } from "./user-avatar";

export function OrgSwitcher({ activeOrgSlug }: { activeOrgSlug?: string }) {
	const navigate = useNavigate();
	const { data, isPending } = useQuery({
		queryKey: ["organizations"],
		queryFn: () => authClient.organization.list(),
	});

	const orgs = data?.data ?? [];
	const activeOrg = orgs.find(
		(o: { slug: string }) => o.slug === activeOrgSlug,
	);

	if (isPending) {
		return <Skeleton className="h-10 w-full" />;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={<Button variant="outline" className="w-full justify-between" />}
			>
				<div className="flex items-center gap-2 truncate text-sm">
					{activeOrg ? (
						<>
							<UserAvatar
								name={activeOrg.name}
								image={activeOrg.logo}
								size="sm"
							/>
							<span className="truncate font-semibold">{activeOrg.name}</span>
						</>
					) : (
						<>
							<Building2 className="size-4" />
							<span className="text-muted-foreground">选择组织</span>
						</>
					)}
				</div>
				<ChevronsUpDown className="ml-auto size-4 shrink-0" />
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56 bg-card" align="start">
				<DropdownMenuLabel>组织</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{orgs.map(
					(org: {
						id: string;
						name: string;
						slug: string;
						logo?: string | null;
					}) => (
						<DropdownMenuItem
							key={org.id}
							onClick={() =>
								navigate({
									to: `/org/${org.slug}`,
								})
							}
						>
							<UserAvatar name={org.name} image={org.logo} size="sm" />
							<span className="truncate">{org.name}</span>
						</DropdownMenuItem>
					),
				)}
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={() => navigate({ to: "/dashboard/orgs/new" as string })}
				>
					<Plus className="size-4" />
					<span>创建新组织</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
