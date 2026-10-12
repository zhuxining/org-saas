import { Button } from "@org-saas/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@org-saas/ui/components/card";
import { useRouter } from "@tanstack/react-router";
import { AlertCircle, Home, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  error: unknown;
  reset?: () => void;
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const router = useRouter();
  const data =
    typeof error === "object" && error !== null && "data" in error ? error.data : undefined;
  const requestId =
    typeof data === "object" && data !== null && "requestId" in data ? data.requestId : undefined;

  const handleReset = () => {
    reset?.();
    void router.invalidate();
  };

  const handleGoHome = () => {
    void router.navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="text-destructive h-6 w-6" />
            <CardTitle>出错了</CardTitle>
          </div>
          <CardDescription>应用遇到了一个意外错误。请尝试刷新页面或返回首页。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-md p-3">
            <p className="text-muted-foreground text-sm">暂时无法完成请求，请稍后重试</p>
            {typeof requestId === "string" && /^[a-zA-Z0-9_-]{8,128}$/.test(requestId) && (
              <p className="text-muted-foreground mt-2 text-xs">问题编号：{requestId}</p>
            )}
          </div>
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
