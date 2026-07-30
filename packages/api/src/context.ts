import { auth } from "@org-sass/auth";

export async function createContext(input: { req: Request } | { headers: Headers }) {
  const headers = "req" in input ? input.req.headers : input.headers;
  const session = await auth.api.getSession({
    headers,
  });
  return {
    session,
    headers,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
