import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

const databaseEnvPath = process.env.DATABASE_ENV_FILE ?? "../../apps/web/.env";

// Keep the existing local default while allowing CI and standalone DB workflows
// to provide their own dotenv file. Shell-injected values still take precedence.
dotenv.config({
  path: databaseEnvPath,
});

const { env } = await import("@org-saas/env/server");

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
