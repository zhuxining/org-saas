import { db } from "@org-sass/db";
import { organization } from "@org-sass/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { o } from "../../index";
import { requireAdmin } from "../../middlewares";

const adminProcedure = o.use(requireAdmin);

export const organizationRouter = {
	listOrganizations: adminProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).default(20),
				offset: z.number().min(0).default(0),
			}),
		)
		.handler(async ({ input }) => {
			const orgs = await db.query.organization.findMany({
				limit: input.limit,
				offset: input.offset,
				with: {
					members: {
						with: {
							user: {
								columns: {
									id: true,
									name: true,
									email: true,
									image: true,
								},
							},
						},
					},
				},
			});
			return orgs;
		}),

	getOrganization: adminProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input }) => {
			const org = await db.query.organization.findFirst({
				where: eq(organization.id, input.organizationId),
				with: {
					members: {
						with: {
							user: {
								columns: {
									id: true,
									name: true,
									email: true,
									image: true,
								},
							},
						},
					},
				},
			});
			return org;
		}),

	deleteOrganization: adminProcedure
		.input(
			z.object({
				organizationId: z.string(),
			}),
		)
		.handler(async ({ input }) => {
			await db
				.delete(organization)
				.where(eq(organization.id, input.organizationId));
			return { success: true };
		}),
};
