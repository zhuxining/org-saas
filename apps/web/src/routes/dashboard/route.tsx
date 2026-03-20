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
import { Home, LogOut, Settings, User } from "lucide-react";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { UserAvatar } from "@/components/UserAvatar";
import { authClient } from "@/lib/auth-client";
import { requireSession } from "@/utils/guards";

export const Route = createFileRoute("/dashboard")({
	beforeLoad: (ctx) => requireSession(ctx),
	component: DashboardLayout,
});

function DashboardLayout() {
	const { user } = Route.useRouteContext();
	const navigate = useNavigate();

	const navItems = [
		{ to: "/dashboard", label: "Dashboard", icon: Home },
		{ to: "/dashboard/profile", label: "个人设置", icon: User },
	] as const;

	return (
		<div className="flex min-h-screen">
			<aside className="flex w-64 shrink-0 flex-col border-border border-r bg-card">
				<div className="flex h-14 items-center border-border border-b px-4">
					<Link to="/" className="font-bold text-lg">
						ORG SAAS
					</Link>
				</div>

				<div className="p-3">
					<OrgSwitcher />
				</div>

				<Separator />

				<nav className="flex-1 space-y-1 p-3">
					{navItems.map(({ to, label, icon: Icon }) => (
						<Link
							key={to}
							to={to}
							className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
							activeProps={{
								className: "bg-accent text-accent-foreground font-medium",
							}}
							activeOptions={{ exact: true }}
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
								onClick={() => navigate({ to: "/dashboard/profile" })}
							>
								<Settings className="size-4" />
								设置
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
	);
}
