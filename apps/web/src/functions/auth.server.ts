import { auth } from "@org-sass/auth";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/middleware/auth";

export const getSession = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		return context.session;
	});

export const resolveOrgBySlug = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.inputValidator((slug: string) => slug)
	.handler(async ({ context, data: slug }) => {
		const user = context.session?.user;
		if (!user) {
			return null;
		}

		const setActiveResult = await auth.api.setActiveOrganization({
			body: { organizationSlug: slug },
			headers: context.headers,
		});

		if (!setActiveResult) {
			return null;
		}

		const activeMember = await auth.api.getActiveMember({
			headers: context.headers,
		});

		if (!activeMember) {
			return null;
		}

		return {
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image ?? null,
			},
			org: setActiveResult,
			role: activeMember.role as string,
		};
	});
