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

export const Route = createFileRoute("/_public/about/")({
  head: () => ({
    meta: [
      { title: "About | Org SaaS" },
      {
        name: "description",
        content:
          "Learn how Org SaaS organizes organization membership, roles, teams, and audit history.",
      },
    ],
  }),
  component: AboutPage,
});

const capabilities = [
  {
    title: "Membership and roles",
    description:
      "Invite members and manage organization access with owner, admin, member, and custom roles.",
    details: [
      "Manage organization members and invitations",
      "Use owner, admin, and member roles",
      "Create custom roles within granted permissions",
    ],
  },
  {
    title: "Team collaboration",
    description: "Organize members into teams while keeping access scoped to each organization.",
    details: [
      "Create and update teams",
      "Manage team membership",
      "Teams do not grant permissions by themselves",
    ],
  },
  {
    title: "Audit history",
    description:
      "Review organization activity with permission-aware access and a 180-day retention policy.",
    details: [
      "Review organization audit events",
      "Access follows organization audit permissions",
      "Audit records follow a 180-day retention policy",
    ],
  },
];

function AboutPage() {
  return (
    <section className="container mx-auto px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <header className="mx-auto mb-12 max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4">
            Org SaaS
          </Badge>
          <h1 className="mb-4 text-4xl font-bold md:text-5xl">
            Organization workspaces with clear access
          </h1>
          <p className="text-muted-foreground text-lg">
            Org SaaS helps organizations manage members, roles, teams, and activity from one shared
            workspace.
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
            Create an account to explore the organization workspace. Pricing and plan limits have
            not been set.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/login" search={{ redirect: undefined }}>
              <Button size="lg">Get started</Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline">
                View pricing status
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
