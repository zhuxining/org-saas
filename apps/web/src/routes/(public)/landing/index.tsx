import { Button } from "@org-sass/ui/components/button";
import { Card, CardContent } from "@org-sass/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lock, Zap } from "lucide-react";

export const Route = createFileRoute("/(public)/landing/")({
	component: LandingPage,
});

function LandingPage() {
	return (
		<>
			<section className="container mx-auto px-4 py-20 md:py-32">
				<div className="mx-auto max-w-3xl text-center">
					<h1 className="mb-6 font-bold text-4xl tracking-tight md:text-6xl">
						Build Your Projects with
						<br className="hidden md:inline" />
						<span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
							Modern Tools
						</span>
					</h1>
					<p className="mb-8 text-lg text-muted-foreground md:text-xl">
						A powerful platform for managing your personal projects. Built for
						developers who need efficiency and simplicity.
					</p>
					<div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
						<Link to="/login" search={{ redirect: undefined }}>
							<Button size="lg" className="text-base">
								Sign Up Now
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						</Link>
						<Link to="/about">
							<Button size="lg" variant="outline" className="text-base">
								Learn More
							</Button>
						</Link>
					</div>
				</div>
			</section>

			<section className="container mx-auto px-4 py-16">
				<div className="mb-12 text-center">
					<h2 className="mb-4 font-bold text-3xl md:text-4xl">
						Powered for Growth
					</h2>
					<p className="text-lg text-muted-foreground">
						Everything you need to manage your projects
					</p>
				</div>

				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					<Card>
						<CardContent className="flex flex-col items-start space-y-2 p-6">
							<div className="mb-4 rounded-lg bg-orange-100 p-3 dark:bg-orange-900">
								<Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
							</div>
							<h3 className="font-semibold text-xl">Lightning Fast</h3>
							<p className="text-muted-foreground">
								Built on modern tech stack for optimal performance and instant
								response times
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardContent className="flex flex-col items-start space-y-2 p-6">
							<div className="mb-4 rounded-lg bg-red-100 p-3 dark:bg-red-900">
								<Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
							</div>
							<h3 className="font-semibold text-xl">Secure by Design</h3>
							<p className="text-muted-foreground">
								Enterprise-grade security with encrypted data and secure
								authentication
							</p>
						</CardContent>
					</Card>
				</div>
			</section>

			<section className="bg-muted/50">
				<div className="container mx-auto px-4 py-16 text-center">
					<h2 className="mb-4 font-bold text-3xl md:text-4xl">
						Ready to Get Started?
					</h2>
					<p className="mb-8 text-lg text-muted-foreground">
						Join thousands of users already using our platform
					</p>
					<Link to="/login" search={{ redirect: undefined }}>
						<Button size="lg" className="text-lg">
							Start Your Free Trial
							<ArrowRight className="ml-2 h-5 w-5" />
						</Button>
					</Link>
				</div>
			</section>
		</>
	);
}
