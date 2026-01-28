import { Link, useLocation } from "@tanstack/react-router";
import { Building2, Users } from "lucide-react";
import type * as React from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";

interface NavItem {
	title: string;
	url: string;
	icon?: React.ComponentType<{ className?: string }>;
	isActive?: boolean;
	items?: {
		title: string;
		url: string;
	}[];
}

// Inline NavMain component
function NavMain({
	items,
	groupLabel = "Platform",
}: {
	items: NavItem[];
	groupLabel?: string;
}) {
	const location = useLocation();

	const isActive = (url: string) => {
		return location.pathname.startsWith(url);
	};

	return (
		<SidebarGroup>
			<SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => {
					const hasSubItems = item.items && item.items.length > 0;

					return (
						<Collapsible
							key={item.title}
							defaultOpen={item.isActive || isActive(item.url)}
							className="group/collapsible"
						>
							<SidebarMenuItem>
								{hasSubItems ? (
									<>
										<CollapsibleTrigger
											render={
												<SidebarMenuButton tooltip={item.title}>
													{item.icon && <item.icon />}
													<span>{item.title}</span>
													<span className="ml-auto">{"->"}</span>
												</SidebarMenuButton>
											}
										/>
										<CollapsibleContent>
											<SidebarMenuSub>
												{item.items?.map((subItem) => (
													<SidebarMenuSubItem key={subItem.title}>
														<SidebarMenuSubButton
															render={<Link to={subItem.url} />}
														>
															<span>{subItem.title}</span>
														</SidebarMenuSubButton>
													</SidebarMenuSubItem>
												))}
											</SidebarMenuSub>
										</CollapsibleContent>
									</>
								) : (
									<Link to={item.url}>
										<SidebarMenuButton tooltip={item.title}>
											{item.icon && <item.icon />}
											<span>{item.title}</span>
										</SidebarMenuButton>
									</Link>
								)}
							</SidebarMenuItem>
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}

// Admin navigation - Settings removed as page doesn't exist yet
const data = {
	navMain: [
		{
			title: "Organizations",
			url: "/admin/organizations",
			icon: Building2,
			isActive: true,
			items: [],
		},
		{
			title: "Users",
			url: "/admin/users",
			icon: Users,
			items: [],
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader />
			<SidebarContent>
				<NavMain items={data.navMain} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={{ name: "", email: "" }} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
