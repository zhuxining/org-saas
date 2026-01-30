import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireActiveOrganization } from "@/utils/guards";
import { AppSidebar } from "./-components/app-sidebar";

export const Route = createFileRoute("/org")({
	beforeLoad: async ({ context, location }) => {
		// 要求有活跃组织（普通用户必须是组织成员才能访问）
		await requireActiveOrganization({ context, location });
	},
	component: OrgLayout,
});

function OrgLayout() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	);
}
