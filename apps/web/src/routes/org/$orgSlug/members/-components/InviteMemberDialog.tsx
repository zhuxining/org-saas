import { Button } from "@org-sass/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@org-sass/ui/components/dialog";
import { Input } from "@org-sass/ui/components/input";
import { Label } from "@org-sass/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@org-sass/ui/components/select";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";
import { orgFullQueryOptions } from "@/lib/query-options";

interface InviteMemberDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orgId: string;
}

export function InviteMemberDialog({
	open,
	onOpenChange,
	orgId,
}: InviteMemberDialogProps) {
	const queryClient = useQueryClient();
	const form = useForm({
		defaultValues: {
			email: "",
			role: "member" as "member" | "admin",
		},
		onSubmit: async ({ value }) => {
			const result = await authClient.organization.inviteMember({
				email: value.email,
				role: value.role,
				organizationId: orgId,
			});

			if (result.error) {
				toast.error(result.error.message ?? "邀请失败");
				return;
			}

			toast.success(`已向 ${value.email} 发送邀请`);
			onOpenChange(false);
			form.reset();
			queryClient.invalidateQueries(orgFullQueryOptions(orgId));
		},
		validators: {
			onSubmit: z.object({
				email: z.email("请输入有效的邮箱地址"),
				role: z.enum(["member", "admin"]),
			}),
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>邀请成员</DialogTitle>
					<DialogDescription>通过邮箱地址邀请新成员加入组织</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.Field name="email">
						{(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>邮箱</Label>
								<Input
									id={field.name}
									type="email"
									placeholder="user@example.com"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
								{field.state.meta.errors.map((error) => (
									<p key={error?.message} className="text-destructive text-sm">
										{error?.message}
									</p>
								))}
							</div>
						)}
					</form.Field>

					<form.Field name="role">
						{(field) => (
							<div className="space-y-2">
								<Label>角色</Label>
								<Select
									value={field.state.value}
									onValueChange={(v) =>
										field.handleChange((v ?? "member") as "member" | "admin")
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="member">Member</SelectItem>
										<SelectItem value="admin">Admin</SelectItem>
									</SelectContent>
								</Select>
							</div>
						)}
					</form.Field>

					<div className="flex justify-end gap-3">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							取消
						</Button>
						<form.Subscribe>
							{(state) => (
								<Button
									type="submit"
									disabled={!state.canSubmit || state.isSubmitting}
								>
									{state.isSubmitting ? "发送中..." : "发送邀请"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
