import { auth } from "@org-sass/auth";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const userRouter = {
	updateProfile: protectedProcedure
		.input(
			z.object({
				name: z.string().min(2).max(50).optional(),
				image: z.string().url().optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const updated = await auth.api.updateUser({
				body: {
					name: input.name,
					image: input.image,
				},
				headers: context.headers,
			});

			if (!updated) {
				throw new ORPCError("NOT_FOUND", { message: "用户不存在" });
			}

			return updated;
		}),
};
