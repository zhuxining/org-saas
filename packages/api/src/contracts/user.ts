import { oc } from "@orpc/contract";
import { z } from "zod";

export const userContract = {
  updateProfile: oc
    .input(
      z.object({
        name: z.string().min(2).max(50).optional(),
        image: z.string().url().optional(),
      }),
    )
    .output(z.unknown()),
};
