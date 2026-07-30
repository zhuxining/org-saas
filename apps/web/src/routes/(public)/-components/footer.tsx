import { Link } from "@tanstack/react-router";

export default function Footer() {
  return (
    <footer className="border-border bg-background border-t">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 md:flex-row md:py-8">
        <div className="text-muted-foreground text-center text-sm md:text-left">
          © {new Date().getFullYear()} Org SaaS. All rights reserved.
        </div>
        <nav className="text-muted-foreground flex gap-4 text-sm font-medium">
          <Link to="/" className="hover:text-foreground transition-colors hover:underline">
            Home
          </Link>
          <Link to="/pricing" className="hover:text-foreground transition-colors hover:underline">
            Pricing
          </Link>
          <Link to="/about" className="hover:text-foreground transition-colors hover:underline">
            About
          </Link>
          <Link to="/" className="hover:text-foreground transition-colors hover:underline">
            Terms
          </Link>
          <Link to="/" className="hover:text-foreground transition-colors hover:underline">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
