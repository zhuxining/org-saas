import { createFileRoute, redirect } from "@tanstack/react-router";

import { getUser } from "@/functions/get-user";

export const Route = createFileRoute("/org")({
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
