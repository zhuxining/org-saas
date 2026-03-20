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
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/orgs/new")({
	component: NewOrgPage,
});

function NewOrgPage() {
	const navigate = useNavigate();

	const form = useForm({
		defaultValues: {
			name: "",
			slug: "",
		},
		onSubmit: async ({ value }) => {
			const result = await authClient.organization.create({
				name: value.name,
				slug: value.slug,
			});

			if (result.error) {
				toast.error(result.error.message ?? "创建失败");
				return;
			}

			toast.success("组织创建成功");
			navigate({ to: `/org/${value.slug}` as string });
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "组织名称至少 2 个字符"),
				slug: z
					.string()
					.min(2, "Slug 至少 2 个字符")
					.regex(/^[a-z0-9-]+$/, "Slug 只能包含小写字母、数字和连字符"),
			}),
		},
	});

	return (
		<div className="mx-auto max-w-lg p-6">
			<h1 className="mb-6 font-bold text-2xl">创建新组织</h1>

			<Card>
				<CardHeader>
					<CardTitle>组织信息</CardTitle>
					<CardDescription>创建一个新的组织来管理你的团队</CardDescription>
				</CardHeader>
				<CardContent>
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
									<Label htmlFor={field.name}>组织名称</Label>
									<Input
										id={field.name}
										value={field.state.value}
										placeholder="我的组织"
										onBlur={field.handleBlur}
										onChange={(e) => {
											field.handleChange(e.target.value);
											const slug = e.target.value
												.toLowerCase()
												.replace(/[^a-z0-9]+/g, "-")
												.replace(/^-|-$/g, "");
											form.setFieldValue("slug", slug);
										}}
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

						<form.Field name="slug">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Slug</Label>
									<Input
										id={field.name}
										value={field.state.value}
										placeholder="my-org"
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
									/>
									<p className="text-muted-foreground text-xs">
										用于 URL: /org/{field.state.value || "slug"}
									</p>
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

						<div className="flex gap-3 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate({ to: "/dashboard" })}
							>
								取消
							</Button>
							<form.Subscribe>
								{(state) => (
									<Button
										type="submit"
										disabled={!state.canSubmit || state.isSubmitting}
									>
										{state.isSubmitting ? "创建中..." : "创建组织"}
									</Button>
								)}
							</form.Subscribe>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
