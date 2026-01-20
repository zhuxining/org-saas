import { redirect } from "@tanstack/react-router";

export type RouteContext = {
	session?: {
		user?: {
			id: string;
			email: string;
			name: string;
			role?: string | string[];
			image?: string;
		};
	};
};

export function requireAdminRole(context: RouteContext): void {
	const session = context.session;
	if (!session?.user) {
		redirect({ to: "/login" });
	}

	const role = session.user.role;
	if (
		!role ||
		(Array.isArray(role) && !role.includes("admin")) ||
		(typeof role === "string" && role !== "admin")
	) {
		redirect({ to: "/org" });
	}
}

export function requireAuth(context: RouteContext): void {
	if (!context.session?.user) {
		redirect({ to: "/login" });
	}
}
