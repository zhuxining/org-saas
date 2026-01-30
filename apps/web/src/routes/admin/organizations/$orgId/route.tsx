import {
	createFileRoute,
	Link,
	Outlet,
	useMatches,
} from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";

export const Route = createFileRoute("/admin/organizations/$orgId")({
	// 继承父路由 /admin 的 requireAdmin guard
	component: AdminOrgDetailLayout,
});

function AdminOrgDetailLayout() {
	const { orgId } = Route.useParams();
	const matches = useMatches();

	// 检查当前是否在 members 子路由
	const isMembersRoute = matches.some(
		(m) =>
			m.routeId === "/admin/organizations/$orgId/members" ||
			m.pathname?.includes("/members"),
	);

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<div className="flex items-center justify-between">
				<h1 className="font-bold text-2xl tracking-tight">
					Organization Details
				</h1>
			</div>

			<div className="flex gap-2 border-b">
				<Link
					to="/admin/organizations/$orgId"
					params={{ orgId }}
					className={buttonVariants({
						variant: !isMembersRoute ? "default" : "ghost",
						className: "rounded-none border-b-2 px-4",
					})}
				>
					Overview
				</Link>
				<Link
					to="/admin/organizations/$orgId/members"
					params={{ orgId }}
					className={buttonVariants({
						variant: isMembersRoute ? "default" : "ghost",
						className: "rounded-none border-b-2 px-4",
					})}
				>
					Members
				</Link>
			</div>

			<Outlet />
		</div>
	);
}
