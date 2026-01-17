import { auth } from "@org-sass/auth";
import { z } from "zod";

import { o } from "../../index";
import { requireAuth } from "../../middlewares";

const authProcedure = o.use(requireAuth);

export const invitationRouter = {
	inviteMember: authProcedure
		.input(
			z.object({
				organizationId: z.string(),
				email: z.string().email(),
				role: z.string().default("member"),
				resend: z.boolean().optional(),
			}),
		)
		.handler(async ({ input, context }) => {
			const result = await auth.api.inviteMember({
				body: {
					organizationId: input.organizationId,
					email: input.email,
					role: input.role,
					resend: input.resend,
				},
				headers: context.session?.session
					? new Headers({
							Authorization: `Bearer ${context.session.session.token}`,
						})
					: new Headers(),
			});
			return result;
		}),

	acceptInvitation: authProcedure
		.input(
			z.object({
				invitationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			await auth.api.acceptInvitation({
				body: {
					invitationId: input.invitationId,
				},
				headers: context.session?.session
					? new Headers({
							Authorization: `Bearer ${context.session.session.token}`,
						})
					: new Headers(),
			});
			return { success: true };
		}),

	rejectInvitation: authProcedure
		.input(
			z.object({
				invitationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			await auth.api.rejectInvitation({
				body: {
					invitationId: input.invitationId,
				},
				headers: context.session?.session
					? new Headers({
							Authorization: `Bearer ${context.session.session.token}`,
						})
					: new Headers(),
			});
			return { success: true };
		}),

	cancelInvitation: authProcedure
		.input(
			z.object({
				invitationId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			await auth.api.cancelInvitation({
				body: {
					invitationId: input.invitationId,
				},
				headers: context.session?.session
					? new Headers({
							Authorization: `Bearer ${context.session.session.token}`,
						})
					: new Headers(),
			});
			return { success: true };
		}),

	getInvitation: authProcedure
		.input(
			z.object({
				invitationId: z.string(),
			}),
		)
		.handler(async ({ input }) => {
			const result = await auth.api.getInvitation({
				query: {
					invitationId: input.invitationId,
				},
			});
			return result;
		}),
};
