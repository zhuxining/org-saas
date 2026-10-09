import { createSessionGetter } from "@org-saas/auth/session";

export function createContext(input: { req: Request } | { headers: Headers }) {
  const headers = "req" in input ? input.req.headers : input.headers;

  return {
    headers,
    getSession: createSessionGetter(headers),
  };
}

export type Context = ReturnType<typeof createContext>;
