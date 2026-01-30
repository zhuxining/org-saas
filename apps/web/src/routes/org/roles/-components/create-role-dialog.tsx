import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orpc } from "@/utils/orpc";

interface CreateRoleDialogProps {
	children: React.ReactNode;
	onSuccess?: () => void;
}

export function CreateRoleDialog({
	children,
	onSuccess,
}: CreateRoleDialogProps) {
	const [open, setOpen] = useState(false);
	const [role, setRole] = useState("");
	const [permission, setPermission] = useState("");
	const [description, setDescription] = useState("");
	const [color, setColor] = useState("#6366f1");

	const createRole = useMutation(
		orpc.roles.createRole.mutationOptions({
			onSuccess: () => {
				toast.success("Role created successfully");
				setOpen(false);
				setRole("");
				setPermission("");
				setDescription("");
				setColor("#6366f1");
				onSuccess?.();
			},
			onError: (error) => {
				toast.error(error.message || "Failed to create role");
			},
		}),
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		// 验证 permission 是否为有效的 JSON
		try {
			JSON.parse(permission);
		} catch {
			toast.error("Permissions must be valid JSON format");
			return;
		}

		createRole.mutate({
			role,
			permissions: JSON.parse(permission),
			description,
			color,
		});
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Custom Role</DialogTitle>
					<DialogDescription>
						Define a new role with specific permissions for your organization.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="role">Role Name</Label>
						<Input
							id="role"
							value={role}
							onChange={(e) => setRole(e.target.value)}
							placeholder="e.g., project-manager"
							required
						/>
						<p className="text-muted-foreground text-xs">
							A unique identifier for this role (lowercase, hyphens allowed)
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="permission">Permissions (JSON)</Label>
						<Input
							id="permission"
							value={permission}
							onChange={(e) => setPermission(e.target.value)}
							placeholder='{"project": ["create", "update", "view"]}'
							required
						/>
						<p className="text-muted-foreground text-xs">
							Define permissions in JSON format
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Input
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Role description (optional)"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="color">Color</Label>
						<div className="flex items-center gap-2">
							<Input
								id="color"
								type="color"
								value={color}
								onChange={(e) => setColor(e.target.value)}
								className="h-10 w-20"
							/>
							<span className="text-muted-foreground text-xs">{color}</span>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={createRole.isPending}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={createRole.isPending}>
							{createRole.isPending ? "Creating..." : "Create Role"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
