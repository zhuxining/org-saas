import { Badge } from "@org-saas/ui/components/badge";
import { Button } from "@org-saas/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@org-saas/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

export const Route = createFileRoute("/_public/pricing/")({
  head: () => ({
    meta: [
      { title: "Pricing | Org SaaS" },
      {
        name: "description",
        content:
          "Pricing and plan limits have not been set. Explore the organization tools available today.",
      },
    ],
  }),
  component: PricingPage,
});

const capabilities = [
  {
    title: "Membership and roles",
    description: "Manage organization access with clear membership and role controls.",
    details: [
      "Invite and manage organization members",
      "Use owner, admin, and member roles",
      "Create custom roles within granted permissions",
    ],
  },
  {
    title: "Team collaboration",
    description: "Group organization members into teams and manage team membership.",
    details: [
      "Create and update teams",
      "Manage team membership",
      "Keep teams within their organization workspace",
    ],
  },
  {
    title: "Audit history",
    description: "Review organization activity and understand important changes.",
    details: [
      "Review organization audit events",
      "Access follows organization audit permissions",
      "Audit records follow a 180-day retention policy",
    ],
  },
];

function PricingPage() {
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            Pricing status
          </Badge>
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">Pricing and plans are not set yet</h1>
          <p className="text-muted-foreground text-lg">
            Explore the organization tools available today. Prices and plan limits have not been
            set.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {capabilities.map(({ title, description, details }) => (
            <Card key={title} className="h-full">
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3 text-sm">
                  {details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2">
                      <Check aria-hidden="true" className="text-primary mt-0.5 size-4 shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-muted/30 mt-12 rounded-xl border p-8 text-center">
          <h2 className="mb-3 text-2xl font-semibold">Explore Org SaaS</h2>
          <p className="text-muted-foreground mx-auto mb-6 max-w-2xl">
            Prices, usage limits, billing terms, and support commitments have not been set. Create
            an account to explore the organization workspace.
          </p>
          <Link to="/login" search={{ redirect: undefined }}>
            <Button size="lg">Get started</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
