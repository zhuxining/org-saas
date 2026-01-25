import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Ban,
	CheckCircle,
	MoreHorizontal,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
				setIsCreateOpen(false);
				setNewUser({ name: "", email: "", password: "", role: "user" });
				queryClient.invalidateQueries({
					queryKey: orpc.admin.listUsers.key(),
				});
			},
		}),
	);

	const setRole = useMutation(
		orpc.admin.setRole.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.admin.listUsers.key(),
				});
			},
		}),
	);

	const banUser = useMutation(
		orpc.admin.banUser.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.admin.listUsers.key(),
				});
			},
		}),
	);

	const unbanUser = useMutation(
		orpc.admin.unbanUser.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.admin.listUsers.key(),
				});
			},
		}),
	);

	const removeUser = useMutation(
		orpc.admin.removeUser.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.admin.listUsers.key(),
				});
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
			<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
				<div className="flex items-center gap-2 px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-[orientation=vertical]:h-4"
					/>
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem className="hidden md:block">
								<BreadcrumbLink href="/admin/dashboard">Admin</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator className="hidden md:block" />
							<BreadcrumbItem>
								<BreadcrumbPage>Users</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</div>
			</header>

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
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Created At</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredUsers?.length === 0 ? (
								<TableRow>
									<TableCell colSpan={6} className="h-24 text-center">
										No users found.
									</TableCell>
								</TableRow>
							) : (
								filteredUsers?.map((user) => (
									<TableRow key={user.id}>
										<TableCell className="font-medium">{user.name}</TableCell>
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
														className="text-destructive focus:text-destructive"
														onClick={() => handleDelete(user.id)}
													>
														<Trash2 className="mr-2 h-4 w-4" /> Delete User
													</DropdownMenuItem>
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
