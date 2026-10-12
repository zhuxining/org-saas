import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4317";

if (process.env.ORG_SAAS_E2E !== "1" && !process.argv.includes("--list")) {
  throw new Error("Run browser tests with bun run test:e2e to create an isolated database.");
}

export default defineConfig({
  testDir: "./browser",
  testMatch: "**/*.test.ts",
  fullyParallel: false,
  retries: 0,
  // The preview server has one shared authentication rate-limit bucket on loopback.
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "./test-results",
  use: {
    baseURL,
    screenshot: { mode: "only-on-failure", fullPage: true },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "vp preview --host 127.0.0.1 --port 4317 --strictPort",
    cwd: fileURLToPath(new URL("../apps/web", import.meta.url)),
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
