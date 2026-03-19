import { Badge } from "@org-sass/ui/components/badge";
import { Button } from "@org-sass/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@org-sass/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

export const Route = createFileRoute("/(public)/pricing/")({
	component: PricingPage,
});

function PricingPage() {
	return (
		<section className="container mx-auto px-4 py-20">
			<div className="mb-12 text-center">
				<h1 className="mb-4 font-bold text-4xl md:text-5xl">
					Simple, Transparent Pricing
				</h1>
				<p className="text-lg text-muted-foreground">
					Choose the plan that fits your needs
				</p>
			</div>

			<div className="grid gap-8 md:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Free</CardTitle>
						<CardDescription>Perfect for getting started</CardDescription>
						<div className="mt-4">
							<span className="font-bold text-4xl">$0</span>
							<span className="text-muted-foreground">/month</span>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<ul className="space-y-3">
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-green-600" />
								<span>Basic features</span>
							</li>
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-green-600" />
								<span>Email support</span>
							</li>
						</ul>
						<Link
							to="/login"
							search={{ redirect: undefined }}
							className="mt-6 block"
						>
							<Button className="w-full" variant="outline">
								Get Started
							</Button>
						</Link>
					</CardContent>
				</Card>

				<Card className="border-primary shadow-lg">
					<CardHeader>
						<div className="flex items-center justify-between">
							<CardTitle>Pro</CardTitle>
							<Badge>Popular</Badge>
						</div>
						<CardDescription>For power users</CardDescription>
						<div className="mt-4">
							<span className="font-bold text-4xl">$29</span>
							<span className="text-muted-foreground">/month</span>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<ul className="space-y-3">
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-green-600" />
								<span>Advanced features</span>
							</li>
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-green-600" />
								<span>Priority support</span>
							</li>
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-green-600" />
								<span>Custom branding</span>
							</li>
						</ul>
						<Link
							to="/login"
							search={{ redirect: undefined }}
							className="mt-6 block"
						>
							<Button className="w-full">Get Started</Button>
						</Link>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Enterprise</CardTitle>
						<CardDescription>For large scale needs</CardDescription>
						<div className="mt-4">
							<span className="font-bold text-4xl">$99</span>
							<span className="text-muted-foreground">/month</span>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<ul className="space-y-3">
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-green-600" />
								<span>Advanced analytics</span>
							</li>
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-green-600" />
								<span>24/7 dedicated support</span>
							</li>
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-green-600" />
								<span>Custom integrations</span>
							</li>
							<li className="flex items-center gap-2">
								<Check className="h-4 w-4 text-green-600" />
								<span>SLA guarantee</span>
							</li>
						</ul>
						<Link
							to="/login"
							search={{ redirect: undefined }}
							className="mt-6 block"
						>
							<Button className="w-full" variant="outline">
								Contact Sales
							</Button>
						</Link>
					</CardContent>
				</Card>
			</div>

			<div className="mt-16 text-center">
				<h2 className="mb-4 font-semibold text-2xl">Need a custom plan?</h2>
				<p className="mb-6 text-muted-foreground">
					Contact us for enterprise solutions tailored to your needs
				</p>
				<Link to="/login" search={{ redirect: undefined }}>
					<Button size="lg">Contact Us</Button>
				</Link>
			</div>
		</section>
	);
}
