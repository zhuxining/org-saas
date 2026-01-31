import { db } from "@org-sass/db";
import * as schema from "@org-sass/db/schema/auth";
import { env } from "@org-sass/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins/organization";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { ac, roles } from "./permissions";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: schema,
	}),
	trustedOrigins: [env.CORS_ORIGIN],
	emailAndPassword: {
		enabled: true,
	},
	plugins: [
		tanstackStartCookies(),
		organization({
			allowUserToCreateOrganization: true,
			teams: {
				enabled: true,
			},
			dynamicAccessControl: {
				enabled: true,
			},
			ac,
			roles,
		}),
	],
});
