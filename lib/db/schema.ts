import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Portability note: this targets SQLite for zero-config local dev. Every
// column here was deliberately chosen to also exist on Postgres (no
// SQLite-only tricks), so moving to Supabase later is a column-type mapping
// exercise, not a redesign. See README "Moving to Postgres" for the exact
// mapping (sqliteTable -> pgTable, integer/timestamp -> timestamp, text/json
// -> jsonb, real -> numeric).

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  planTier: text("plan_tier").notNull().default("free"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name"),
  role: text("role").notNull().default("owner"), // owner/admin/bid_manager/contributor/reviewer
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const tenders = sqliteTable("tenders", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  title: text("title").notNull(),
  issuingBody: text("issuing_body"),
  submissionDeadline: text("submission_deadline"), // free-form on purpose — extracted deadlines are often relative ("14 days from publication"), not ISO dates
  status: text("status").notNull().default("in_progress"), // identified/in_progress/submitted/won/lost
  rawText: text("raw_text"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const requirements = sqliteTable("requirements", {
  id: text("id").primaryKey(),
  tenderId: text("tender_id")
    .notNull()
    .references(() => tenders.id),
  category: text("category").notNull(),
  requirementText: text("requirement_text").notNull(),
  sourcePage: integer("source_page"),
  sourceSnippet: text("source_snippet").notNull(),
  isMandatory: integer("is_mandatory", { mode: "boolean" }).notNull().default(true),
  evaluationWeight: real("evaluation_weight"),
  status: text("status").notNull().default("not_started"),
  keywords: text("keywords", { mode: "json" }).$type<string[]>(),
});

export const contentLibraryItems = sqliteTable("content_library_items", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const draftAnswers = sqliteTable("draft_answers", {
  id: text("id").primaryKey(),
  requirementId: text("requirement_id")
    .notNull()
    .unique()
    .references(() => requirements.id),
  content: text("content").notNull(),
  contentGap: integer("content_gap", { mode: "boolean" }).notNull().default(false),
  sourceContentIds: text("source_content_ids", { mode: "json" }).$type<string[]>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const mfaStates = sqliteTable("mfa_states", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  secret: text("secret").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
