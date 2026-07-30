import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@org-sass/ui/components/sheet";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";

import { UserMenu } from "./user-menu";

export default function Header() {
  const links = [
    { to: "/", label: "Home" },
    { to: "/pricing", label: "Pricing" },
    { to: "/about", label: "About" },
  ] as const;

  return (
    <header className="border-border bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Desktop Navigation */}
        <div className="hidden items-center gap-6 md:flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">ORG SAAS</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-foreground/60 hover:text-foreground/80 transition-colors"
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
            <SheetTrigger className="hover:text-accent-foreground focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md px-0 py-2 text-base font-medium whitespace-nowrap transition-colors hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50">
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
                    className="text-muted-foreground hover:text-foreground transition-colors"
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
