import { hasPlatformAdminRole } from "@org-saas/auth/platform-permissions";
import { ORPCError } from "@orpc/server";

import { listAuditRecords } from "../audit-records";
import { protectedImplementer } from "../index";
import { loadOrganizationAccess } from "../organization-access";

export const auditRouter = {
  listOrganizationEvents: protectedImplementer.audit.listOrganizationEvents.handler(
    async ({ context, input }) => {
      const access = await loadOrganizationAccess(input.organizationId, context.session.user.id);
      if (!access.operations.audit.read) {
        throw new ORPCError("FORBIDDEN", {
          message: "You are not allowed to view this organization's audit log.",
        });
      }

      return listAuditRecords(
        { scope: "organization", organizationId: input.organizationId },
        input,
      );
    },
  ),
  listPlatformEvents: protectedImplementer.audit.listPlatformEvents.handler(
    async ({ context, input }) => {
      if (!hasPlatformAdminRole(context.session.user.role)) {
        throw new ORPCError("FORBIDDEN", { message: "Platform administrator access is required." });
      }

      return listAuditRecords({ scope: "platform" }, input);
    },
  ),
};
