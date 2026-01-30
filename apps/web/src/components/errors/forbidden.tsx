import { useRouter } from "@tanstack/react-router";
import { AlertCircle, Home, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { ForbiddenError } from "@/utils/guards/errors";

interface ForbiddenPageProps {
	error: ForbiddenError;
}

export function ForbiddenPage({ error }: ForbiddenPageProps) {
	const router = useRouter();

	const handleGoHome = () => {
		router.navigate({ to: "/" });
	};

	const handleGoBack = () => {
		router.history.back();
	};

	return (
		<div className="flex min-h-[50vh] items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<div className="flex items-center gap-2">
						<Shield className="h-6 w-6 text-destructive" />
						<CardTitle>访问被拒绝</CardTitle>
					</div>
					<CardDescription>您没有权限访问此资源</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-md bg-muted p-3">
						<p className="text-muted-foreground text-sm">{error.message}</p>
					</div>

					{error.details && (
						<div className="rounded-md border border-border p-3">
							<p className="text-muted-foreground text-sm">
								<span className="font-semibold">所需权限：</span>
								{error.details.requiredRole && (
									<span>角色: {error.details.requiredRole}</span>
								)}
								{error.details.requiredPermission && (
									<span>
										{error.details.requiredPermission.resource}:{" "}
										{error.details.requiredPermission.actions.join(", ")}
									</span>
								)}
							</p>
						</div>
					)}

					<div className="rounded-md bg-blue-50 p-3 dark:bg-blue-950">
						<div className="flex items-start gap-2">
							<AlertCircle className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
							<div className="text-sm">
								<p className="font-medium text-blue-900 dark:text-blue-100">
									需要帮助？
								</p>
								<p className="mt-1 text-blue-700 dark:text-blue-300">
									如果您认为这是一个错误，请联系组织管理员或系统管理员。
								</p>
							</div>
						</div>
					</div>
				</CardContent>
				<CardFooter className="flex gap-2">
					<Button variant="outline" onClick={handleGoBack} className="flex-1">
						返回上一页
					</Button>
					<Button onClick={handleGoHome} className="flex-1">
						<Home className="mr-2 h-4 w-4" />
						返回首页
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
