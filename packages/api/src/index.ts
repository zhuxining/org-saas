import { getLogger, type LoggerContext } from "@orpc/experimental-pino";
import {
	createRatelimitMiddleware,
	type Ratelimiter,
} from "@orpc/experimental-ratelimit";
import { MemoryRatelimiter } from "@orpc/experimental-ratelimit/memory";
import { ORPCError, os } from "@orpc/server";
import pino from "pino";

import type { Context } from "./context";

// 创建 Pino logger
const logger = pino({
	level: process.env.LOG_LEVEL || "info",
	formatters: {
		level: (label) => ({ level: label }),
	},
	timestamp: pino.stdTimeFunctions.isoTime,
});

// 创建不同级别的限制器
export const standardLimiter = new MemoryRatelimiter({
	maxRequests: 100,
	window: 60000,
});

export const strictLimiter = new MemoryRatelimiter({
	maxRequests: 10,
	window: 60000,
});

// 扩展 Context 类型以包含 LoggerContext
export interface EnhancedContext extends Context, LoggerContext {
	ratelimiter: Ratelimiter;
}

export const o = os.$context<EnhancedContext>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED");
	}
	if (!context.req) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Request context not available",
		});
	}
	return next({
		context: {
			session: context.session,
			req: context.req,
		},
	});
});

export const protectedProcedure = publicProcedure.use(requireAuth);

// 速率限制中间件
export const rateLimitedProcedure = protectedProcedure.use(
	createRatelimitMiddleware({
		limiter: ({ context }) => context.ratelimiter,
		key: ({ context }, _input) =>
			`${context.session.user.id}:${context.req.url}`,
	}),
);

export function requireAdmin(context: Context) {
	const role = context.session?.user?.role;
	if (!role || !role.includes("admin")) {
		throw new ORPCError("FORBIDDEN", {
			message: "Admin access required",
		});
	}
}

// 导出 logger 供外部使用
export { logger, getLogger };
