import { useRouter } from "@tanstack/react-router";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

interface ErrorBoundaryProps {
	error: Error;
	reset: () => void;
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
	const router = useRouter();

	const handleReset = () => {
		reset();
		router.invalidate();
	};

	const handleGoHome = () => {
		router.navigate({ to: "/" });
	};

	return (
		<div className="flex min-h-[50vh] items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<div className="flex items-center gap-2">
						<AlertCircle className="h-6 w-6 text-destructive" />
						<CardTitle>出错了</CardTitle>
					</div>
					<CardDescription>
						应用遇到了一个意外错误。请尝试刷新页面或返回首页。
					</CardDescription>
				</CardHeader>
				<CardContent>
					{error && (
						<div className="rounded-md bg-muted p-3">
							<p className="wrap-break-word text-muted-foreground text-sm">
								{error.message || "未知错误"}
							</p>
						</div>
					)}
				</CardContent>
				<CardFooter className="flex gap-2">
					<Button variant="outline" onClick={handleGoHome} className="flex-1">
						<Home className="mr-2 h-4 w-4" />
						返回首页
					</Button>
					<Button onClick={handleReset} className="flex-1">
						<RefreshCw className="mr-2 h-4 w-4" />
						刷新页面
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
