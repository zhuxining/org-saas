import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/admin/_layout/users")({
	component: RouteComponent,
});

function RouteComponent() {
	const queryClient = useQueryClient();

	const users = useQuery(
		orpc.admin.user.listUsers.queryOptions({
			limit: 50,
			offset: 0,
		}),
	);

	const banUser = useMutation({
		mutationFn: async (userId: string) => {
			return orpc.admin.user.banUser({
				userId,
				reason: "Banned by admin",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries(orpc.admin.user.listUsers.queryKey());
			toast.success("User banned successfully");
		},
		onError: () => {
			toast.error("Failed to ban user");
		},
	});

	const unbanUser = useMutation({
		mutationFn: async (userId: string) => {
			return orpc.admin.user.unbanUser({ userId });
		},
		onSuccess: () => {
			queryClient.invalidateQueries(orpc.admin.user.listUsers.queryKey());
			toast.success("User unbanned successfully");
		},
		onError: () => {
			toast.error("Failed to unban user");
		},
	});

	const setRole = useMutation({
		mutationFn: async ({
			userId,
			role,
		}: {
			userId: string;
			role: "user" | "admin";
		}) => {
			return orpc.admin.user.setRole({ userId, role });
		},
		onSuccess: () => {
			queryClient.invalidateQueries(orpc.admin.user.listUsers.queryKey());
			toast.success("User role updated successfully");
		},
		onError: () => {
			toast.error("Failed to update user role");
		},
	});

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="font-bold text-2xl">Users</h2>
			</div>

			{users.isLoading ? (
				<div>Loading users...</div>
			) : users.error ? (
				<div className="text-destructive">Error: {users.error.message}</div>
			) : (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{users.data?.map((user) => (
								<TableRow key={user.id}>
									<TableCell className="font-medium">{user.name}</TableCell>
									<TableCell>{user.email}</TableCell>
									<TableCell>
										<span
											className={`inline-flex rounded-full px-2 py-1 text-xs ${
												user.role === "admin"
													? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
													: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
											}`}
										>
											{user.role || "user"}
										</span>
									</TableCell>
									<TableCell>
										{user.banned ? (
											<span className="text-destructive text-sm">Banned</span>
										) : (
											<span className="text-muted-foreground text-sm">
												Active
											</span>
										)}
									</TableCell>
									<TableCell>
										<div className="flex gap-2">
											{user.banned ? (
												<Button
													size="sm"
													variant="outline"
													onClick={() => unbanUser.mutate(user.id)}
													disabled={unbanUser.isPending}
												>
													Unban
												</Button>
											) : (
												<Button
													size="sm"
													variant="destructive"
													onClick={() => banUser.mutate(user.id)}
													disabled={banUser.isPending}
												>
													Ban
												</Button>
											)}
											{user.role !== "admin" && (
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														setRole.mutate({ userId: user.id, role: "admin" })
													}
													disabled={setRole.isPending}
												>
													Make Admin
												</Button>
											)}
											{user.role === "admin" && (
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														setRole.mutate({ userId: user.id, role: "user" })
													}
													disabled={setRole.isPending}
												>
													Remove Admin
												</Button>
											)}
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
