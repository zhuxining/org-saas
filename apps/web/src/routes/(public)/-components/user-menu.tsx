import { Button } from "@org-sass/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@org-sass/ui/components/dropdown-menu";
import { Skeleton } from "@org-sass/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { getSession } from "@/functions/auth.fn";
import { authClient } from "@/lib/auth-client";

export function UserMenu() {
	const navigate = useNavigate();
	const { data: session, isPending } = useQuery({
		queryKey: ["session"],
		queryFn: () => getSession(),
	});

	if (isPending) {
		return <Skeleton className="h-9 w-24" />;
	}

	if (!session?.user) {
		return (
			<Link to="/login" search={{ redirect: undefined }}>
				<Button variant="outline">Sign In</Button>
			</Link>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" />}>
				{session.user.name}
			</DropdownMenuTrigger>
			<DropdownMenuContent className="bg-card">
				<DropdownMenuGroup>
					<DropdownMenuLabel>My Account</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem>{session.user.email}</DropdownMenuItem>
					<DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
						Dashboard
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						onClick={() => {
							authClient.signOut({
								fetchOptions: {
									onSuccess: () => {
										navigate({
											to: "/",
										});
									},
								},
							});
						}}
					>
						Sign Out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
