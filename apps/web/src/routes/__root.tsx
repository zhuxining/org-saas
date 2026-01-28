import { TanStackDevtools } from "@tanstack/react-devtools";
import { FormDevtoolsPanel } from "@tanstack/react-form-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "next-themes";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/sonner";
import type { orpc } from "@/utils/orpc";
import appCss from "../index.css?url";

export interface RouterAppContext {
	orpc: typeof orpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "My App",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	errorComponent: ({ error, reset }) => (
		<ErrorBoundary error={error} reset={reset} />
	),
	component: RootDocument,
});

function RootDocument() {
	return (
		<html lang="zh" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
					<div className="min-h-screen">
						<Outlet />
					</div>
					<Toaster richColors />
					<TanStackDevtools
						plugins={[
							{
								name: "TanStack Query",
								render: <ReactQueryDevtoolsPanel />,
							},
							{
								name: "TanStack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							{
								name: "TanStack Form",
								render: <FormDevtoolsPanel />,
							},
						]}
					/>
				</ThemeProvider>
				<Scripts />
			</body>
		</html>
	);
}
