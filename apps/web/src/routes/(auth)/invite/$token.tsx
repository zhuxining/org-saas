import { Button } from "@org-sass/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@org-sass/ui/components/card";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/(auth)/invite/$token")({
	component: InvitePage,
});

function InvitePage() {
	const { token } = Route.useParams();
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);

	const handleAccept = async () => {
		setLoading(true);
		const result = await authClient.organization.acceptInvitation({
			invitationId: token,
		});
		setLoading(false);

		if (result.error) {
			toast.error(result.error.message ?? "接受邀请失败");
			return;
		}

		toast.success("已成功加入组织");
		navigate({ to: "/dashboard" as string });
	};

	const handleReject = async () => {
		setLoading(true);
		const result = await authClient.organization.rejectInvitation({
			invitationId: token,
		});
		setLoading(false);

		if (result.error) {
			toast.error(result.error.message ?? "拒绝邀请失败");
			return;
		}

		toast.success("已拒绝邀请");
		navigate({ to: "/" });
	};

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle>组织邀请</CardTitle>
					<CardDescription>你收到了一个加入组织的邀请</CardDescription>
				</CardHeader>
				<CardContent className="flex justify-center gap-4">
					<Button variant="outline" onClick={handleReject} disabled={loading}>
						<X className="size-4" />
						拒绝
					</Button>
					<Button onClick={handleAccept} disabled={loading}>
						<Check className="size-4" />
						{loading ? "处理中..." : "接受邀请"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
