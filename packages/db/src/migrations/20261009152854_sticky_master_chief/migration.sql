DROP INDEX "member_organization_id_user_id_idx";--> statement-breakpoint
DROP INDEX "organization_role_organization_id_idx";--> statement-breakpoint
DROP INDEX "team_member_team_id_user_id_idx";--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_role" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "organization_role" ADD COLUMN "is_system_role" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "invitation_organization_id_status_idx" ON "invitation" ("organization_id","status");--> statement-breakpoint
CREATE INDEX "invitation_inviter_id_idx" ON "invitation" ("inviter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_organization_id_user_id_unique" ON "member" ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "member" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_role_organization_id_role_unique" ON "organization_role" ("organization_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "team_member_team_id_user_id_unique" ON "team_member" ("team_id","user_id");--> statement-breakpoint
CREATE INDEX "team_member_user_id_idx" ON "team_member" ("user_id");