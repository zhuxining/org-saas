import { Button } from "@org-sass/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@org-sass/ui/components/dropdown-menu";
import { Separator } from "@org-sass/ui/components/separator";
import {
	createFileRoute,
	Link,
	Outlet,
	useNavigate,
} from "@tanstack/react-router";
import {
	ArrowLeft,
	LayoutDashboard,
	LogOut,
	Settings,
	Users,
	UsersRound,
} from "lucide-react";
import { OrgSwitcher } from "@/components/org-switcher";
import { UserAvatar } from "@/components/user-avatar";
import { resolveOrgBySlug } from "@/functions/auth.fn";
import { authClient } from "@/lib/auth-client";
import { OrgContext, type OrgContextValue } from "@/lib/org-context";
import { ForbiddenError } from "@/utils/errors";

export const Route = createFileRoute("/org/$orgSlug")({
	beforeLoad: async (ctx) => {
		const result = await resolveOrgBySlug({ data: ctx.params.orgSlug });

		if (!result) {
			throw new ForbiddenError("您不是此组织的成员或组织不存在");
		}

		return {
			user: result.user,
			org: result.org,
			role: result.role,
		};
	},
	component: OrgLayout,
});

function OrgLayout() {
	const { org, role } = Route.useRouteContext();
	const { user } = Route.useRouteContext();
	const navigate = useNavigate();
	const { orgSlug } = Route.useParams();

	const orgContext: OrgContextValue = {
		org: {
			id: org.id,
			name: org.name,
			slug: org.slug,
			logo: org.logo ?? null,
			metadata: org.metadata ?? null,
			createdAt: org.createdAt,
		},
		role,
	};

	const navItems = [
		{
			to: `/org/${orgSlug}`,
			label: "Dashboard",
			icon: LayoutDashboard,
			exact: true,
		},
		{ to: `/org/${orgSlug}/members`, label: "成员", icon: Users },
		{ to: `/org/${orgSlug}/teams`, label: "团队", icon: UsersRound },
		{ to: `/org/${orgSlug}/settings`, label: "设置", icon: Settings },
	];

	return (
		<OrgContext.Provider value={orgContext}>
			<div className="flex min-h-screen">
				<aside className="flex w-64 shrink-0 flex-col border-border border-r bg-card">
					<div className="flex h-14 items-center gap-2 border-border border-b px-4">
						<Link
							to="/dashboard"
							className="text-muted-foreground hover:text-foreground"
						>
							<ArrowLeft className="size-4" />
						</Link>
						<span className="truncate font-bold">{org.name}</span>
					</div>

					<div className="p-3">
						<OrgSwitcher activeOrgSlug={orgSlug} />
					</div>

					<Separator />

					<nav className="flex-1 space-y-1 p-3">
						{navItems.map(({ to, label, icon: Icon, exact }) => (
							<Link
								key={to}
								to={to}
								className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
								activeProps={{
									className: "bg-accent text-accent-foreground font-medium",
								}}
								activeOptions={{ exact }}
							>
								<Icon className="size-4" />
								{label}
							</Link>
						))}
					</nav>

					<Separator />

					<div className="p-3">
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										variant="ghost"
										className="w-full justify-start gap-2"
									/>
								}
							>
								<UserAvatar name={user.name} image={user.image} size="sm" />
								<span className="truncate text-sm">{user.name}</span>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="w-56 bg-card" align="start">
								<DropdownMenuLabel>{user.email}</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onClick={() => navigate({ to: "/dashboard" })}
								>
									<LayoutDashboard className="size-4" />
									个人中心
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant="destructive"
									onClick={() => {
										authClient.signOut({
											fetchOptions: {
												onSuccess: () => navigate({ to: "/" }),
											},
										});
									}}
								>
									<LogOut className="size-4" />
									退出登录
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</aside>

				<main className="flex-1 overflow-auto">
					<Outlet />
				</main>
			</div>
		</OrgContext.Provider>
	);
}
