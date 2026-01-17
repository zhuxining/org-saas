import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { organization, user } from "./auth";

export const post = pgTable(
	"post",
	{
		id: text("id").primaryKey(),
		title: text("title").notNull(),
		slug: text("slug").notNull(),
		content: text("content").notNull(),
		excerpt: text("excerpt"),
		coverImage: text("cover_image"),
		status: text("status").notNull().default("draft"),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		authorId: text("author_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		publishedAt: timestamp("published_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("post_organization_id_idx").on(table.organizationId),
		index("post_author_id_idx").on(table.authorId),
		index("post_status_idx").on(table.status),
		index("post_slug_idx").on(table.slug),
	],
);

export const postRelations = relations(post, ({ one }) => ({
	organization: one(organization, {
		fields: [post.organizationId],
		references: [organization.id],
	}),
	author: one(user, {
		fields: [post.authorId],
		references: [user.id],
	}),
}));
