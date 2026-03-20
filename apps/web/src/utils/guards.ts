import type { auth } from "@org-sass/auth";
import { getSession } from "@/functions/auth.fn";
import type { RouterAppContext } from "@/routes/__root";
import { ForbiddenError, UnauthorizedError } from "@/utils/errors";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function requireSession(_ctx: {
	context: RouterAppContext;
	location?: { href: string };
}): Promise<{
	user: NonNullable<NonNullable<Session>["user"]>;
	session: NonNullable<Session>;
}> {
	const session = await getSession();

	if (!session?.user) {
		throw new UnauthorizedError("您需要登录才能访问此页面");
	}

	return {
		user: session.user,
		session,
	};
}

export function requireOrgRole(role: string, allowedRoles: string[]): void {
	if (!allowedRoles.includes(role)) {
		throw new ForbiddenError("您没有权限访问此页面", {
			requiredRole: allowedRoles.join(" | "),
		});
	}
}

export function requireAdmin(role: string): void {
	requireOrgRole(role, ["admin", "owner"]);
}

export function requireOwner(role: string): void {
	requireOrgRole(role, ["owner"]);
}
