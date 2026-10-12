import { createSessionGetter, type SessionGetter } from "@org-saas/auth/session";
import type {
  RequestHeadersHandlerPluginContext,
  ResponseHeadersHandlerPluginContext,
} from "@orpc/server/plugins";

export interface Context
  extends RequestHeadersHandlerPluginContext, ResponseHeadersHandlerPluginContext {
  headers: Headers;
  requestId: string;
  getSession: SessionGetter;
}

export function createContext(input: { req: Request } | { headers: Headers }): Context {
  const headers = "req" in input ? input.req.headers : input.headers;

  return {
    headers,
    reqHeaders: headers,
    requestId: crypto.randomUUID(),
    getSession: createSessionGetter(headers),
  };
}
