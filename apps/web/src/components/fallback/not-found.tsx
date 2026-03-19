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
import { AlertCircle, Home, SearchX } from "lucide-react";

export function NotFoundPage() {
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
						<SearchX className="h-6 w-6 text-destructive" />
						<CardTitle>页面不存在</CardTitle>
					</div>
					<CardDescription>您访问的页面不存在或已被删除</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-md bg-blue-50 p-3 dark:bg-blue-950">
						<div className="flex items-start gap-2">
							<AlertCircle className="mt-0.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
							<div className="text-sm">
								<p className="font-medium text-blue-900 dark:text-blue-100">
									需要帮助？
								</p>
								<p className="mt-1 text-blue-700 dark:text-blue-300">
									请检查您输入的 URL 是否正确，或联系系统管理员。
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
