import { db } from "@org-sass/db";
import * as schema from "@org-sass/db/schema/auth";
import { env } from "@org-sass/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { openAPI } from "better-auth/plugins";
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
		openAPI(), // `http://localhost:3001/api/auth/reference`
		tanstackStartCookies(),
		organization({
			allowUserToCreateOrganization: true,
			teams: {
				enabled: true,
				maximumTeams: 10, // Optional: limit teams per organization
				allowRemovingAllTeams: false, // Optional: prevent removing the last team
			},
			ac,
			dynamicAccessControl: {
				enabled: true,
			},
			roles,
		}),
	],
});
