import { setTimeout } from "node:timers/promises";

import type { Page } from "@playwright/test";

import { expect } from "../fixtures/browser";

type Credentials = { email: string; password: string };

let lastSignInCompletedAt = 0;
const authenticationWindowMs = 10_000;

export async function submitSignIn(page: Page, credentials: Credentials) {
  await page.getByRole("button", { name: "Already have an account? Sign In" }).click();
  await page.getByLabel("Email", { exact: true }).fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  // Better Auth 1.7.7 limits sign-in to three requests in a sliding 10s window.
  // All local browsers share one IP bucket, so space submissions without retrying failures.
  const remaining = lastSignInCompletedAt + authenticationWindowMs - Date.now();
  if (remaining > 0) await setTimeout(remaining);
  const responsePromise = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/auth/sign-in/email",
  );
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  const response = await responsePromise;
  lastSignInCompletedAt = Date.now();
  expect(response.status(), "Signing in through the real application must succeed").toBe(200);
}

export async function signIn(page: Page, credentials: Credentials, target: string) {
  await page.goto(`/login?redirect=${encodeURIComponent(target)}`);
  await submitSignIn(page, credentials);
  await expect(page).toHaveURL((url) => url.pathname === target);
}
