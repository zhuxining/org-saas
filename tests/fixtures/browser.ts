import { randomUUID } from "node:crypto";

import { test as base } from "@playwright/test";

type Account = {
  name: string;
  email: string;
  password: string;
  cookie: string;
  organization: { id: string; name: string; slug: string };
};

export async function createBrowserAccount(): Promise<Account> {
  const { auth } = await import("@org-saas/auth");
  const suffix = randomUUID();
  const name = `Browser user ${suffix}`;
  const email = `browser-${suffix}@example.test`;
  const password = `Browser-${randomUUID()}!`;
  // Setup uses the real server API without spending the browser's HTTP rate-limit budget.
  const registered = await auth.api.signUpEmail({
    body: { name, email, password },
    returnHeaders: true,
  });
  const cookie = registered.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Account setup did not return a session cookie.");

  const organizationName = `Browser organization ${suffix}`;
  const slug = `browser-${suffix}`;
  const organization = await auth.api.createOrganization({
    body: { name: organizationName, slug },
    headers: new Headers({ cookie }),
  });
  if (!organization) throw new Error("Account setup did not create an organization.");

  return {
    name,
    email,
    password,
    cookie,
    organization: { id: organization.id, name: organizationName, slug },
  };
}

export const test = base.extend<{ account: Account }>({
  account: async ({ baseURL }, use) => {
    if (baseURL !== process.env.BETTER_AUTH_URL) {
      throw new Error("Account setup must target the isolated application.");
    }
    await use(await createBrowserAccount());
  },
  request: async ({ playwright, baseURL, account }, use) => {
    if (!baseURL) throw new Error("Browser tests require the isolated application URL.");
    // Only the setup request gets these cookies. Browser contexts start unauthenticated.
    const request = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { origin: baseURL, cookie: account.cookie },
    });
    try {
      await use(request);
    } finally {
      await request.dispose();
    }
  },
});

export { expect } from "@playwright/test";
