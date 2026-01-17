import { createFileRoute, redirect } from "@tanstack/react-router";

import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/admin")({
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
		// Check if user is admin
		if (context.session.user.role !== "admin") {
			throw redirect({
				to: "/",
			});
		}
	},
});
