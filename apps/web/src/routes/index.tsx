import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Card, Space, Tag, Typography } from "antd";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

function HomeComponent() {
	const healthCheck = useQuery(orpc.test.testHealthCheck.queryOptions());

	return (
		<div style={{ maxWidth: 720, margin: "0 auto" }}>
			<Space orientation="vertical" size="large" style={{ width: "100%" }}>
				<Card>
					<Typography.Paragraph>
						<pre style={{ margin: 0, overflow: "auto" }}>{TITLE_TEXT}</pre>
					</Typography.Paragraph>
				</Card>
				<Card title="API Status">
					<Space size="middle">
						<Tag
							color={
								healthCheck.isLoading
									? "processing"
									: healthCheck.data
										? "success"
										: "error"
							}
						>
							{healthCheck.isLoading
								? "Checking..."
								: healthCheck.data
									? "Connected"
									: "Disconnected"}
						</Tag>
						<Typography.Text type="secondary">
							Service health monitored via oRPC endpoint.
						</Typography.Text>
					</Space>
				</Card>
			</Space>
		</div>
	);
}
