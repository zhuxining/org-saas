import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NavUser({
	user,
}: {
	user: { name: string; email: string; avatar?: string };
}) {
	const handleLogout = () => {
		window.location.href = "/api/auth/sign-out";
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-2 rounded-lg p-2 hover:bg-sidebar-accent"
				>
					<Avatar className="h-8 w-8 rounded-lg">
						<AvatarImage src={user.avatar || ""} alt={user.name} />
						<AvatarFallback className="rounded-lg">CN</AvatarFallback>
					</Avatar>
					<div className="grid flex-1 text-left text-sm leading-tight">
						<span className="truncate font-medium">{user.name}</span>
						<p className="truncate text-muted-foreground text-xs">
							{user.email}
						</p>
					</div>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				sideOffset={4}
				side="bottom"
				className="w-56 min-w-[200px]"
			>
				<div className="grid gap-2 px-2 py-2">
					<p className="font-medium text-sm">Account</p>
				</div>
				<div className="mt-4 space-y-1">
					<DropdownMenuItem onClick={handleLogout}>
						<LogOut size={4} /> Log out
					</DropdownMenuItem>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
