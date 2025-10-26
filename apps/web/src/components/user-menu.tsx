import { useNavigate } from "@tanstack/react-router";
import type { MenuProps } from "antd";
import {
	Avatar,
	Button,
	Dropdown,
	Skeleton,
	Space,
	Typography,
	theme,
} from "antd";
import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();
	const { token } = theme.useToken();

	if (isPending) {
		return <Skeleton.Button active size="small" />;
	}

	if (!session) {
		return (
			<Button
				type="primary"
				onClick={() =>
					navigate({
						to: "/login",
					})
				}
			>
				Sign In
			</Button>
		);
	}

	const menuItems: MenuProps["items"] = [
		{
			key: "user-email",
			label: session.user.email,
			disabled: true,
		},
		{
			type: "divider",
		},
		{
			key: "sign-out",
			label: "Sign Out",
			danger: true,
		},
	];

	const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
		if (key === "sign-out") {
			authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						navigate({
							to: "/",
						});
					},
				},
			});
		}
	};

	const displayName = session.user.name ?? session.user.email;
	const initials = displayName
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	return (
		<Dropdown
			menu={{
				items: menuItems,
				onClick: handleMenuClick,
			}}
			trigger={["click"]}
			placement="bottomRight"
		>
			<Button
				type="text"
				style={{
					display: "flex",
					alignItems: "center",
					gap: 12,
					height: "auto",
					paddingInline: 12,
					color: "inherit",
				}}
			>
				<Space align="center" size={12}>
					<Avatar
						size={32}
						style={{
							backgroundColor: token.colorPrimary,
							color: token.colorWhite,
							fontWeight: 600,
						}}
					>
						{initials}
					</Avatar>
					<Typography.Text
						style={{
							color: "inherit",
							fontWeight: 500,
						}}
					>
						{displayName}
					</Typography.Text>
				</Space>
			</Button>
		</Dropdown>
	);
}
