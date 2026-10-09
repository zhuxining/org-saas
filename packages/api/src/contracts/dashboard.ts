import { oc } from "@orpc/contract";
import { z } from "zod";

export const dashboardContract = {
  orgStats: oc.input(z.object({ orgId: z.string() })).output(
    z.object({
      memberCount: z.number(),
      teamCount: z.number(),
      pendingInvitationCount: z.number(),
    }),
  ),
};
