import { pgTable, text, timestamp, boolean, real, integer, jsonb } from "drizzle-orm/pg-core";

// The app's database schema, targeting Postgres/Supabase for production
// (lib/db/index.ts connects via DATABASE_URL). The route handlers and the
// migrations under lib/db/migrations-pg are generated from these tables.
// Columns use native timestamp/boolean/jsonb types, so no dialect shims are
// needed — apply migrations with `npm run db:migrate` before deploying.

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  planTier: text("plan_tier").notNull().default("free"),
  createdAt: timestamp("created_at").notNull(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name"),
  role: text("role").notNull().default("owner"),
  createdAt: timestamp("created_at").notNull(),
});

export const tenders = pgTable("tenders", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  title: text("title").notNull(),
  issuingBody: text("issuing_body"),
  submissionDeadline: text("submission_deadline"),
  status: text("status").notNull().default("in_progress"),
  rawText: text("raw_text"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull(),
});

export const requirements = pgTable("requirements", {
  id: text("id").primaryKey(),
  tenderId: text("tender_id")
    .notNull()
    .references(() => tenders.id),
  category: text("category").notNull(),
  requirementText: text("requirement_text").notNull(),
  sourcePage: integer("source_page"),
  sourceSnippet: text("source_snippet").notNull(),
  isMandatory: boolean("is_mandatory").notNull().default(true),
  evaluationWeight: real("evaluation_weight"),
  status: text("status").notNull().default("not_started"),
  keywords: jsonb("keywords").$type<string[]>(),
});

export const contentLibraryItems = pgTable("content_library_items", {
  id: text("id").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(),
  tags: jsonb("tags").$type<string[]>(),
  createdAt: timestamp("created_at").notNull(),
  // Upgrade path once you need real vector search at scale: add
  // `embedding: vector("embedding", { dimensions: 768 })` (needs the
  // pgvector extension enabled on the Supabase project first — SQL editor:
  // `create extension if not exists vector;`) and switch lib/draft.ts from
  // in-memory cosine similarity to a `<->` distance query. Not required
  // until the content library is too large for in-memory comparison to
  // stay fast — a few hundred items will not need this yet.
});

export const draftAnswers = pgTable("draft_answers", {
  id: text("id").primaryKey(),
  requirementId: text("requirement_id")
    .notNull()
    .unique()
    .references(() => requirements.id),
  content: text("content").notNull(),
  contentGap: boolean("content_gap").notNull().default(false),
  sourceContentIds: jsonb("source_content_ids").$type<string[]>(),
  createdAt: timestamp("created_at").notNull(),
});

export const mfaStates = pgTable("mfa_states", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  secret: text("secret").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull(),
});
