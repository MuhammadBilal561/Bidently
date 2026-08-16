# Bidently — Starter

A working local product, not a mockup: real auth, real per-organization
data isolation, and real persistence on top of the two features that
actually sell it (extraction and grounded drafting). Built and tested
against a live server, not just compiled.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. The database auto-creates and auto-migrates on
first run — there's no separate setup step to forget. Sign up (any email/
password, 10 seconds, stored only in your own local `data/bidently.db`),
then try one of the two sample tenders and hit **Extract requirements**.
Everything you do is actually saved: close the tab, come back, sign in
again, your tenders are still there.

> **Want the full app (Gemini, Google OAuth, Postgres, deployment) activated?**
> Read **`GUIDE.md`** — a step-by-step owner's guide. Everything is already
> built; those steps provide the *accounts, keys, and hosting* that only you
> can create.

## Turn on real AI extraction

1. Get a free key at https://aistudio.google.com/apikey (no card required).
2. Copy `.env.example` to `.env.local` and paste it in as `GEMINI_API_KEY`.
3. Restart `npm run dev`. Extraction and draft generation now run through
   Gemini's real structured-output and embedding APIs instead of the mock.

Check https://ai.google.dev/gemini-api/docs/models for the current free-tier
model name before deploying; `GEMINI_MODEL` in `.env.example` may need
updating by the time you read this.

## What changed since Phase 1/2, and why

The blueprint originally specified Prisma + Supabase Postgres for
everything. Two real constraints changed that, and it's worth knowing why
so nothing here reads as arbitrary:

- **Prisma → Drizzle ORM.** Prisma needs to download a query-engine binary
  at install/generate time. In the sandbox this was built in, that download
  was network-blocked, which meant Prisma code could be *written* but never
  actually *run or tested* there. Drizzle is pure TypeScript with no binary
  engine, so the entire persistence layer could be built and verified for
  real instead of shipped on faith. It's equally legitimate for production
  and, like Prisma, supports Postgres with the same query API.
- **Supabase Postgres (prod) → SQLite (local dev).** Zero external accounts
  needed to develop against — `npm install && npm run dev` and you have a
  real database. The schema was deliberately written to avoid SQLite-only
  or Postgres-only tricks (JSON columns instead of native arrays, `real`
  instead of `decimal`) specifically so the move to Postgres is a column-
  type mapping exercise, not a redesign. See "Moving to Postgres" below.
- **Supabase Auth → hand-rolled sessions (bcryptjs + jose).** This needed to
  work today, fully tested, with zero external signup. It's a small, fully
  auditable amount of code (`lib/auth.ts`, `lib/session.ts`) rather than a
  framework whose exact current API surface couldn't be verified against
  this specific Next.js version. It's swappable for Supabase Auth or
  Auth.js later without touching the rest of the app, since everything
  else only depends on `getSession()` returning `{userId, orgId, email,
  role}`.

## What's real vs. what's still a next step

**Wired, persisted, and tested against a live server in this session
(not just compiled):**
- Signup / login / logout / session — bcrypt-hashed passwords, signed
  session cookies, verified: wrong password rejected (401), duplicate
  email rejected (409), session correctly cleared on logout
- Multi-tenant data isolation — every query is scoped to the signed-in
  user's `orgId`; verified with an actual cross-org test: a second
  organization requesting the first org's tender by ID gets a clean 404,
  not the data
- Tenders, requirements, and draft answers all persist to a real SQLite
  database and survive a full logout → login cycle (tested, not assumed)
- Each new organization gets its own seeded content library on signup
- Structured AI extraction grounded to a source snippet for every
  requirement, with a zero-config mock mode
- Large documents (>18,000 characters) auto-split into overlapping chunks,
  extracted per-chunk, and merged with deduplication — the extraction
  prompt was also rewritten to explicitly demand exhaustive, clause-level
  output instead of a short summary. The chunk/merge/dedupe *mechanism* is
  covered by a real test (`npm run test:chunking`, currently passing) using
  a mocked API — it has **not** been run against the real Gemini API on a
  real large document yet; see `AGENT_INSTRUCTIONS.md` §5 for that step.
- Real semantic matching (Gemini embeddings + cosine similarity, not
  keyword search) for draft generation, also with a zero-config mock mode
- One real bug caught and fixed during this pass: the mock-mode draft
  matcher was keyed to placeholder ids that no longer exist once every
  requirement gets a real database id on save. It now matches on content
  instead — worth knowing if you extend the mock data yourself.
- A second, subtler limitation found while testing the chunking dedup
  logic is now **fixed**: the old dedupe matched on exact text alone, so two
  genuinely distinct requirements sharing identical wording in distant
  sections would be incorrectly collapsed. Dedupe is now chunk-aware — it only
  collapses a duplicate that comes from the same or an overlapping (adjacent)
  chunk, so a real repeated clause in two far-apart sections is preserved.
  Covered by `npm run test:dedupe`.
- All API routes validate their input through centralized zod schemas
  (`lib/validation.ts`) with standardized JSON error responses
  (`lib/http.ts`); emails are normalized (trimmed/lowercased) at the boundary.
  The extraction `maxOutputTokens` cap was raised from 8192 to 32768 to avoid
  truncating large extractions.

**Built in this pass (everything originally deferred):**
- **Content-library management UI** — add, edit, and delete items from the
  "Content library" tab. Backed by new `PATCH`/`DELETE /api/library/:id`
  routes, all org-scoped.
