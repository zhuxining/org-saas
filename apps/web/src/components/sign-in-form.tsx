import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { App as AntdApp, Button, Card, Form, Input, Typography } from "antd";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import Loader from "./loader";

export default function SignInForm({
	onSwitchToSignUp,
}: {
	onSwitchToSignUp: () => void;
}) {
	const navigate = useNavigate({
		from: "/",
	});
	const { isPending } = authClient.useSession();
	const { message } = AntdApp.useApp();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: () => {
						navigate({
							to: "/dashboard",
						});
						message.success("Signed in successfully");
					},
					onError: (error) => {
						message.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("Invalid email address"),
				password: z.string().min(8, "Password must be at least 8 characters"),
			}),
		},
	});

	if (isPending) {
		return <Loader />;
	}

	return (
		<Card
			style={{ maxWidth: 420, margin: "48px auto" }}
			title={
				<Typography.Title level={3} style={{ margin: 0, textAlign: "center" }}>
					Welcome Back
				</Typography.Title>
			}
		>
			<Form layout="vertical" component={false}>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<form.Field name="email">
						{(field) => (
							<Form.Item
								label="Email"
								validateStatus={
									field.state.meta.errors.length ? "error" : undefined
								}
								help={field.state.meta.errors[0]?.message}
								required
							>
								<Input
									id={field.name}
									name={field.name}
									type="email"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									autoComplete="email"
								/>
							</Form.Item>
						)}
					</form.Field>

					<form.Field name="password">
						{(field) => (
							<Form.Item
								label="Password"
								validateStatus={
									field.state.meta.errors.length ? "error" : undefined
								}
								help={field.state.meta.errors[0]?.message}
								required
							>
								<Input.Password
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									autoComplete="current-password"
								/>
							</Form.Item>
						)}
					</form.Field>

					<form.Subscribe>
						{(state) => (
							<Button
								type="primary"
								htmlType="submit"
								block
								loading={state.isSubmitting}
								disabled={!state.canSubmit}
							>
								Sign In
							</Button>
						)}
					</form.Subscribe>
				</form>
			</Form>

			<Typography.Paragraph style={{ marginTop: 16, textAlign: "center" }}>
				<Button type="link" onClick={onSwitchToSignUp}>
					Need an account? Sign Up
				</Button>
			</Typography.Paragraph>
		</Card>
	);
}
