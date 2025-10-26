import { useNavigate } from "@tanstack/react-router";
import { Button, Dropdown, type MenuProps, Skeleton } from "antd";
import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

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

	return (
		<Dropdown
			menu={{
				items: menuItems,
				onClick: handleMenuClick,
			}}
			trigger={["click"]}
			placement="bottomRight"
		>
			<Button>{session.user.name}</Button>
		</Dropdown>
	);
}
