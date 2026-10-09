import { createContext, useContext } from "react";

import type { OrganizationAccess } from "@/lib/query-options";

export interface OrgContextValue {
  userId: string;
  org: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    createdAt: Date;
  };
  role: string;
  isOwner: boolean;
  access: OrganizationAccess;
}

export const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrgContext(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrgContext 必须在 OrgContext.Provider 内使用");
  }
  return ctx;
}
