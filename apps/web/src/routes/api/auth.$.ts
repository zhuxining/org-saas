import { auth } from "@org-saas/auth";
import { createFileRoute } from "@tanstack/react-router";

async function handle({ request }: { request: Request }): Promise<Response> {
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});
