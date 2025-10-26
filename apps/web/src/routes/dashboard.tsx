import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Card, Space, Typography } from "antd";
import { getUser } from "@/functions/get-user";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await getUser();
		return { session };
	},
	loader: async ({ context }) => {
		if (!context.session) {
			throw redirect({
				to: "/login",
			});
		}
	},
});

function RouteComponent() {
	const { session } = Route.useRouteContext();

	const privateData = useQuery(orpc.privateData.queryOptions());

	return (
		<Space direction="vertical" size="large" style={{ width: "100%" }}>
			<Typography.Title level={2} style={{ marginBottom: 0 }}>
				Dashboard
			</Typography.Title>
			<Card>
				<Space direction="vertical">
					<Typography.Text>
						Welcome back, <strong>{session?.user.name}</strong>
					</Typography.Text>
					<Typography.Paragraph>
						{privateData.isLoading
							? "Loading private data..."
							: privateData.data?.message}
					</Typography.Paragraph>
				</Space>
			</Card>
		</Space>
	);
}
