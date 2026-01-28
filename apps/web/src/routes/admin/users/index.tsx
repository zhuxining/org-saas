import {
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Ban,
	Building,
	CheckCircle,
	MoreHorizontal,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import { useState } from "react";

import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { orpc } from "@/utils/orpc";
import { requireAdmin } from "@/utils/route-guards";

export const Route = createFileRoute("/admin/users/")({
	beforeLoad: requireAdmin,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			orpc.admin.listUsers.queryOptions({ input: {} }),
		);
	},
	component: AdminUsersPage,
});

// 组件：用户组织关系（懒加载）
function UserOrganizations({ userId }: { userId: string }) {
	const { data: userOrgs, isLoading } = useQuery({
		...orpc.admin.getUserOrganizations.queryOptions({
			input: { userId },
		}),
		enabled: !!userId,
		staleTime: 5 * 60 * 1000, // 5分钟缓存
	});

	if (isLoading) {
		return <span className="text-muted-foreground text-xs">Loading...</span>;
	}

	if (!userOrgs || userOrgs.length === 0) {
		return (
			<span className="text-muted-foreground text-xs">No organizations</span>
		);
	}

	return (
		<div className="flex flex-wrap gap-1">
			{userOrgs.map((org) => (
				<Badge key={org.organizationId} variant="outline" className="text-xs">
					<Building className="mr-1 h-3 w-3" />
					{org.organizationName}
					<span className="ml-1 text-muted-foreground">({org.role})</span>
				</Badge>
			))}
		</div>
	);
}

