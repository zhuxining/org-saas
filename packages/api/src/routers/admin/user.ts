import { auth } from "@org-sass/auth";
import { z } from "zod";

import { o } from "../../index";
import { requireAdmin } from "../../middlewares";

const adminProcedure = o.use(requireAdmin);

export const userRouter = {
	listUsers: adminProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(20),
				offset: z.number().min(0).default(0),
			}),
		)
		.handler(async ({ input }) => {
			// Better-Auth admin plugin provides user management
			// We'll use direct DB query for listing with pagination
			const users = await auth.api.listUsers({
				query: {
					limit: input.limit.toString(),
					offset: input.offset.toString(),
				},
			});
			return users;
		}),

	setRole: adminProcedure
		.input(
			z.object({
				userId: z.string(),
				role: z.enum(["user", "admin"]),
			}),
		)
		.handler(async ({ input }) => {
			await auth.api.setRole({
				body: {
					userId: input.userId,
					role: input.role,
				},
			});
			return { success: true };
		}),

	banUser: adminProcedure
		.input(
			z.object({
				userId: z.string(),
				reason: z.string().optional(),
				banExpiresIn: z.number().optional(), // seconds
			}),
		)
		.handler(async ({ input }) => {
			await auth.api.banUser({
				body: {
					userId: input.userId,
					banReason: input.reason,
					banExpiresIn: input.banExpiresIn,
				},
			});
			return { success: true };
		}),

	unbanUser: adminProcedure
		.input(
			z.object({
				userId: z.string(),
			}),
		)
		.handler(async ({ input }) => {
			await auth.api.unbanUser({
				body: {
					userId: input.userId,
				},
			});
			return { success: true };
		}),

	impersonateUser: adminProcedure
		.input(
			z.object({
				userId: z.string(),
			}),
		)
		.handler(async ({ input, context }) => {
			const result = await auth.api.impersonateUser({
				body: {
					userId: input.userId,
				},
				headers: context.session?.session
					? new Headers({
							Authorization: `Bearer ${context.session.session.token}`,
						})
					: new Headers(),
			});
			return result;
		}),

	stopImpersonating: adminProcedure.handler(async ({ context }) => {
		await auth.api.stopImpersonating({
			headers: context.session?.session
				? new Headers({
						Authorization: `Bearer ${context.session.session.token}`,
					})
				: new Headers(),
		});
		return { success: true };
	}),
};
