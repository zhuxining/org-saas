import { db } from "@org-sass/db";
import * as schema from "@org-sass/db/schema/auth";
import { env } from "@org-sass/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { organization } from "better-auth/plugins/organization";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { ac, defaultRoles } from "./permissions";

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
		admin(),
		organization({
			// Allow any authenticated user to create organizations
			allowUserToCreateOrganization: true,
			teams: {
				enabled: true,
			},
			// Enable dynamic access control for custom roles
			dynamicAccessControl: {
				enabled: true,
				// Limit roles per organization (e.g., 10 for free tier, unlimited for pro)
				maximumRolesPerOrganization: 10,
			},
			// Pass the access control instance
			ac,
			// Pass default roles
			roles: defaultRoles,
			// Add custom fields to organizationRole table
			schema: {
				organizationRole: {
					additionalFields: {
						// Role description
						description: {
							type: "string",
							required: false,
						},
						// Role color for UI
						color: {
							type: "string",
							defaultValue: "#6366f1",
						},
						// Role level for sorting
						level: {
							type: "number",
							defaultValue: 0,
						},
						// Whether this is a system role (cannot be deleted)
						isSystemRole: {
							type: "boolean",
							defaultValue: false,
						},
					},
				},
			},
		}),
	],
});
