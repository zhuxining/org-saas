import { useSuspenseQuery } from "@tanstack/react-query";

import { useOrgContext } from "@/lib/org-context";
import { organizationAccessQueryOptions } from "@/lib/query-options";

export function usePermission(permissions: Record<string, string[]>): boolean {
  const { org, userId } = useOrgContext();
  const { data: access } = useSuspenseQuery(organizationAccessQueryOptions(userId, org.id));
  const operations = access.operations as Record<string, Record<string, boolean>>;
  const resourceMap: Record<string, string> = { ac: "roleDefinition" };

  return Object.entries(permissions).every(([resource, actions]) =>
    actions.every((action) => operations[resourceMap[resource] ?? resource]?.[action] === true),
  );
}
