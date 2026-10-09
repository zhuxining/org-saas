import { auth } from "./index";

export type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
export type SessionGetter = () => Promise<Session>;

/** Creates a session resolver scoped to one request and reuses its lookup. */
export function createSessionGetter(headers: Headers): SessionGetter {
  let sessionPromise: Promise<Session> | undefined;

  return () => {
    sessionPromise ??= auth.api.getSession({ headers });
    return sessionPromise;
  };
}
