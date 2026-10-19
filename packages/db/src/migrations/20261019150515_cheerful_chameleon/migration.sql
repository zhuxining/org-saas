CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY,
	"scope" text NOT NULL,
	"organization_id" text,
	"actor_id" text NOT NULL,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"summary" jsonb DEFAULT '{}' NOT NULL,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "audit_log_scope_occurred_at_idx" ON "audit_log" ("scope","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_log_organization_occurred_at_idx" ON "audit_log" ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_log_actor_occurred_at_idx" ON "audit_log" ("actor_id","occurred_at");--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organization_id_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE RESTRICT;