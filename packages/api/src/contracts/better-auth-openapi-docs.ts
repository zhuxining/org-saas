import { oc } from "@orpc/contract";
import { z } from "zod";

export const betterAuthOpenAPIDocsContract = {
  getOpenAPISchema: oc.output(z.unknown()),
};
