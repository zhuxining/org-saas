import { auth } from "@org-sass/auth";
import { z } from "zod";

import { o } from "../../index";
import { requireAuth } from "../../middlewares";

const authProcedure = o.use(requireAuth);

export const memberRouter = {
	addMember: authProcedure
		.input(
			z.object({
				organizationId: z.string(),
				userId: z.string(),
				role: z.string().default("member"),
			}),
		)
		.handler(async ({ input, context }) => {
			await auth.api.addMember({
				body: {
					organizationId: input.organizationId,
					userId: input.userId,
					role: input.role,
				},
				headers: context.session?.session
					? new Headers({
							Authorization: `Bearer ${context.session.session.token}`,
						})
					: new Headers(),
			});
			return { success: true };
		}),

	removeMember: authProcedure
		.input(
			z.object({
				organizationId: z.string(),
				userId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			await auth.api.removeMember({
				body: {
					organizationId: input.organizationId,
					userId: input.userId,
				},
				headers: context.session?.session
					? new Headers({
							Authorization: `Bearer ${context.session.session.token}`,
						})
					: new Headers(),
			});
			return { success: true };
		}),

	updateMemberRole: authProcedure
		.input(
			z.object({
				organizationId: z.string(),
				userId: z.string(),
				role: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			await auth.api.updateMemberRole({
				body: {
					organizationId: input.organizationId,
					userId: input.userId,
					role: input.role,
				},
				headers: context.session?.session
					? new Headers({
							Authorization: `Bearer ${context.session.session.token}`,
						})
					: new Headers(),
			});
			return { success: true };
		}),

	listMembers: authProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const result = await auth.api.listMembers({
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
};
