import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { orpc } from "@/utils/orpc";
import { CreateRoleDialog } from "./-components/create-role-dialog";
import { RoleList } from "./-components/role-list";

export const Route = createFileRoute("/org/roles/")({
	beforeLoad: async ({ context }) => {
		// 仅 Owner 可以访问角色管理
		const { requireOwner } = await import("@/utils/permission-guards");
		await requireOwner({ context });
	},
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			orpc.roles.listRoles.queryOptions({ input: {} }),
		);
	},
	component: RolesListPage,
});

function RolesListPage() {
	const queryClient = useQueryClient();

	const { data: roles } = useSuspenseQuery(
		orpc.roles.listRoles.queryOptions({ input: {} }),
	);

	// 转换 API 返回的数据格式 (permission -> permissions)
	const formattedRoles =
		roles?.map((role) => ({
			...role,
			permissions: role.permission,
		})) || [];

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl tracking-tight">Roles</h1>
					<p className="text-muted-foreground">
						Manage custom roles and permissions for your organization.
					</p>
				</div>
				<CreateRoleDialog
					onSuccess={() => {
						queryClient.invalidateQueries({
							queryKey: orpc.roles.listRoles.key(),
						});
					}}
				>
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						Create Role
					</Button>
				</CreateRoleDialog>
			</div>

			<RoleList roles={formattedRoles} />
		</div>
	);
}
