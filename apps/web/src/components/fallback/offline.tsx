import { Button } from "@org-sass/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@org-sass/ui/components/card";
import { useRouter } from "@tanstack/react-router";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflinePage() {
	const router = useRouter();
	const [isOnline, setIsOnline] = useState(navigator.onLine);

	useEffect(() => {
		const handleOnline = () => {
			setIsOnline(true);
			// 网络恢复后自动刷新页面
			setTimeout(() => {
				router.invalidate();
			}, 1000);
		};

		const handleOffline = () => {
			setIsOnline(false);
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, [router]);

	const handleRefresh = () => {
		router.invalidate();
	};

	return (
		<div className="flex min-h-[50vh] items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<div className="flex items-center gap-2">
						{isOnline ? (
							<Wifi className="h-6 w-6 text-green-600 dark:text-green-400" />
						) : (
							<WifiOff className="h-6 w-6 text-destructive" />
						)}
						<CardTitle>{isOnline ? "网络已恢复" : "网络连接断开"}</CardTitle>
					</div>
					<CardDescription>
						{isOnline ? "正在重新加载..." : "请检查您的网络连接后重试"}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isOnline ? (
						<div className="flex items-center justify-center py-4">
							<RefreshCw className="h-6 w-6 animate-spin text-green-600 dark:text-green-400" />
							<span className="ml-2 text-muted-foreground">
								正在恢复连接...
							</span>
						</div>
					) : (
						<div className="rounded-md bg-muted p-3">
							<p className="text-muted-foreground text-sm">
								您似乎已断开网络连接。请检查您的网络设置或稍后再试。
							</p>
						</div>
					)}
				</CardContent>
				{!isOnline && (
					<CardFooter>
						<Button onClick={handleRefresh} className="w-full">
							<RefreshCw className="mr-2 h-4 w-4" />
							重新连接
						</Button>
					</CardFooter>
				)}
			</Card>
		</div>
	);
}
