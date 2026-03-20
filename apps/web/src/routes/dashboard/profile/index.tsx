import { Button } from "@org-sass/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@org-sass/ui/components/card";
import { Input } from "@org-sass/ui/components/input";
import { Label } from "@org-sass/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { UserAvatar } from "@/components/UserAvatar";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/profile/")({
	component: ProfilePage,
});

function ProfilePage() {
	const { user } = Route.useRouteContext();

	const form = useForm({
		defaultValues: {
			name: user.name,
			image: user.image ?? "",
		},
		onSubmit: async ({ value }) => {
			try {
				await orpc.user.updateProfile.call({
					name: value.name || undefined,
					image: value.image || undefined,
				});
				toast.success("个人信息已更新");
			} catch {
				toast.error("更新失败");
			}
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "名称至少 2 个字符"),
				image: z.string().url("请输入有效的 URL").or(z.literal("")),
			}),
		},
	});

	return (
		<div className="mx-auto max-w-2xl p-6">
			<h1 className="mb-6 font-bold text-2xl">个人设置</h1>

			<Card>
				<CardHeader>
					<CardTitle>个人信息</CardTitle>
					<CardDescription>更新你的个人资料</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="mb-6 flex items-center gap-4">
						<UserAvatar name={user.name} image={user.image} size="lg" />
						<div>
							<p className="font-medium">{user.name}</p>
							<p className="text-muted-foreground text-sm">{user.email}</p>
						</div>
					</div>

					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="space-y-4"
					>
						<form.Field name="name">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>名称</Label>
									<Input
										id={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									{field.state.meta.errors.map((error) => (
										<p
											key={error?.message}
											className="text-destructive text-sm"
										>
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<form.Field name="image">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>头像 URL</Label>
									<Input
										id={field.name}
										value={field.state.value}
										placeholder="https://example.com/avatar.png"
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									{field.state.meta.errors.map((error) => (
										<p
											key={error?.message}
											className="text-destructive text-sm"
										>
											{error?.message}
										</p>
									))}
								</div>
							)}
						</form.Field>

						<form.Subscribe>
							{(state) => (
								<Button
									type="submit"
									disabled={!state.canSubmit || state.isSubmitting}
								>
									{state.isSubmitting ? "保存中..." : "保存"}
								</Button>
							)}
						</form.Subscribe>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
