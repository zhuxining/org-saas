import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { ErrorBoundary, Loader, NotFoundPage } from "@/components/fallback";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import { orpc, queryClient } from "./utils/orpc";

export const getRouter = () => {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		context: { orpc, queryClient },
		defaultPendingComponent: () => <Loader />,
		defaultNotFoundComponent: () => <NotFoundPage />,
		defaultErrorComponent: ({ error }) => <ErrorBoundary error={error} />,
		Wrap: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	});
	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
