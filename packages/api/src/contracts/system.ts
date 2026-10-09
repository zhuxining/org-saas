import { oc } from "@orpc/contract";
import { z } from "zod";

export const systemContract = {
  healthCheck: oc.output(z.literal("OK")),
  privateData: oc.output(
    z.object({
      message: z.string(),
      user: z.unknown(),
    }),
  ),
};
