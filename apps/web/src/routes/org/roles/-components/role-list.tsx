import { Crown, Shield, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RoleListProps {
	roles: Array<{
		id: string;
		role: string;
		permissions: Record<string, string[]>;
		description?: string | null;
		color?: string | null;
		level?: number | null;
		isSystemRole?: boolean | null;
	}>;
}

const getSystemRoleIcon = (role: string) => {
	switch (role) {
		case "owner":
			return <Crown className="h-4 w-4" />;
		case "moderator":
			return <Shield className="h-4 w-4" />;
		case "member":
			return <Users className="h-4 w-4" />;
		default:
			return null;
	}
};

export function RoleList({ roles }: RoleListProps) {
	if (roles.length === 0) {
		return (
			<Card>
				<CardContent className="flex min-h-75 items-center justify-center">
					<div className="text-center">
						<p className="text-muted-foreground">No custom roles found.</p>
						<p className="text-muted-foreground text-sm">
							Create a custom role to get started.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	// 分离系统角色和自定义角色
	const systemRoles = roles.filter((r) => r.isSystemRole);
	const customRoles = roles.filter((r) => !r.isSystemRole);

	return (
		<div className="space-y-8">
			{/* 系统角色 */}
			{systemRoles.length > 0 && (
				<div className="space-y-4">
					<h2 className="font-semibold text-lg">System Roles</h2>
					<p className="text-muted-foreground text-sm">
						Built-in roles that cannot be modified or deleted.
					</p>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{systemRoles.map((role) => (
							<Card key={role.id}>
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle className="flex items-center gap-2">
											{getSystemRoleIcon(role.role)}
											<Badge
												variant="outline"
												style={{
													backgroundColor: role.color || undefined,
													color: role.color ? "#fff" : undefined,
												}}
											>
												{role.role}
											</Badge>
										</CardTitle>
										<Badge variant="secondary">System</Badge>
									</div>
								</CardHeader>
								<CardContent>
									{role.description && (
										<p className="text-muted-foreground text-sm">
											{role.description}
										</p>
									)}
									<div className="mt-3">
										<p className="mb-1 font-medium text-sm">Permissions:</p>
										<p className="text-muted-foreground text-xs">
											{Object.keys(role.permissions).join(", ")}
										</p>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}

			{/* 自定义角色 */}
			{customRoles.length > 0 && (
				<div className="space-y-4">
					<h2 className="font-semibold text-lg">Custom Roles</h2>
					<p className="text-muted-foreground text-sm">
						Roles created specifically for your organization.
					</p>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{customRoles.map((role) => (
							<Card key={role.id}>
								<CardHeader>
									<div className="flex items-center justify-between">
										<CardTitle>
											<Badge
												variant="outline"
												style={{
													backgroundColor: role.color || undefined,
													color: role.color ? "#fff" : undefined,
												}}
											>
												{role.role}
											</Badge>
										</CardTitle>
										<div className="flex gap-1">
											<Badge variant="outline">Level {role.level || 0}</Badge>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									{role.description && (
										<p className="text-muted-foreground text-sm">
											{role.description}
										</p>
									)}
									<div className="mt-3">
										<p className="mb-1 font-medium text-sm">Permissions:</p>
										<p className="text-muted-foreground text-xs">
											{Object.keys(role.permissions).join(", ")}
										</p>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
