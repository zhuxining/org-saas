import { Button } from "@org-sass/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@org-sass/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MapPin } from "lucide-react";

export const Route = createFileRoute("/(public)/about/")({
	component: AboutPage,
});

function AboutPage() {
	return (
		<section className="container mx-auto px-4 py-20">
			<div className="mb-12 text-center">
				<h1 className="mb-4 font-bold text-4xl md:text-5xl">About Us</h1>
				<p className="text-lg text-muted-foreground">
					Building tools that help organizations thrive
				</p>
			</div>

			<div className="mx-auto max-w-4xl space-y-8">
				<Card>
					<CardHeader>
						<CardTitle>Our Mission</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground leading-relaxed">
							We believe that effective collaboration is the key to success in
							today's fast-paced world. Our platform is designed to simplify how
							organizations manage their teams, members, and resources. We're
							committed to providing intuitive tools that empower teams to work
							together seamlessly, regardless of their size or complexity.
						</p>
					</CardContent>
				</Card>

				<div className="grid gap-8 md:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Our Values</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h3 className="mb-2 font-semibold">Simplicity First</h3>
								<p className="text-muted-foreground">
									Complex problems deserve simple solutions. We strive to make
									every interaction intuitive and straightforward.
								</p>
							</div>
							<div>
								<h3 className="mb-2 font-semibold">Reliability Matters</h3>
								<p className="text-muted-foreground">
									You can count on us. We build robust systems that work when
									you need them most.
								</p>
							</div>
							<div>
								<h3 className="mb-2 font-semibold">Continuous Innovation</h3>
								<p className="text-muted-foreground">
									We never stop improving. Your feedback drives our evolution,
									and we're always pushing forward.
								</p>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Contact Information</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<div>
								<h3 className="mb-3 font-semibold">Get in Touch</h3>
								<p className="mb-4 text-muted-foreground">
									Have questions or want to learn more? We'd love to hear from
									you.
								</p>
								<div className="space-y-3">
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
											<Mail className="h-5 w-5 text-primary" />
										</div>
										<div>
											<p className="font-medium text-sm">Email</p>
											<p className="text-muted-foreground text-sm">
												support@example.com
											</p>
										</div>
									</div>
									<div className="flex items-center gap-3">
										<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
											<MapPin className="h-5 w-5 text-primary" />
										</div>
										<div>
											<p className="font-medium text-sm">Location</p>
											<p className="text-muted-foreground text-sm">
												San Francisco, CA
											</p>
										</div>
									</div>
								</div>
							</div>
							<div>
								<h3 className="mb-3 font-semibold">Business Hours</h3>
								<div className="space-y-2 text-muted-foreground">
									<div className="flex justify-between">
										<span>Monday - Friday</span>
										<span>9:00 AM - 6:00 PM</span>
									</div>
									<div className="flex justify-between">
										<span>Saturday - Sunday</span>
										<span>Closed</span>
									</div>
								</div>
							</div>
							<div>
								<h3 className="mb-3 font-semibold">Social Media</h3>
								<div className="flex gap-3">
									<Link
										to="/"
										className="rounded-md bg-muted px-4 py-2 text-sm hover:bg-muted/80"
									>
										Twitter
									</Link>
									<Link
										to="/"
										className="rounded-md bg-muted px-4 py-2 text-sm hover:bg-muted/80"
									>
										LinkedIn
									</Link>
									<Link
										to="/"
										className="rounded-md bg-muted px-4 py-2 text-sm hover:bg-muted/80"
									>
										GitHub
									</Link>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<Card className="bg-primary text-primary-foreground">
					<CardHeader>
						<CardTitle>Join Our Team</CardTitle>
					</CardHeader>
					<CardContent className="text-center">
						<p className="mb-6 text-lg">
							We're always looking for talented people to join our team and help
							us build the future of collaboration.
						</p>
						<Link to="/login" search={{ redirect: undefined }}>
							<Button size="lg" variant="secondary">
								View Open Positions
							</Button>
						</Link>
					</CardContent>
				</Card>
			</div>
		</section>
	);
}
