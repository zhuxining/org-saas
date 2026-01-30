import { useRouter } from "@tanstack/react-router";
import { LogIn, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { UnauthorizedError } from "@/utils/guards/errors";

interface UnauthorizedPageProps {
	error: UnauthorizedError;
}

export function UnauthorizedPage({ error }: UnauthorizedPageProps) {
	const router = useRouter();

	const handleLogin = () => {
		router.navigate({
			to: error.redirectTo,
			search: { redirect: window.location.href },
		});
	};

	return (
		<div className="flex min-h-[50vh] items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<div className="flex items-center gap-2">
						<Shield className="h-6 w-6 text-destructive" />
						<CardTitle>需要登录</CardTitle>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-md bg-muted p-3">
						<p className="text-muted-foreground text-sm">{error.message}</p>
					</div>

					<div className="rounded-md bg-blue-50 p-3 dark:bg-blue-950">
						<p className="text-blue-900 text-sm dark:text-blue-100">
							请登录以继续访问此页面。登录后您将返回到您原本想访问的页面。
						</p>
					</div>
				</CardContent>
				<CardFooter>
					<Button onClick={handleLogin} className="w-full">
						<LogIn className="mr-2 h-4 w-4" />
						前往登录
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