function AdminUsersPage() {
	const queryClient = useQueryClient();
	const { confirm, ConfirmDialogComponent } = useConfirmDialog();

	// 数据已在 loader 中预取，无加载状态
	const { data: users } = useSuspenseQuery(
		orpc.admin.listUsers.queryOptions({ input: {} }),
	);

	const [search, setSearch] = useState("");
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [newUser, setNewUser] = useState({
		name: "",
		email: "",
		password: "",
		role: "user",
	});

	const createUser = useMutation(
		orpc.admin.createUser.mutationOptions({
			onSuccess: () => {
				toast.success("User created successfully");
				setIsCreateOpen(false);
				setNewUser({ name: "", email: "", password: "", role: "user" });
				queryClient.invalidateQueries({
					queryKey: orpc.admin.listUsers.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to create user");
			},
		}),
	);

	const setRole = useMutation(
		orpc.admin.setRole.mutationOptions({
			onSuccess: () => {
				toast.success("User role updated successfully");
				queryClient.invalidateQueries({
					queryKey: orpc.admin.listUsers.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update user role");
			},
		}),
	);

	const banUser = useMutation(
		orpc.admin.banUser.mutationOptions({
			onSuccess: () => {
				toast.success("User banned successfully");
				queryClient.invalidateQueries({
					queryKey: orpc.admin.listUsers.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to ban user");
			},
		}),
	);

	const unbanUser = useMutation(
		orpc.admin.unbanUser.mutationOptions({
			onSuccess: () => {
				toast.success("User unbanned successfully");
				queryClient.invalidateQueries({
					queryKey: orpc.admin.listUsers.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to unban user");
			},
		}),
	);

	const removeUser = useMutation(
		orpc.admin.removeUser.mutationOptions({
			onSuccess: () => {
				toast.success("User deleted successfully");
				queryClient.invalidateQueries({
					queryKey: orpc.admin.listUsers.key(),
				});
			},
			onError: (error) => {
				toast.error(error.message || "Failed to delete user");
			},
		}),
	);

	const handleCreate = (e: React.FormEvent) => {
		e.preventDefault();
		createUser.mutate({
			name: newUser.name,
			email: newUser.email,
			password: newUser.password,
			role: newUser.role as "admin" | "user",
		});
	};

	const handleRoleChange = (userId: string, newRole: "admin" | "user") => {
		setRole.mutate({ userId, role: newRole });
	};

	const handleBanToggle = (userId: string, isBanned: boolean) => {
		if (isBanned) {
			unbanUser.mutate({ userId });
		} else {
			banUser.mutate({ userId });
		}
	};

	const handleDelete = async (userId: string) => {
		const confirmed = await confirm({
			title: "Delete User",
			description:
				"Are you sure you want to delete this user? This cannot be undone.",
			confirmLabel: "Delete",
			cancelLabel: "Cancel",
			variant: "destructive",
		});
		if (confirmed) {
			removeUser.mutate({ userId });
		}
	};

	const filteredUsers = users?.users.filter(
		(user) =>
			user.name?.toLowerCase().includes(search.toLowerCase()) ||
			user.email?.toLowerCase().includes(search.toLowerCase()),
	);

	return (
		<>
			{ConfirmDialogComponent}
			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="font-bold text-2xl tracking-tight">Users</h1>
						<p className="text-muted-foreground">
							Manage users, roles, and access.
						</p>
					</div>

					<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
						<DialogTrigger
							className={buttonVariants({
								className: "cursor-pointer",
							})}
						>
							<Plus className="mr-2 h-4 w-4" />
							Create User
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create User</DialogTitle>
								<DialogDescription>
									Add a new user to the system.
								</DialogDescription>
							</DialogHeader>
							<form onSubmit={handleCreate} className="space-y-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="name">Name</Label>
									<Input
										id="name"
										value={newUser.name}
										onChange={(e) =>
											setNewUser({ ...newUser, name: e.target.value })
										}
										placeholder="John Doe"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										type="email"
										value={newUser.email}
										onChange={(e) =>
											setNewUser({ ...newUser, email: e.target.value })
										}
										placeholder="john@example.com"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="password">Password</Label>
									<Input
										id="password"
										type="password"
										value={newUser.password}
										onChange={(e) =>
											setNewUser({ ...newUser, password: e.target.value })
										}
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="role">Role</Label>
									<Select
										value={newUser.role}
										onValueChange={(val) =>
											val && setNewUser({ ...newUser, role: val })
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select role" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="user">User</SelectItem>
											<SelectItem value="admin">Admin</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										onClick={() => setIsCreateOpen(false)}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={createUser.isPending}>
										{createUser.isPending ? "Creating..." : "Create"}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>

				<div className="flex items-center gap-2">
					<div className="relative max-w-sm flex-1">
						<Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							type="search"
							placeholder="Search users..."
							className="pl-8"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
				</div>

				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Organizations</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Created At</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredUsers?.length === 0 ? (
								<TableRow>
									<TableCell colSpan={7} className="h-24 text-center">
										No users found.
									</TableCell>
								</TableRow>
							) : (
								filteredUsers?.map((user) => (
									<TableRow key={user.id}>
										<TableCell>
											<div className="flex items-center gap-2">
												<Avatar className="h-8 w-8">
													<AvatarFallback>
														{user.name?.charAt(0).toUpperCase() || "?"}
													</AvatarFallback>
												</Avatar>
												<span className="font-medium">{user.name}</span>
											</div>
										</TableCell>
										<TableCell>{user.email}</TableCell>
										<TableCell>
											<Badge
												variant={
													user.role === "admin" ? "default" : "secondary"
												}
											>
												{user.role}
											</Badge>
										</TableCell>
										<TableCell>
											<UserOrganizations userId={user.id} />
										</TableCell>
										<TableCell>
											{user.banned ? (
												<Badge variant="destructive">Banned</Badge>
											) : (
												<Badge
													variant="outline"
													className="border-green-200 bg-green-50 text-green-700"
												>
													Active
												</Badge>
											)}
										</TableCell>
										<TableCell>
											{new Date(user.createdAt).toLocaleDateString()}
										</TableCell>
										<TableCell className="text-right">
											<DropdownMenu>
												<DropdownMenuTrigger
													className={buttonVariants({
														variant: "ghost",
														size: "icon",
													})}
												>
													<MoreHorizontal className="h-4 w-4" />
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuGroup>
														<DropdownMenuLabel>Actions</DropdownMenuLabel>
														<DropdownMenuSeparator />
														<DropdownMenuItem
															onClick={() =>
																handleRoleChange(
																	user.id,
																	user.role === "admin" ? "user" : "admin",
																)
															}
														>
															{user.role === "admin"
																? "Demote to User"
																: "Promote to Admin"}
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() =>
																handleBanToggle(user.id, !!user.banned)
															}
														>
															{user.banned ? (
																<>
																	<CheckCircle className="mr-2 h-4 w-4" /> Unban
																	User
																</>
															) : (
																<>
																	<Ban className="mr-2 h-4 w-4" /> Ban User
																</>
															)}
														</DropdownMenuItem>
														<DropdownMenuSeparator />
														<DropdownMenuItem
															variant="destructive"
															onClick={() => handleDelete(user.id)}
														>
															<Trash2 className="mr-2 h-4 w-4" /> Delete User
														</DropdownMenuItem>
													</DropdownMenuGroup>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>
			</div>
		</>
	);
}
