import { getLogger, type LoggerContext } from "@orpc/pino";
import { ratelimit, type RateLimiter } from "@orpc/ratelimit";
import { MemoryRateLimiter } from "@orpc/ratelimit/memory";
import { implement, ORPCError } from "@orpc/server";
import pino from "pino";

import type { Context } from "./context";
import { apiContract } from "./contracts/index";

// 创建 Pino logger
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
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

export const publicImplementer = implementer;

const requireAuth = implementer.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return next({
    context: {
      session: context.session,
    },
  });
});

export const protectedImplementer = implementer.use(requireAuth);

// 速率限制中间件
export const rateLimitedImplementer = protectedImplementer.use(
  ratelimit({
    limiter: ({ context }) => context.ratelimiter,
    key: ({ context }, _input) => `${context.session.user.id}:global`,
  }),
);

// 导出 logger 供外部使用
export { getLogger, logger };
