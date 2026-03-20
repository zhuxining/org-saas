import { Badge } from "@org-sass/ui/components/badge";

const roleConfig: Record<
	string,
	{ label: string; variant: "default" | "secondary" | "outline" }
> = {
	owner: { label: "Owner", variant: "default" },
	admin: { label: "Admin", variant: "secondary" },
	member: { label: "Member", variant: "outline" },
};

export function RoleBadge({ role }: { role: string }) {
	const config = roleConfig[role] ?? {
		label: role,
		variant: "outline" as const,
	};
	return <Badge variant={config.variant}>{config.label}</Badge>;
}
