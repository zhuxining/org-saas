import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireSystemAdmin } from "@/utils/guards";
import { AppSidebar } from "./-components/app-sidebar";

export const Route = createFileRoute("/admin")({
	beforeLoad: async ({ context, location }) => {
		// 使用新的守卫，非管理员会显示 403 页面
		await requireSystemAdmin({ context, location });
	},
	component: AdminLayout,
});

function AdminLayout() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	);
}
