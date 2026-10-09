import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load the web app's local environment file for database CLI commands.
dotenv.config({
  path: "../../apps/web/.env",
});

const { env } = await import("@org-saas/env/server");

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