- **Tender & requirement lifecycle** — change a tender's status
  (`identified → in_progress → submitted → won/lost`), track individual
  requirement status (`not_started/in_progress/answered/reviewed`), and
  delete a tender with its dependents. Org ownership is enforced on every
  mutation (`PATCH /api/tenders/:id`, `PATCH /api/requirements/:id`).
- **Analytics dashboard + opportunity pipeline** — a live "Analytics" tab
  with win rate, requirement coverage, draft coverage, and pipeline/status
  funnels, computed by `GET /api/analytics`.
- **Exports** — each tender's compliance matrix exports to CSV and the bid
  package (drafts + sources) to Markdown.
- **Roles & multi-member orgs** — owner/admin can add teammates, change their
  roles, disable accounts, and rotate passwords (`/api/org/members/*`).
  A centralized `lib/authz.ts` enforces role gates on every sensitive route.
- **Two-factor authentication (TOTP)** — dependency-free RFC 6238
  implementation (`lib/totp.ts`), with setup/enable/disable and a required
  code on password and OAuth sign-in.
- **Google OAuth** — "Continue with Google" (fully implemented; it appears
  automatically once `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set).
- **Automated tests** — `npm run test:unit` runs eight real suites
  (chunking, chunk-aware dedupe, validation, auth, totp, authz, retry, compat).
- **Resilience** — all Gemini calls (extraction, embeddings, drafting) retry
  transient `429`/`5xx` responses with jittered exponential backoff
  (`lib/retry.ts`), so momentary provider overload doesn't fail an upload.

**The only remaining steps require YOUR accounts/keys** — they're fully built,
but you must activate them with your own credentials and services. Everything
you need, step by step, is in **`GUIDE.md`**: local run, Gemini key, MFA,
Google OAuth, Postgres/Supabase, and Vercel deployment. The short version:
- **AI works now** with a free Gemini key (`GEMINI_API_KEY`); without one the
  app runs in mock mode.
- **MFA** needs nothing from you — set it up in the Team tab.
- **Deployment / OAuth / Postgres** need your accounts — follow `GUIDE.md`.

## Moving to Postgres (for deployment)

**Already written** — `lib/db/schema.pg.ts`, `lib/db/index.pg.ts`,
`drizzle.config.pg.ts`, `lib/db/migrations-pg/` — not just documented as a
future mapping. The generated migration SQL was checked by hand and reads
as correct Postgres DDL. **It has never been run against a real database**
(this build environment couldn't install Postgres to test it live) — that's
the single most important thing to verify before trusting it, and
`GUIDE.md` Phase E for the exact activation steps — run
against your real Supabase project before trusting it.
have a Supabase project ready to connect.

The mapping between the two schemas, for reference:

| SQLite (`lib/db/schema.ts`) | Postgres (`lib/db/schema.pg.ts`) |
|---|---|
| `integer(..., {mode:'timestamp'})` | `timestamp()` |
| `integer(..., {mode:'boolean'})` | `boolean()` |
| `text(..., {mode:'json'})` | `jsonb()` |
| `real()` | `numeric()` or `real()` |
| `text('id').primaryKey()` (app-generated UUID) | same |

Everything above the database layer — every API route, every component —
only ever imports `db` and the schema objects, so it's unaware of which
database it's actually talking to.

## Project layout

```
app/
  page.tsx                    Top-level: auth gate, dashboard/tender routing
  api/auth/{signup,login,logout,me}/route.ts   Session management
  api/extract/route.ts        File/text -> structured requirements (persisted)
  api/draft/route.ts          Requirement -> grounded draft (persisted)
  api/tenders/route.ts        List the signed-in org's tenders
  api/tenders/[id]/route.ts   One tender + its requirements + drafts
  api/library/route.ts        List / add content-library items
components/
  auth-screen.tsx              Login/signup form
  top-bar.tsx                  Signed-in header
  tender-list.tsx               Dashboard: saved tenders
  tender-workspace.tsx          Upload/sample panel + compliance matrix + drafts
lib/
  auth.ts, session.ts           Password hashing, signed cookies, session helpers
  db/schema.ts, db/index.ts     Drizzle schema + auto-migrating SQLite client
  db/migrations/                Generated SQL migrations
  gemini.ts, embeddings.ts, draft.ts   Extraction, embeddings, grounded drafting
  content-library.ts            Day-one seed content (copied per-org at signup)
  api-client.ts                 Typed fetch wrappers used by every component
```

## Useful scripts

```bash
npm run db:studio     # visual browser for your local database
npm run db:generate   # regenerate migrations after a schema change
npm run db:migrate    # apply migrations without starting the app
npm run test:unit     # all unit tests (chunking, dedupe, validation, auth, totp, authz)
```

## Design system

Cool paper background, ink-navy text, a single "forge ember" accent used only
for the brand mark, the primary action, and the source-citation highlight --
not spread across the UI. Fraunces for display type, Public Sans for body
(the same typeface family the US government's own design system uses for
official forms -- a deliberate nod to the procurement-document subject matter),
IBM Plex Mono for data and citations.

## Next step

Everything product-feature-wise is built. The remaining work is **activation,
not coding**: follow `GUIDE.md` to add your Gemini key, set up Google OAuth,
point the app at Postgres/Supabase, and deploy to Vercel. Then re-run the manual
checklist in `AGENT_INSTRUCTIONS.md` §5 against the live deployment.
