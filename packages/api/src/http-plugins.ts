import { SmartCoercionHandlerPlugin } from "@orpc/json-schema";
import { PinoHandlerPlugin, type LoggerContext } from "@orpc/pino";
import { RateLimitHandlerPlugin } from "@orpc/ratelimit";
import {
  BatchHandlerPlugin,
  CORSHandlerPlugin,
  GetMethodCsrfProtectionHandlerPlugin,
  MethodOverrideHandlerPlugin,
  PrototypePollutionProtectionHandlerPlugin,
  RequestCompressionHandlerPlugin,
  RequestHeadersHandlerPlugin,
  RequestLimitHandlerPlugin,
  ResponseCompressionHandlerPlugin,
  ResponseHeadersHandlerPlugin,
  TimeoutHandlerPlugin,
  type RequestHeadersHandlerPluginContext,
  type ResponseHeadersHandlerPluginContext,
} from "@orpc/server/plugins";
import type { StandardHandlerPlugin } from "@orpc/server/standard";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import type { Logger } from "pino";

export interface HTTPPluginContext
  extends LoggerContext, RequestHeadersHandlerPluginContext, ResponseHeadersHandlerPluginContext {
  requestId: string;
}

export const API_MAX_BODY_SIZE = 1024 * 1024;
export const API_TIMEOUT = 30_000;

export function createHTTPPlugins<T extends HTTPPluginContext>(options: {
  origin: string;
  logger: Logger;
  protocol: "rpc" | "openapi";
}): StandardHandlerPlugin<T>[] {
  const plugins: StandardHandlerPlugin<T>[] = [
    new CORSHandlerPlugin({
      origin: [new URL(options.origin).origin],
      credentials: true,
      allowMethods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      exposeHeaders: [
        "Content-Disposition",
        "Standard-Server",
        "Retry-After",
        "RateLimit-Limit",
        "RateLimit-Remaining",
        "RateLimit-Reset",
        "X-Request-Id",
      ],
    }),
    new RequestCompressionHandlerPlugin(),
    // oRPC orders decompression before this limit, including the batch envelope.
    new RequestLimitHandlerPlugin({ maxBodySize: API_MAX_BODY_SIZE }),
    new BatchHandlerPlugin({ maxSize: 10 }),
    new TimeoutHandlerPlugin({ timeout: API_TIMEOUT, streamingTimeout: 300_000 }),
    new GetMethodCsrfProtectionHandlerPlugin(),
    new PrototypePollutionProtectionHandlerPlugin(),
    new RequestHeadersHandlerPlugin(),
    new ResponseHeadersHandlerPlugin(),
    new RateLimitHandlerPlugin(),
    new PinoHandlerPlugin({
      logger: options.logger,
      generateRequestId: ({ context }) => context.requestId,
      logLifecycle: true,
      logAbort: true,
    }),
    new ResponseCompressionHandlerPlugin(),
  ];

  if (options.protocol === "openapi") {
    plugins.push(
      new MethodOverrideHandlerPlugin({ methods: ["PUT", "PATCH", "DELETE"] }),
      new SmartCoercionHandlerPlugin({ converters: [new ZodToJsonSchemaConverter()] }),
    );
  }

  return plugins;
}
