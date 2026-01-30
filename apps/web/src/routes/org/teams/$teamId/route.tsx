import {
	createFileRoute,
	Link,
	Outlet,
	useMatches,
} from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";

export const Route = createFileRoute("/org/teams/$teamId")({
	beforeLoad: async ({ context }) => {
		const { requirePermission } = await import("@/utils/permission-guards");
		await requirePermission({ context }, "team", ["view"]);
	},
	component: TeamDetailLayout,
});

function TeamDetailLayout() {
	const { teamId } = Route.useParams();
	const matches = useMatches();

	// 检查当前是否在 members 子路由
	const isMembersRoute = matches.some(
		(m) =>
			m.routeId === "/org/teams/$teamId/members" ||
			m.pathname?.includes("/members"),
	);

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<div className="flex items-center justify-between">
				<h1 className="font-bold text-2xl tracking-tight">Team Details</h1>
			</div>

			<div className="flex gap-2 border-b">
				<Link
					to="/org/teams/$teamId"
					params={{ teamId }}
					className={buttonVariants({
						variant: !isMembersRoute ? "default" : "ghost",
						className: "rounded-none border-b-2 px-4",
					})}
				>
					Overview
				</Link>
				<Link
					to="/org/teams/$teamId/members"
					params={{ teamId }}
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
