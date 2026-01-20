import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

type Invitation = {
	id: string;
	status: string;
	role: string;
	organization?: {
		name?: string;
		logo?: string;
	};
	inviter?: {
		name?: string;
	};
};

export const Route = createFileRoute("/invitations/accept/$invitationId")({
	component: InvitationAcceptPage,
});

function InvitationAcceptPage() {
	const { invitationId } = Route.useParams();
	const navigate = useNavigate();

	const { data: session, isLoading: sessionLoading } = useQuery(
		orpc.privateData.queryOptions(),
	);

	const {
		data: invitation,
		isLoading: invitationLoading,
		error: invitationError,
	} = useQuery(
		orpc.organization.getInvitation.queryOptions({
			input: {
				id: invitationId,
			},
		}),
	) as {
		data: Invitation | undefined;
		isLoading: boolean;
		error: Error | null;
	};

	const acceptInvitation = useMutation(
		orpc.organization.acceptInvitation.mutationOptions({
			onSuccess: () => {
				toast.success("Invitation accepted successfully");
				setTimeout(() => {
					navigate({ to: "/org/dashboard" });
				}, 1000);
			},
			onError: (err: Error) => {
				toast.error(`Failed to accept invitation: ${err.message}`);
			},
		}),
	);

	const rejectInvitation = useMutation(
		orpc.organization.rejectInvitation.mutationOptions({
			onSuccess: () => {
				toast.success("Invitation rejected");
				setTimeout(() => {
					navigate({ to: "/" });
				}, 1000);
			},
			onError: (err: Error) => {
				toast.error(`Failed to reject invitation: ${err.message}`);
			},
		}),
	);

	const handleAccept = () => {
		acceptInvitation.mutate({ invitationId });
	};

	const handleReject = () => {
		rejectInvitation.mutate({ invitationId });
	};

	const handleLogin = () => {
		navigate({
			to: "/login",
			search: {
				invitationId,
				redirect: "/invitations/accept/$invitationId",
			},
		});
	};

	const isLoading = sessionLoading || invitationLoading;

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-muted/20">
				<Card className="w-full max-w-md">
					<CardHeader>
						<Skeleton className="h-8 w-48" />
						<Skeleton className="mt-2 h-4 w-full" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-32 w-full" />
						<Skeleton className="mt-4 h-12 w-full" />
						<Skeleton className="mt-4 h-12 w-full" />
					</CardContent>
				</Card>
			</div>
		);
	}

	if (invitationError) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-muted/20">
				<Card className="w-full max-w-md border-destructive">
					<CardHeader>
						<CardTitle className="text-destructive">
							Invalid Invitation
						</CardTitle>
						<CardDescription>
							This invitation link is invalid or has expired.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex justify-center">
						<Link to="/">
							<Button variant="outline">Go Home</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!invitation) {
		return null;
	}

	// Check if invitation is pending
	if (invitation.status !== "pending") {
		return (
			<div className="flex min-h-screen items-center justify-center bg-muted/20">
				<Card className="w-full max-w-md border-destructive">
					<CardHeader>
						<CardTitle className="text-destructive">
							Invitation Not Available
						</CardTitle>
						<CardDescription>
							This invitation has already been {invitation.status}.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex justify-center">
						<Link to="/">
							<Button variant="outline">Go Home</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		);
	}

	const isLoggedIn = !!session?.user;

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>You're Invited!</CardTitle>
					<CardDescription>
						You've been invited to join an organization
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center gap-4">
						<div className="flex-1">
							<p className="mb-1 font-medium">Organization</p>
							<p className="text-muted-foreground">
								{invitation?.organization?.name || "Unknown Organization"}
							</p>
						</div>
						<Avatar className="h-16 w-16">
							<AvatarImage
								src={invitation?.organization?.logo}
								alt={invitation?.organization?.name}
							/>
							<AvatarFallback>
								{invitation?.organization?.name?.charAt(0)?.toUpperCase() ||
									"?"}
							</AvatarFallback>
						</Avatar>
					</div>

					<Separator />

					<div className="grid grid-cols-2 gap-4">
						<div>
							<p className="mb-1 font-medium">Invited by</p>
							<p className="text-muted-foreground">
								{invitation?.inviter?.name || "Unknown"}
							</p>
						</div>
						<div>
							<p className="mb-1 font-medium">Your Role</p>
							<Badge variant="secondary">{invitation.role}</Badge>
						</div>
					</div>

					<Separator />

					{isLoggedIn ? (
						<div className="space-y-3">
							<p className="text-muted-foreground text-sm">
								You're currently logged in as {session.user.name}. Click
								"Accept" to join the organization.
							</p>
							<div className="flex gap-3">
								<Button
									onClick={handleAccept}
									disabled={acceptInvitation.isPending}
									className="flex-1"
								>
									<CheckCircle className="mr-2 h-4 w-4" />
									{acceptInvitation.isPending ? "Accepting..." : "Accept"}
								</Button>
								<Button
									onClick={handleReject}
									disabled={rejectInvitation.isPending}
									variant="outline"
									className="flex-1"
								>
									<X className="mr-2 h-4 w-4" />
									{rejectInvitation.isPending ? "Rejecting..." : "Reject"}
								</Button>
							</div>
						</div>
					) : (
						<div className="space-y-3">
							<p className="text-muted-foreground text-sm">
								You need to log in to accept this invitation.
							</p>
							<div className="space-y-3">
								<Button onClick={handleLogin} className="w-full">
									Log In to Accept
								</Button>
								<Button
									onClick={handleReject}
									disabled={rejectInvitation.isPending}
									variant="outline"
									className="w-full"
								>
									<X className="mr-2 h-4 w-4" />
									{rejectInvitation.isPending ? "Rejecting..." : "Reject"}
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
