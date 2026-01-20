import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { orpc } from "@/utils/orpc";

export function OrgSwitcher() {
	const { isMobile } = useSidebar();
	const queryClient = useQueryClient();

	const { data: orgs, isLoading: orgsLoading } = useQuery(
		orpc.organization.listOrganizations.queryOptions(),
	);

	const { data: session } = useQuery(orpc.privateData.queryOptions());

	const setActiveOrgMutation = useMutation({
		mutationFn: orpc.organization.setActiveOrganization.mutate,
		onSuccess: () => {
			toast.success("Organization switched");
			queryClient.invalidateQueries({
				queryKey: orpc.privateData.queryOptions().queryKey,
			});
		},
		onError: (error) => {
			toast.error(`Failed to switch organization: ${error.message}`);
		},
	});

	const isLoading = orgsLoading || setActiveOrgMutation.isPending;

	if (!orgs || orgs.length === 0) {
		return null;
	}

	const activeOrgId = session?.user?.activeOrganizationId;
	const activeOrg = orgs?.find((org) => org.id === activeOrgId);

	const handleSwitchOrg = (orgId: string) => {
		setActiveOrgMutation.mutate({ organizationId: orgId });
	};

	const handleAddOrg = () => {
		console.log("Add org button clicked - implement org creation flow");
	};

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							{activeOrg?.logo ? (
								<activeOrg.logo className="size-4" />
							) : (
								<div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
									<span className="font-bold text-sm">O</span>
								</div>
							)}
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">
									{isLoading
										? "Loading..."
										: activeOrg?.name || "No org selected"}
								</span>
								<span className="truncate text-muted-foreground text-xs">
									{activeOrg?.slug || "No org"}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-muted-foreground text-xs">
							Organizations
						</DropdownMenuLabel>
						{orgs.map((org) => {
							const isActive = org.id === activeOrgId;
							return (
								<DropdownMenuItem
									key={org.id}
									onClick={() => handleSwitchOrg(org.id)}
									className="gap-2 p-2"
								>
									<div className="flex size-6 items-center justify-center rounded-md border">
										{org.logo ? (
											<org.logo className="size-3.5" />
										) : (
											<div className="flex size-4 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground text-xs">
												<span className="font-bold">O</span>
											</div>
										)}
									</div>
									<span className="grid flex-1 text-sm">
										<span className="font-medium">{org.name}</span>
										<span className="text-muted-foreground text-xs">
											{org.slug || "org"}
										</span>
									</span>
									{isActive && (
										<div className="text-muted-foreground text-xs">✓</div>
									)}
								</DropdownMenuItem>
							);
						})}
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleAddOrg} className="gap-2 p-2">
							<div className="flex size-6 items-center justify-center rounded-md border">
								<Plus className="size-3.5" />
							</div>
							<div className="font-medium text-sm">Add org</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
