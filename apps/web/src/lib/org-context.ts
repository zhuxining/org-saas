import { createContext, useContext } from "react";

export interface OrgContextValue {
	org: {
		id: string;
		name: string;
		slug: string;
		logo: string | null;
		metadata: string | null;
		createdAt: Date;
	};
	role: string;
}

export const OrgContext = createContext<OrgContextValue | null>(null);

export function useOrgContext(): OrgContextValue {
	const ctx = useContext(OrgContext);
	if (!ctx) {
		throw new Error("useOrgContext 必须在 OrgContext.Provider 内使用");
	}
	return ctx;
}
