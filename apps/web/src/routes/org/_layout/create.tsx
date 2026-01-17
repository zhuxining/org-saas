import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/org/_layout/create")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [formData, setFormData] = useState({
		name: "",
		slug: "",
		logo: "",
	});

	const createOrg = useMutation({
		mutationFn: async (data: { name: string; slug: string; logo?: string }) => {
			return orpc.org.organization.createOrganization(data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries(
				orpc.org.organization.listOrganizations.queryKey(),
			);
			toast.success("Organization created successfully");
			navigate({ to: "/org" });
		},
		onError: (error) => {
			toast.error(`Failed to create organization: ${error.message}`);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		createOrg.mutate({
			name: formData.name,
			slug: formData.slug,
			logo: formData.logo || undefined,
		});
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-bold text-2xl">Create Organization</h2>
				<p className="text-muted-foreground text-sm">
					Create a new organization to collaborate with others
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Organization Details</CardTitle>
					<CardDescription>
						Enter the details for your new organization
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Organization Name *</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								placeholder="My Organization"
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="slug">Slug *</Label>
							<Input
								id="slug"
								value={formData.slug}
								onChange={(e) =>
									setFormData({ ...formData, slug: e.target.value })
								}
								placeholder="my-organization"
								pattern="[a-z0-9-]+"
								required
							/>
							<p className="text-muted-foreground text-xs">
								Lowercase letters, numbers, and hyphens only
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="logo">Logo URL (optional)</Label>
							<Input
								id="logo"
								type="url"
								value={formData.logo}
								onChange={(e) =>
									setFormData({ ...formData, logo: e.target.value })
								}
								placeholder="https://example.com/logo.png"
							/>
						</div>

						<div className="flex gap-2">
							<Button type="submit" disabled={createOrg.isPending}>
								{createOrg.isPending ? "Creating..." : "Create Organization"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate({ to: "/org" })}
							>
								Cancel
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
