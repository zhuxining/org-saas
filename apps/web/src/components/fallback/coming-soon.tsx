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
import { Home, Rocket } from "lucide-react";

interface ComingSoonPageProps {
	/**
	 * 预计上线时间
	 */
	estimatedDate?: string;
	/**
	 * 功能描述
	 */
	description?: string;
}

export function ComingSoonPage({
	estimatedDate,
	description = "此功能正在开发中，敬请期待",
}: ComingSoonPageProps = {}) {
	const router = useRouter();

	const handleGoHome = () => {
		router.navigate({ to: "/" });
	};

	return (
		<div className="flex min-h-[50vh] items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<div className="flex items-center gap-2">
						<Rocket className="h-6 w-6 text-blue-600 dark:text-blue-400" />
						<CardTitle>即将上线</CardTitle>
					</div>
					<CardDescription>{description}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="rounded-md bg-muted p-3">
						<p className="text-muted-foreground text-sm">
							我们正在努力开发这个功能，预计很快就会与您见面。
							{estimatedDate && (
								<span>
									预计上线时间：
									<span className="font-semibold">{estimatedDate}</span>
								</span>
							)}
						</p>
					</div>
				</CardContent>
				<CardFooter>
					<Button onClick={handleGoHome} className="w-full">
						<Home className="mr-2 h-4 w-4" />
						返回首页
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
