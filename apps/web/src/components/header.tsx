import {
	BellOutlined,
	MenuFoldOutlined,
	MenuUnfoldOutlined,
	QuestionCircleOutlined,
	SearchOutlined,
} from "@ant-design/icons";
import type { BreadcrumbProps } from "antd";
import { Breadcrumb, Button, Input, Layout, Space, Tooltip } from "antd";
import UserMenu from "./user-menu";

export interface GlobalHeaderProps {
	collapsed: boolean;
	onToggle: () => void;
	breadcrumbItems?: BreadcrumbProps["items"];
}

export default function Header({
	collapsed,
	onToggle,
	breadcrumbItems,
}: GlobalHeaderProps) {
	return (
		<Layout.Header
			style={{
				display: "flex",
				alignItems: "center",
				paddingInline: 24,
				background: "rgba(15, 23, 42, 0.6)",
				backdropFilter: "blur(12px)",
				borderBottom: "1px solid rgba(148, 163, 184, 0.2)",
				height: 64,
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					width: "100%",
					gap: 16,
				}}
			>
				<Space size={16} align="center">
					<Button
						type="text"
						aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
						icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
						onClick={onToggle}
						style={{
							color: "inherit",
							paddingInline: 0,
							fontSize: 18,
						}}
					/>
					<Breadcrumb
						items={
							breadcrumbItems ?? [
								{
									title: "Overview",
								},
							]
						}
					/>
				</Space>
				<Space size={16} align="center">
					<Input
						placeholder="Search within dashboard"
						prefix={<SearchOutlined />}
						allowClear
						style={{
							width: collapsed ? 200 : 260,
							background: "rgba(15, 23, 42, 0.4)",
							border: "1px solid rgba(148, 163, 184, 0.2)",
						}}
					/>
					<Tooltip title="Help Center">
						<Button type="text" icon={<QuestionCircleOutlined />} />
					</Tooltip>
					<Tooltip title="Notifications">
						<Button type="text" icon={<BellOutlined />} />
					</Tooltip>
					<UserMenu />
				</Space>
			</div>
		</Layout.Header>
	);
}
