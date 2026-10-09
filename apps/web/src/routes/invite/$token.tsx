import { Button } from "@org-saas/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@org-saas/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, LogOut, X } from "lucide-react";
import { useState } from "react";

import { getSession } from "@/functions/auth.fn";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const invitePath = `/invite/${encodeURIComponent(token)}`;
  const { data: session, isPending: sessionPending } = useQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
  });
  const {
    data: invitationResult,
    isPending: invitationPending,
    error: invitationRequestError,
  } = useQuery({
    queryKey: ["invitation", token, session?.user?.id],
    queryFn: () => authClient.organization.getInvitation({ query: { id: token } }),
    enabled: !!session?.user,
    retry: false,
  });

  const invitationError = invitationResult?.error;
  const isAccountMismatch = invitationError?.code === "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION";

  const handleSignOut = async () => {
    setLoading(true);
    setFeedback(undefined);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setFeedback(result.error.message ?? "退出登录失败，请重试");
        return;
      }
      await navigate({ to: "/login", search: { redirect: invitePath } });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "退出登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    setFeedback(undefined);
    try {
      const result = await authClient.organization.acceptInvitation({ invitationId: token });
      if (result.error) {
        setFeedback(result.error.message ?? "接受邀请失败");
        return;
      }

      const acceptedOrganizationId = result.data?.member.organizationId;
      if (
        !acceptedOrganizationId ||
        result.data?.invitation.organizationId !== acceptedOrganizationId
      ) {
        setFeedback("邀请已处理，但无法确认加入的组织。请从个人中心检查组织列表。");
        return;
      }

      const organizationsResult = await authClient.organization.list();
      if (organizationsResult.error) {
        setFeedback(organizationsResult.error.message ?? "已加入组织，但无法加载组织列表");
        return;
      }
      const organization = organizationsResult.data?.find(
        (item) => item.id === acceptedOrganizationId,
      );
      if (!organization) {
        setFeedback("已加入组织，但当前账号的组织列表尚未返回该组织，请稍后从个人中心进入。");
        return;
      }

      await navigate({ to: `/org/${organization.slug}` as string });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "接受邀请失败");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    setFeedback(undefined);
    try {
      const result = await authClient.organization.rejectInvitation({ invitationId: token });
      if (result.error) {
        setFeedback(result.error.message ?? "拒绝邀请失败");
        return;
      }
      await navigate({ to: "/" });
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "拒绝邀请失败");
    } finally {
      setLoading(false);
    }
  };

  const isPending = sessionPending || (!!session?.user && invitationPending);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>组织邀请</CardTitle>
          <CardDescription>
            {isPending
              ? "正在确认邀请状态…"
              : session?.user
                ? "你收到了一个加入组织的邀请"
                : "登录受邀账号后即可继续处理此邀请。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {feedback && (
            <p role="alert" className="text-destructive text-sm">
              {feedback}
            </p>
          )}
          {!isPending && !session?.user && (
            <Link to="/login" search={{ redirect: invitePath }}>
              <Button>登录或注册以继续</Button>
            </Link>
          )}
          {!isPending && session?.user && isAccountMismatch && (
            <>
              <p className="text-center text-sm" role="alert">
                当前登录账号与邀请接收账号不匹配。请切换到受邀账号后重新打开邀请链接。
              </p>
              <Button onClick={() => void handleSignOut()} disabled={loading}>
                <LogOut className="size-4" />
                切换账号
              </Button>
            </>
          )}
          {!isPending && session?.user && invitationRequestError && (
            <p role="alert" className="text-center text-sm">
              {invitationRequestError instanceof Error
                ? invitationRequestError.message
                : "暂时无法确认此邀请，请稍后重试。"}
            </p>
          )}
          {!isPending && session?.user && invitationError && !isAccountMismatch && (
            <p role="alert" className="text-center text-sm">
              {invitationError.message ?? "此邀请无效、已过期或已处理，无法继续。"}
            </p>
          )}
          {!isPending &&
            session?.user &&
            !invitationError &&
            !invitationRequestError &&
            invitationResult?.data && (
              <>
                <p className="text-center text-sm">
                  邀请你加入 {invitationResult.data.organizationName}（
                  {invitationResult.data.organizationSlug}）
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => void handleReject()} disabled={loading}>
                    <X className="size-4" />
                    拒绝
                  </Button>
                  <Button onClick={() => void handleAccept()} disabled={loading}>
                    <Check className="size-4" />
                    {loading ? "处理中…" : "接受邀请"}
                  </Button>
                </div>
              </>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
