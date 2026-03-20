import { Button } from "@org-sass/ui/components/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { usePermission } from "@/hooks/use-permission";
import { useOrgContext } from "@/lib/org-context";
import { orgFullQueryOptions } from "@/lib/query-options";
import { InviteMemberDialog } from "./-components/InviteMemberDialog";
import { MemberTable } from "./-components/MemberTable";

export const Route = createFileRoute("/org/$orgSlug/members/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			orgFullQueryOptions(context.org.id),
		);
	},
	component: MembersPage,
});

function MembersPage() {
	const { org } = useOrgContext();
	const canInvite = usePermission({ invitation: ["create"] });
	const [inviteOpen, setInviteOpen] = useState(false);

	const { data } = useSuspenseQuery(orgFullQueryOptions(org.id));

	const members = data?.data?.members ?? [];
	const invitations = data?.data?.invitations ?? [];

	return (
		<div className="p-6">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-bold text-2xl">成员管理</h1>
					<p className="text-muted-foreground text-sm">管理组织成员和邀请</p>
				</div>
				{canInvite && (
					<Button onClick={() => setInviteOpen(true)}>
						<UserPlus className="size-4" />
						邀请成员
					</Button>
				)}
			</div>

			<MemberTable members={members} invitations={invitations} orgId={org.id} />

			<InviteMemberDialog
				open={inviteOpen}
				onOpenChange={setInviteOpen}
				orgId={org.id}
			/>
		</div>
	);
}
