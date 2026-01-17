import { auth } from "@org-sass/auth";
import { z } from "zod";

import { o } from "../../index";
import { requireAuth } from "../../middlewares";

const authProcedure = o.use(requireAuth);

export const organizationRouter = {
	createOrganization: authProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100),
				slug: z.string().min(1).max(50),
				logo: z.string().url().optional(),
				metadata: z.record(z.unknown()).optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const result = await auth.api.createOrganization({
				body: {
					name: input.name,
					slug: input.slug,
					logo: input.logo,
					metadata: input.metadata,
				},
				headers: context.session?.session
					? new Headers({
							Authorization: `Bearer ${context.session.session.token}`,
						})
					: new Headers(),
			});
			return result;
		}),

	updateOrganization: authProcedure
		.input(
			z.object({
				organizationId: z.string(),
				name: z.string().min(1).max(100).optional(),
				slug: z.string().min(1).max(50).optional(),
				logo: z.string().url().optional(),
				metadata: z.record(z.unknown()).optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			await auth.api.updateOrganization({
				body: {
					organizationId: input.organizationId,
					name: input.name,
					slug: input.slug,
					logo: input.logo,
					metadata: input.metadata,
				},
				headers: context.session?.session
					? new Headers({
							Authorization: `Bearer ${context.session.session.token}`,
						})
					: new Headers(),
			});
			return { success: true };
		}),

	deleteOrganization: authProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			await auth.api.deleteOrganization({
				body: {
					organizationId: input.organizationId,
				},
				headers: context.session?.session
					? new Headers({
							Authorization: `Bearer ${context.session.session.token}`,
						})
					: new Headers(),
			});
			return { success: true };
		}),

	getFullOrganization: authProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const result = await auth.api.getFullOrganization({
				query: {
					organizationId: input.organizationId,
				},
				headers: context.session?.session
					? new Headers({
							Authorization: `Bearer ${context.session.session.token}`,
						})
					: new Headers(),
			});
			return result;
		}),

	listOrganizations: authProcedure.handler(async ({ context }) => {
		const result = await auth.api.listOrganizations({
			headers: context.session?.session
				? new Headers({
						Authorization: `Bearer ${context.session.session.token}`,
					})
				: new Headers(),
		});
		return result;
	}),

	setActiveOrganization: authProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			await auth.api.setActiveOrganization({
				body: {
					organizationId: input.organizationId,
				},
				headers: context.session?.session
					? new Headers({
							Authorization: `Bearer ${context.session.session.token}`,
						})
					: new Headers(),
			});
			return { success: true };
		}),
};
