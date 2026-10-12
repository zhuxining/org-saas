import { env } from "@org-saas/env/server";
import { getLogger, type LoggerContext } from "@orpc/pino";
import { ratelimit, type RateLimiter } from "@orpc/ratelimit";
import { MemoryRateLimiter } from "@orpc/ratelimit/memory";
import { COMMON_ERROR_STATUS_MAP, implement, ORPCError } from "@orpc/server";
import pino from "pino";

import type { Context } from "./context";
import { apiContract } from "./contracts/index";

// 创建 Pino logger
const logger = pino({
  level: env.LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// 创建不同级别的限制器
export const standardLimiter = new MemoryRateLimiter({
  maxRequests: 100,
  window: 60000,
  blockingUntilReady: {
    enabled: true,
    timeout: 5000, // Wait up to 5 seconds
  },
});

// Extend the context with the request logger and rate limiter.
export interface EnhancedContext extends Context, LoggerContext {
  ratelimiter: RateLimiter;
}

export const implementer = implement(apiContract).$context<EnhancedContext>();

const errorBoundary = implementer.middleware(async ({ context, next }) => {
  try {
    return await next();
  } catch (error) {
    const status =
      error instanceof ORPCError
        ? COMMON_ERROR_STATUS_MAP[error.code as keyof typeof COMMON_ERROR_STATUS_MAP]
        : undefined;
    if (error instanceof ORPCError && status !== undefined && status < 500) throw error;

    logger.error({ err: error, requestId: context.requestId }, "Unhandled API error");
    throw new ORPCError(
      error instanceof ORPCError && status !== undefined && status >= 500
        ? error.code
        : "INTERNAL_SERVER_ERROR",
      {
        message: "服务暂时出现问题，请稍后重试",
        data: { requestId: context.requestId },
        cause: error,
      },
    );
  }
});

export const publicImplementer = implementer.use(errorBoundary);

const requireAuth = implementer.middleware(async ({ context, errors, next }) => {
  const session = await context.getSession();

  if (!session?.user) {
    if ("UNAUTHORIZED" in errors) {
      throw errors.UNAUTHORIZED();
    }

    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      session,
    },
  });
});

export const protectedImplementer = publicImplementer.use(requireAuth);

// 速率限制中间件
export const rateLimitedImplementer = protectedImplementer.use(
  ratelimit({
    limiter: ({ context }) => context.ratelimiter,
    key: ({ context }, _input) => `${context.session.user.id}:global`,
  }),
);

// 导出 logger 供外部使用
export { getLogger, logger };
