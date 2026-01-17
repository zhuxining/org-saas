import { db } from "@org-sass/db";
import { member } from "@org-sass/db/schema/auth";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

import { o } from "./index";

export const requireAuth = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED", { message: "Authentication required" });
	}
	return next({
		context: {
			session: context.session,
			user: context.session.user,
		},
	});
});

export const requireAdmin = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED", { message: "Authentication required" });
	}

	const userRole = context.session.user.role;
	if (userRole !== "admin") {
		throw new ORPCError("FORBIDDEN", { message: "Admin access required" });
	}

	return next({
		context: {
			session: context.session,
			user: context.session.user,
		},
	});
});

export const requireOrgMember = o.middleware(
	async ({ context, next, input }) => {
		if (!context.session?.user) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Authentication required",
			});
		}

		const organizationId = (input as { organizationId?: string })
			?.organizationId;
		if (!organizationId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Organization ID required",
			});
		}

		const membership = await db.query.member.findFirst({
			where: and(
				eq(member.userId, context.session.user.id),
				eq(member.organizationId, organizationId),
			),
		});

		if (!membership) {
			throw new ORPCError("FORBIDDEN", {
				message: "Organization membership required",
			});
		}

		return next({
			context: {
				session: context.session,
				user: context.session.user,
				membership,
			},
		});
	},
);

export const requireOrgAdmin = o.middleware(
	async ({ context, next, input }) => {
		if (!context.session?.user) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Authentication required",
			});
		}

		const organizationId = (input as { organizationId?: string })
			?.organizationId;
		if (!organizationId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Organization ID required",
			});
		}

		const membership = await db.query.member.findFirst({
			where: and(
				eq(member.userId, context.session.user.id),
				eq(member.organizationId, organizationId),
			),
		});

		if (
			!membership ||
			(membership.role !== "admin" && membership.role !== "owner")
		) {
			throw new ORPCError("FORBIDDEN", {
				message: "Organization admin or owner access required",
			});
		}

		return next({
			context: {
				session: context.session,
				user: context.session.user,
				membership,
			},
		});
	},
);

export const requireOrgOwner = o.middleware(
	async ({ context, next, input }) => {
		if (!context.session?.user) {
			throw new ORPCError("UNAUTHORIZED", {
				message: "Authentication required",
			});
		}

		const organizationId = (input as { organizationId?: string })
			?.organizationId;
		if (!organizationId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "Organization ID required",
			});
		}

		const membership = await db.query.member.findFirst({
			where: and(
				eq(member.userId, context.session.user.id),
				eq(member.organizationId, organizationId),
			),
		});

		if (!membership || membership.role !== "owner") {
			throw new ORPCError("FORBIDDEN", {
				message: "Organization owner access required",
			});
		}

		return next({
			context: {
				session: context.session,
				user: context.session.user,
				membership,
			},
		});
	},
);
