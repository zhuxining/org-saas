import { env } from "@org-saas/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { relations } from "./schema/relations";

export const db: NodePgDatabase<typeof relations> = drizzle({
  connection: env.DATABASE_URL,
  relations,
});

// Re-export drizzle-orm utilities
export { and, count, eq } from "drizzle-orm";
