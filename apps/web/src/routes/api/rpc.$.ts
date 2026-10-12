import { createContext } from "@org-saas/api/context";
import { createHTTPPlugins } from "@org-saas/api/http-plugins";
import { logger, standardLimiter, type EnhancedContext } from "@org-saas/api/index";
import { appRouter } from "@org-saas/api/routers/index";
import { env } from "@org-saas/env/server";
import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferenceHandlerPlugin } from "@orpc/openapi/plugins";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { createFileRoute } from "@tanstack/react-router";

const rpcHandler = new RPCHandler(appRouter, {
  plugins: createHTTPPlugins<EnhancedContext>({ origin: env.CORS_ORIGIN, logger, protocol: "rpc" }),
});

const openAPISpec = new OpenAPIGenerator({
  converters: [new ZodToJsonSchemaConverter()],
}).generate(appRouter, {
  base: {
    info: {
      title: "org-saas API",
      version: "1.0.0",
    },
  },
});

const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    ...createHTTPPlugins<EnhancedContext>({ origin: env.CORS_ORIGIN, logger, protocol: "openapi" }),
    new OpenAPIReferenceHandlerPlugin({ spec: openAPISpec }),
  ],
});

async function handle({ request }: { request: Request }) {
  const context = {
    ...createContext({ headers: request.headers }),
    ratelimiter: standardLimiter,
  };

  const rpcResult = await rpcHandler.handle(request, {
    prefix: "/api/rpc",
    context,
  });
  if (rpcResult.response) {
    rpcResult.response.headers.set("X-Request-Id", context.requestId);
    return rpcResult.response;
  }

  const apiResult = await apiHandler.handle(request, {
    prefix: "/api/rpc/api-docs", // `http://localhost:3001/api/rpc/api-docs/spec.json`
    context,
  });
  if (apiResult.response) {
    apiResult.response.headers.set("X-Request-Id", context.requestId);
    return apiResult.response;
  }

  return new Response("Not found", { status: 404 });
}

export const Route = createFileRoute("/api/rpc/$")({
  server: {
    handlers: {
      OPTIONS: handle,
      HEAD: handle,
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
});
