# Bidently — Engineering Instructions & Roadmap

Engineering orientation for developers working on Bidently: what is built, what is
deliberately not built, and where the remaining work lives.

## Task list

1. **Extraction** — parse bid/tender/RFP documents into structured, clause-level
   requirements (`lib/gemini.ts`, `app/api/extract/`).
2. **Grounded drafting** — generate a compliant first-draft answer for each
   requirement, grounded in the company content library and source material
   (`lib/draft.ts`, `lib/embeddings.ts`, `app/api/draft/`).
3. **Tender & requirement lifecycle** — status tracking, compliance matrix, exports.
4. **Content library** — per-organization, versioned store of past proposals,
   certifications, and case studies, seeded on signup.
5. **Multi-member orgs & roles** — owner/admin manage teammates, roles, and access.
6. **Two-factor authentication (TOTP)** — RFC 6238, dependency-free.
7. **Google OAuth** — "Continue with Google" sign-in.
8. **Analytics** — win rate, requirement/draft coverage, and pipeline funnels.
9. **Resilience** — jittered exponential backoff and retry on transient provider
   errors for every Gemini call.

## What's built

Everything in the task list is implemented and persisted. The eight unit suites in
`tests/` (chunking, chunk-aware dedupe, validation, auth, totp, authz, retry,
compat) run under `npm run test:unit`. The app runs end-to-end with zero
configuration: extraction and drafting fall back to a mock provider when no
`GEMINI_API_KEY` is present, and persistence uses an auto-migrating local SQLite
database.

## What's real vs. what's a next step

**Wired, persisted, and covered by automated tests:**

- Signup / login / logout / sessions (bcrypt-hashed passwords, signed cookies)
- Multi-tenant data isolation — every query scoped to the signed-in `orgId`
- Tenders, requirements, and draft answers persisting across sessions
- Structured extraction with source-grounded snippets and a zero-config mock mode
- Chunking (>18,000-character documents), chunk-aware merge and dedupe
- Semantic matching (Gemini embeddings + cosine similarity) for draft generation
- Content-library CRUD, tender/requirement lifecycle, CSV and Markdown exports
- Roles & multi-member orgs with centralized authorization gates
- TOTP MFA and Google OAuth
- Retry with exponential backoff on all Gemini calls

**Built but not verified against a live external service:**

- The chunk/merge/dedupe *mechanism* is tested with a mocked API. A real large
  document has not yet been run against the live Gemini API — see §5.
- The Postgres client (`lib/db/index.pg.ts`) and generated migration SQL have
  never been executed against a real database. Verify against a Supabase project
  before trusting in production — see `docs/OWNER_GUIDE.md` Phase E.

## Architecture rationale

- **SQLite (local) / Postgres (production)** — the schema deliberately avoids
  SQLite-only or Postgres-only constructs (JSON columns instead of native arrays,
  `real` instead of `decimal`) so the move to Postgres is a column-type mapping
  exercise, not a redesign. Everything above the database layer only imports `db`
  and the schema objects.
- **Drizzle ORM over Prisma** — Drizzle is pure TypeScript with no binary query
  engine, so the persistence layer can be built and verified without a
  network-dependent install step. It supports Postgres with the same query API.
- **Hand-rolled auth (bcryptjs + jose)** — small and fully auditable; everything
  else depends only on `getSession()` returning `{userId, orgId, email, role}`, so
  it is swappable for Supabase Auth or Auth.js without touching the rest of the app.
- **Mock fallback** — the app is fully explorable with zero accounts or keys;
  representative extraction data stands in for the provider until a key is added.

## Complete, honest list of what's not built

- No live end-to-end verification of the chunking pipeline against a real,
  large tender document with the production Gemini model.
- No live execution of the Postgres client or migration SQL against a real
  Postgres/Supabase instance.
- No billing, quotas, or multi-plan tiering (monetization is future work).
- No email delivery (invitations, notifications, password reset) — roles and
  member management exist, but there is no mailer.
- No mobile app or dedicated API SDK; the app is a web-only Next.js application.
- No CI/CD pipeline in the repository yet beyond the local verification loop.

## §5 — Manual verification checklist (against a live deployment)

Run this checklist against the real deployment before trusting it in production:

1. Sign up a fresh account; confirm tenders, requirements, and drafts persist
   across a full sign-out / sign-in cycle.
2. Create a second account; confirm it cannot open the first account's tender
   (expect a 404).
3. Extract requirements from a large real document (100+ pages) with
   `GEMINI_API_KEY` set; confirm clause-level coverage and that the compliance
   matrix reflects every requirement.
4. Confirm every drafted answer cites a source snippet and the content-library
   item it was grounded in.
5. Confirm TOTP is enforced on both password and OAuth sign-in.
6. Confirm the Postgres client behaves correctly against Supabase — especially
   cross-org isolation and JSONB array round-trips.

## Branding

Name-collision and naming research lives in `docs/BRANDING_RESEARCH.md`.
