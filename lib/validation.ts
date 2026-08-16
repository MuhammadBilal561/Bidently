import { z } from "zod";

/**
 * Centralized request validation with zod. Every API route parses its input
 * through one of these schemas so malformed or oversized payloads are rejected
 * up front with a clear 400 instead of being half-trusted by downstream code.
 *
 * Emails are normalized (trimmed + lowercased) here so the DB unique constraint
 * on `users.email` behaves identically for "A@B.com" and "a@b.com".
 */

export const CATEGORIES = ["technical", "financial", "legal", "administrative"] as const;
export type Category = (typeof CATEGORIES)[number];

export const TENDER_STATUSES = ["identified", "in_progress", "submitted", "won", "lost"] as const;

export const REQUIREMENT_STATUSES = ["not_started", "in_progress", "answered", "reviewed"] as const;

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
  fullName: z.string().trim().max(120).optional().nullable(),
  orgName: z.string().trim().max(120).optional().nullable(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.").max(128),
});

export const extractTextSchema = z.object({
  text: z.string().min(20, "That document is too short to extract from.").max(1_000_000),
});

export const draftSchema = z.object({
  id: z.string().min(1, "Requirement id is required."),
  requirement_text: z.string().trim().min(1, "Requirement text is required."),
  category: z.enum(CATEGORIES).optional(),
  source_snippet: z.string().optional(),
  source_page: z.number().int().nullable().optional(),
  is_mandatory: z.boolean().optional(),
  evaluation_weight: z.number().nullable().optional(),
  keywords: z.array(z.string()).optional(),
});

export const libraryCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  body: z.string().trim().min(1, "Body is required.").max(50_000),
  category: z.enum(CATEGORIES).default("administrative"),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
});

export const libraryUpdateSchema = libraryCreateSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "Nothing to update." }
);

export const tenderStatusSchema = z.object({
  status: z.enum(TENDER_STATUSES),
});

export const requirementStatusSchema = z.object({
  status: z.enum(REQUIREMENT_STATUSES),
});

// A member is a user row in the same organization. Owner promotion is reserved
// for the signup flow / explicit owner-only actions, so the assignable set
// here excludes "owner" — you can't self-escalate via the members API.
const assignableRole = z.enum(["admin", "bid_manager", "contributor", "reviewer"]);

export const memberCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
  fullName: z.string().trim().max(120).optional().nullable(),
  role: assignableRole.default("contributor"),
});

export const memberUpdateSchema = z
  .object({
    role: assignableRole.optional(),
    password: z.string().min(8, "Password must be at least 8 characters.").max(128).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update." });

export const mfaCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

/** UUID route params (all our PKs are crypto.randomUUID()). */
export const idParamSchema = z.object({ id: z.string().uuid("Invalid id.") });
