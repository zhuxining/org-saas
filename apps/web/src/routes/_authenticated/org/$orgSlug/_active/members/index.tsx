import { Button } from "@org-saas/ui/components/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useState } from "react";

import { usePermission } from "@/hooks/use-permission";
import { useOrgContext } from "@/lib/org-context";
import { organizationFullQueryOptions } from "@/lib/query-options";

import { InviteMemberDialog } from "./-components/invite-member-dialog";
import { MemberTable } from "./-components/member-table";

export const Route = createFileRoute("/_authenticated/org/$orgSlug/_active/members/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      organizationFullQueryOptions(context.user.id, context.org.id),
    );
  },
  component: MembersPage,
});

function MembersPage() {
  const { org, userId } = useOrgContext();
  const canInvite = usePermission({ invitation: ["create"] });
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data } = useSuspenseQuery(organizationFullQueryOptions(userId, org.id));

  const members = data?.members ?? [];
  const invitations = data?.invitations ?? [];

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">成员管理</h1>
          <p className="text-muted-foreground text-sm">查看成员并管理当前权限允许的操作</p>
        </div>
        {canInvite && (
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus data-icon="inline-start" />
            邀请成员
          </Button>
        )}
      </div>

      <MemberTable members={members} invitations={invitations} orgId={org.id} />
      {canInvite && (
        <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} orgId={org.id} />
      )}
    </div>
  );
}
