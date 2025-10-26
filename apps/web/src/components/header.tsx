import { Link, useRouterState } from "@tanstack/react-router";
import type { MenuProps } from "antd";
import { Layout, Menu } from "antd";
import UserMenu from "./user-menu";

export default function Header() {
	const links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
	] as const;

	const pathname = useRouterState({
		select: (state) => state.location?.pathname ?? "/",
	});
	const selectedKey =
		links
			.slice()
			.sort((a, b) => b.to.length - a.to.length)
			.find(
				(link) => pathname === link.to || pathname.startsWith(`${link.to}/`),
			)?.to ?? "/";
	const items: MenuProps["items"] = links.map(({ to, label }) => ({
		key: to,
		label: <Link to={to}>{label}</Link>,
	}));

	return (
		<Layout.Header
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				paddingInline: 24,
				background: "transparent",
				borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
			}}
		>
			<Menu
				mode="horizontal"
				selectedKeys={[selectedKey]}
				items={items}
				style={{
					flex: 1,
					background: "transparent",
					borderBottom: "none",
				}}
			/>
			<UserMenu />
		</Layout.Header>
	);
}
