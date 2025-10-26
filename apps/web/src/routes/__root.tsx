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
import { App as AntdApp, ConfigProvider, theme } from "antd";
import { useEffect, useMemo, useState } from "react";
import Loader from "@/components/loader";
import type { orpc } from "@/utils/orpc";
import ProLayout from "../components/pro-layout";
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

		handleChange(mediaQuery.matches);
		mediaQuery.addEventListener("change", listener);
		return () => mediaQuery.removeEventListener("change", listener);
	}, []);

	const { darkAlgorithm, defaultAlgorithm } = theme;
	const palette =
		themeMode === "dark"
			? { background: "#0f172a", text: "#f8fafc" }
			: { background: "#f8fafc", text: "#0f172a" };

	const gradientBackground = useMemo(
		() =>
			themeMode === "dark"
				? "radial-gradient(circle at top left, rgba(30, 64, 175, 0.35), transparent 55%), radial-gradient(circle at bottom right, rgba(14, 165, 233, 0.25), transparent 45%)"
				: "radial-gradient(circle at top left, rgba(59, 130, 246, 0.2), transparent 55%), radial-gradient(circle at bottom right, rgba(45, 212, 191, 0.15), transparent 45%)",
		[themeMode],
	);

	const pathname = useRouterState({
		select: (state) => state.location?.pathname ?? "/",
	});
	const isAuthRoute = pathname.startsWith("/login");

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
						{isAuthRoute ? (
							<div
								style={{
									minHeight: "100vh",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									padding: 32,
									backgroundImage: gradientBackground,
									backgroundRepeat: "no-repeat",
									backgroundSize: "cover",
								}}
							>
								<div
									style={{
										width: "100%",
										maxWidth: 420,
										background:
											themeMode === "dark"
												? "rgba(15, 23, 42, 0.85)"
												: "rgba(255, 255, 255, 0.92)",
										borderRadius: 24,
										padding: 32,
										boxShadow: "0 40px 80px rgba(15, 23, 42, 0.25)",
										border: "1px solid rgba(148, 163, 184, 0.2)",
										backdropFilter: "blur(18px)",
									}}
								>
									{isFetching ? <Loader /> : <Outlet />}
								</div>
							</div>
						) : (
							<ProLayout isLoading={isFetching}>
								<Outlet />
							</ProLayout>
						)}
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
