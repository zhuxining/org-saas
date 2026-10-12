export default function requireIsolatedBrowserRun(): void {
  if (process.env.ORG_SAAS_E2E !== "1") {
    throw new Error(
      "Direct Playwright runs are disabled. Use `bun run test:e2e` to create an isolated database before running browser tests.",
    );
  }
}
