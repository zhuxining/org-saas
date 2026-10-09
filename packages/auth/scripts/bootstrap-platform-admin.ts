import { db, eq, sql } from "@org-saas/db";
import { user } from "@org-saas/db/schema/auth";

import { platformAdminRoles } from "../src/platform-permissions";

const targetUserId = process.env.PLATFORM_ADMIN_BOOTSTRAP_USER_ID?.trim();
const targetEmail = process.env.PLATFORM_ADMIN_BOOTSTRAP_USER_EMAIL?.trim().toLowerCase();
const confirmation = process.env.PLATFORM_ADMIN_BOOTSTRAP_CONFIRM;
const platformAdminRole = platformAdminRoles[0];

async function bootstrapPlatformAdmin(): Promise<"initialized" | "already-initialized"> {
  if (!targetUserId) {
    throw new Error("Set PLATFORM_ADMIN_BOOTSTRAP_USER_ID to the existing user's exact ID.");
  }
  if (!targetEmail) {
    throw new Error("Set PLATFORM_ADMIN_BOOTSTRAP_USER_EMAIL to the existing user's exact email.");
  }
  if (confirmation !== "INITIALIZE_PLATFORM_ADMIN") {
    throw new Error("Set PLATFORM_ADMIN_BOOTSTRAP_CONFIRM=INITIALIZE_PLATFORM_ADMIN to proceed.");
  }

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext('org-saas.platform-admin-bootstrap'))`,
    );

    const [target] = await tx
      .select({
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        banned: user.banned,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, targetUserId))
      .for("update");
    if (!target) throw new Error("The specified user does not exist in the selected database.");
    if (target.email.trim().toLowerCase() !== targetEmail) {
      throw new Error("The specified user ID and email do not match.");
    }
    if (!target.emailVerified || target.banned) {
      throw new Error("The specified user must have a verified email and an active account.");
    }

    const rolePattern = `(^|,)[[:space:]]*${platformAdminRole}[[:space:]]*(,|$)`;
    const existingAdmins = await tx
      .select({ id: user.id })
      .from(user)
      .where(sql`${user.role} ~ ${rolePattern}`);

    if (existingAdmins.length > 0) {
      if (existingAdmins.length === 1 && existingAdmins[0]?.id === targetUserId) {
        return "already-initialized";
      }
      throw new Error("A platform administrator is already configured; bootstrap was refused.");
    }

    if (target.role !== null && target.role !== "user") {
      throw new Error("The specified user has a non-default role; review it before bootstrapping.");
    }

    await tx.update(user).set({ role: platformAdminRole }).where(eq(user.id, targetUserId));
    return "initialized";
  });
}

bootstrapPlatformAdmin()
  .then((result) => {
    console.info(
      result === "initialized"
        ? "The specified user is now the first platform administrator."
        : "The specified user is already the only platform administrator.",
    );
  })
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Platform administrator bootstrap failed.",
    );
    process.exitCode = 1;
  });
