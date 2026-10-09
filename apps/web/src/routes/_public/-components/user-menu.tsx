import { Button } from "@org-saas/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@org-saas/ui/components/dropdown-menu";
import { Skeleton } from "@org-saas/ui/components/skeleton";
import { toast } from "@org-saas/ui/components/toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";

import { getSession } from "@/functions/auth.fn";
import { authClient } from "@/lib/auth-client";

export function UserMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = useQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
  });

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!session?.user) {
    return (
      <Link to="/login" search={{ redirect: undefined }}>
        <Button variant="outline">Sign In</Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {session.user.name}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>{session.user.email}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate({ to: "/me" })}>个人中心</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              void authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    queryClient.clear();
                    void navigate({ to: "/" });
                  },
                  onError: (error) => {
                    toast.add({ title: error.error.message ?? "退出失败", type: "error" });
                  },
                },
              });
            }}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
