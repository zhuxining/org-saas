import { HomeOutlined, LayoutOutlined } from "@ant-design/icons";
import { Link, useRouterState } from "@tanstack/react-router";
import type { MenuProps } from "antd";
import { Layout, Menu, Space, Typography, theme } from "antd";
import { type ReactNode, useMemo, useState } from "react";
import Header from "./header";
import Loader from "./loader";

interface ProLayoutProps {
	children: ReactNode;
	isLoading?: boolean;
}

const navigationItems = [
	{
		key: "/",
		to: "/",
		icon: <HomeOutlined />,
		label: "Home",
	},
	{
		key: "/dashboard",
		to: "/dashboard",
		icon: <LayoutOutlined />,
		label: "Dashboard",
	},
] as const;

export default function ProLayout({ children, isLoading }: ProLayoutProps) {
	const [collapsed, setCollapsed] = useState(false);
	const { token } = theme.useToken();

	const pathname = useRouterState({
		select: (state) => state.location?.pathname ?? "/",
	});

	const selectedKey = useMemo(() => {
		return (
			navigationItems
				.slice()
				.sort((a, b) => b.to.length - a.to.length)
				.find(
					(item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
				)?.key ?? "/"
		);
	}, [pathname]);

	const menuItems: MenuProps["items"] = useMemo(
		() =>
			navigationItems.map((item) => ({
				key: item.key,
				icon: item.icon,
				label: <Link to={item.to}>{item.label}</Link>,
			})),
		[],
	);

	const breadcrumbItems = useMemo(() => {
		if (selectedKey === "/") {
			return [
				{
					title: "Home",
				},
			];
		}

		const activeItem = navigationItems.find((item) => item.key === selectedKey);
		return [
			{
				title: <Link to="/">Home</Link>,
			},
			{
				title: activeItem?.label ?? "Page",
			},
		];
	}, [selectedKey]);

	return (
		<Layout
			style={{
				minHeight: "100vh",
				background: token.colorBgLayout,
			}}
		>
			<Layout.Sider
				trigger={null}
				collapsible
				collapsed={collapsed}
				onCollapse={setCollapsed}
				width={232}
				style={{
					background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
					borderRight: "1px solid rgba(148, 163, 184, 0.2)",
				}}
			>
				<Space
					align="center"
					style={{
						height: 64,
						paddingInline: collapsed ? 12 : 24,
						color: token.colorWhite,
						fontWeight: 600,
						fontSize: collapsed ? 18 : 20,
						whiteSpace: "nowrap",
					}}
				>
					<Typography.Text
						style={{
							color: token.colorWhite,
							fontWeight: 600,
						}}
					>
						WX Mini Pro
					</Typography.Text>
				</Space>
				<Menu
					mode="inline"
					selectedKeys={[selectedKey]}
					items={menuItems}
					style={{
						borderInlineEnd: "none",
						background: "transparent",
						paddingInline: collapsed ? 8 : 12,
					}}
				/>
			</Layout.Sider>
			<Layout>
				<Header
					collapsed={collapsed}
					onToggle={() => setCollapsed((prev) => !prev)}
					breadcrumbItems={breadcrumbItems}
				/>
				<Layout.Content
					style={{
						margin: "24px",
						minHeight: 0,
					}}
				>
					<div
						style={{
							background: token.colorBgContainer,
							borderRadius: 16,
							padding: 24,
							minHeight: "60vh",
							boxShadow: "0 20px 45px rgba(15, 23, 42, 0.25)",
							border: "1px solid rgba(148, 163, 184, 0.12)",
						}}
					>
						{isLoading ? <Loader /> : children}
					</div>
				</Layout.Content>
				<Layout.Footer
					style={{
						textAlign: "center",
						background: "transparent",
						color: token.colorTextTertiary,
						borderTop: "1px solid rgba(148, 163, 184, 0.2)",
						padding: "16px 24px",
					}}
				>
					Ant Design Pro Inspired Dashboard · WX Mini
				</Layout.Footer>
			</Layout>
		</Layout>
	);
}
