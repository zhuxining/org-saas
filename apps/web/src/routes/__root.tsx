import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { App as AntdApp, ConfigProvider, Layout, theme } from "antd";
import { useEffect, useState } from "react";
import Loader from "@/components/loader";
import type { orpc } from "@/utils/orpc";
import Header from "../components/header";
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

	component: RootDocument,
});

function RootDocument() {
	const isFetching = useRouterState({ select: (s) => s.isLoading });
	const [themeMode, setThemeMode] = useState<"light" | "dark">(() => {
		if (typeof window === "undefined") {
			return "dark";
		}
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	});

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		const handleChange = (matches: boolean) => {
			setThemeMode(matches ? "dark" : "light");
		};
		const listener = (event: MediaQueryListEvent) =>
			handleChange(event.matches);
		const legacyListener = (event: MediaQueryList | MediaQueryListEvent) =>
			handleChange("matches" in event ? event.matches : mediaQuery.matches);

		handleChange(mediaQuery.matches);
		if (typeof mediaQuery.addEventListener === "function") {
			mediaQuery.addEventListener("change", listener);
			return () => mediaQuery.removeEventListener("change", listener);
		}
		mediaQuery.addListener(legacyListener);
		return () => mediaQuery.removeListener(legacyListener);
	}, []);

	const { darkAlgorithm, defaultAlgorithm } = theme;
	const palette =
		themeMode === "dark"
			? { background: "#0f172a", text: "#f8fafc" }
			: { background: "#f8fafc", text: "#0f172a" };

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body
				style={{
					minHeight: "100vh",
					margin: 0,
					backgroundColor: palette.background,
					color: palette.text,
				}}
			>
				<ConfigProvider
					theme={{
						algorithm: themeMode === "dark" ? darkAlgorithm : defaultAlgorithm,
						token: {
							colorBgBase: palette.background,
							colorTextBase: palette.text,
						},
						components: {
							Layout: {
								colorBgBody: "transparent",
							},
						},
					}}
				>
					<AntdApp>
						<Layout style={{ minHeight: "100vh", background: "transparent" }}>
							<Header />
							<Layout.Content style={{ padding: 24 }}>
								{isFetching ? <Loader /> : <Outlet />}
							</Layout.Content>
						</Layout>
						<TanStackRouterDevtools position="bottom-left" />
						<ReactQueryDevtools
							position="bottom"
							buttonPosition="bottom-right"
						/>
					</AntdApp>
				</ConfigProvider>
				<Scripts />
			</body>
		</html>
	);
}
