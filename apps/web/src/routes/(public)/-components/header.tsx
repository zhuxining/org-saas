import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";

import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import UserMenu from "../../../components/user-menu";

export default function Header() {
	const links = [{ to: "/", label: "Home" }] as const;

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container flex h-14 items-center justify-between px-4">
				{/* Desktop Navigation */}
				<div className="hidden items-center gap-6 md:flex">
					<Link to="/" className="mr-6 flex items-center space-x-2">
						<span className="hidden font-bold sm:inline-block">ORG SAAS</span>
					</Link>
					<nav className="flex items-center space-x-6 font-medium text-sm">
						{links.map(({ to, label }) => (
							<Link
								key={to}
								to={to}
								className="text-foreground/60 transition-colors hover:text-foreground/80"
								activeProps={{ className: "text-foreground" }}
							>
								{label}
							</Link>
						))}
					</nav>
				</div>

				{/* Mobile Navigation */}
				<div className="flex items-center md:hidden">
					<Sheet>
						<SheetTrigger className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-0 py-2 font-medium text-base transition-colors hover:bg-transparent hover:text-accent-foreground focus-visible:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50">
							<Menu className="h-6 w-6" />
							<span className="sr-only">Toggle Menu</span>
						</SheetTrigger>
						<SheetContent side="left" className="pr-0">
							<SheetHeader className="px-1">
								<SheetTitle className="text-left">
									<Link to="/" className="flex items-center">
										<span className="font-bold">ORG SAAS</span>
									</Link>
								</SheetTitle>
							</SheetHeader>
							<div className="mt-4 flex flex-col space-y-3 px-1">
								{links.map(({ to, label }) => (
									<Link
										key={to}
										to={to}
										className="text-muted-foreground transition-colors hover:text-foreground"
										activeProps={{ className: "text-foreground font-medium" }}
									>
										{label}
									</Link>
								))}
							</div>
						</SheetContent>
					</Sheet>
					<span className="ml-4 font-bold md:hidden">ORG SAAS</span>
				</div>

				<div className="flex items-center gap-2">
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
