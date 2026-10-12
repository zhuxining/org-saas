import { createSessionGetter, type SessionGetter } from "@org-saas/auth/session";

export interface Context {
  headers: Headers;
  requestId: string;
  getSession: SessionGetter;
}

export function createContext(input: { req: Request } | { headers: Headers }): Context {
  const headers = "req" in input ? input.req.headers : input.headers;

  return {
    headers,
    requestId: crypto.randomUUID(),
    getSession: createSessionGetter(headers),
  };
}
