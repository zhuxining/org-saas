import { LogOut } from "lucide-react";
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";

interface NavUserProps {
	user: {
		name: string;
		email: string;
		avatar?: string;
	};
}

export function AdminNavUser(_props: NavUserProps) {
	const handleLogout = () => {
		window.location.href = "/api/auth/sign-out";
	};

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<button
					type="button"
					onClick={handleLogout}
					className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-sidebar-accent"
				>
					<LogOut className="h-4 w-4" />
					Log out
				</button>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
