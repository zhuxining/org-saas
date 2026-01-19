import { Link } from "@tanstack/react-router";

export default function Footer() {
	return (
		<footer className="border-t bg-background">
			<div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row md:py-8">
				<div className="text-center text-muted-foreground text-sm md:text-left">
					© {new Date().getFullYear()} Org SaaS. All rights reserved.
				</div>
				<nav className="flex gap-4 font-medium text-muted-foreground text-sm">
					<Link
						to="/"
						className="transition-colors hover:text-foreground hover:underline"
					>
						Terms
					</Link>
					<Link
						to="/"
						className="transition-colors hover:text-foreground hover:underline"
					>
						Privacy
					</Link>
					<Link
						to="/"
						className="transition-colors hover:text-foreground hover:underline"
					>
						Contact
					</Link>
				</nav>
			</div>
		</footer>
	);
}
