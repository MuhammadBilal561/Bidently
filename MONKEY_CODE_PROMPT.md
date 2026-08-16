# Monkey Code AI — Repository Refactoring & Production Polish

> **Purpose:** Transform the Bidently-SaaS starter repository from an AI-generated prototype into a production-ready, professionally-managed codebase. All changes must pass `npx tsc --noEmit`, `npm run build`, and `npm run test:chunking` with zero errors. No backend/API/database/auth code may be modified — this is purely repository hygiene, documentation, structure, and presentation layer polish.

## 0. Pre-flight verification

Before making any changes, confirm the baseline:

```bash
npm install
npx tsc --noEmit && npm run build && npm run test:chunking
```

All three must pass. If any fails in your environment, note the error and resolve it at the system level first (e.g., clear `.next`, reinstall `node_modules`, fix a corrupted lockfile) — do not paper over it with code hacks.

## 1. Remove all investigation/debug artifacts

These files were generated during development/debugging and should **never** appear in a public or shared repository. Delete them from the working tree, `git rm` them from tracking, and ensure they are covered by `.gitignore`.

**Delete from git and add `*.txt` and `*.log` to .gitignore:**
- `build-output.txt`, `build-output2.txt`, `build-output3.txt`, `build-output4.txt`
- `caniuse-check.txt`, `caniuse-data.txt`, `caniuse-fresh-install.log`, `caniuse-install.log`, `caniuse-rebuild.log`, `caniuse-reinstall.log`, `caniuse-state.txt`, `caniuse-unpacker.txt`, `caniuse-verify.txt`, `caniuse-verify2.txt`
- `debug.log`
- `diag.txt`
- `drizzle-force-install.log`, `drizzle-reinstall.log`, `drizzle-utils-check.txt`, `drizzle-utils-check2.txt`, `drizzle-utils-check3.txt`
- `install-scripts.txt`
- `next-bin-check.txt`, `next-bin-check2.txt`, `next-bin-check3.txt`, `next-bin-check4.txt`, `next-bin.txt`, `next-clean-install.log`, `next-dir.txt`, `next-dist.txt`, `next-install.log`, `next-install2.log`, `next-state.txt`
- `npm-install.log`, `npm-verbose.log`
- `test-output.txt`
- `tsc-output.txt`
- `node-procs.txt`
- `tsconfig.tsbuildinfo`

**Delete from git (git rm) — no replacement needed:**
- `CLAUDE.md` — contains only `@AGENTS.md`, a Claude-code-specific directive. Remove entirely.
- `AGENTS.md` — contains a generic Next.js warning block. Either remove or replace with a concise, project-specific version.

## 2. Reorganize documentation into `docs/`

Create a `docs/` directory and move these files there. Update all internal references (README, code comments) to use the new `docs/` paths.

| Current path (root) | New path |
|---|---|
| `AGENT_INSTRUCTIONS.md` | `docs/AGENT_INSTRUCTIONS.md` |
| `DESIGN_UPGRADE_PROMPT.md` | `docs/DESIGN_UPGRADE_PROMPT.md` |
| `Bidently-SaaS-Blueprint.md` | `docs/BLUEPRINT.md` |
| `GUIDE.md` | `docs/OWNER_GUIDE.md` |

**Rewrite `.gitignore`** so that `AGENT_INSTRUCTIONS.md` and `DESIGN_UPGRADE_PROMPT.md` are **no longer gitignored** — they should be tracked inside `docs/`.

## 3. Rewrite README.md as a professional project README

The current README is verbose and reads as AI-generated. Rewrite to be clean, concise, and professional — suitable as a first-touch document for any engineer, founder, or investor browsing the repo on GitHub.

**Required structure (aim for ~120 lines):**

```
# Bidently

One-line tagline: AI bid & tender compliance platform — extract every requirement, draft grounded answers, never miss a checkbox.

## What it does
- 2-3 short bullet paragraphs (max 150 words total)

## Quick start
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Features
- Table: feature | status | how to activate

## Project structure
```
app/
  api/        — API routes (auth, extract, draft, tender, library, analytics)
  (app)/      — Authenticated dashboard and workspace
  page.tsx    — Public landing gate
components/
  landing/    — Landing page sections (hero, proof, how-it-works, trust, footer)
  *.tsx       — Dashboard, auth, workspace, panels
lib/
  db/         — Drizzle ORM schema, migrations, SQLite/Postgres clients
  auth.ts     — Password hashing, session JWT, MFA tokens
  gemini.ts   — Extraction engine (structured JSON, chunked, with mock fallback)
  draft.ts    — Grounded draft generation with embedding similarity
  embeddings.ts — Gemini embeddings
  validation.ts, retry.ts, content-library.ts, api-client.ts, types.ts
```

## Available scripts
```bash
npm run dev          # local dev server
npm run build        # production build
npm run test:unit    # all 8 test suites
npm run db:studio    # SQLite browser
```

## Configuration
Reference `.env.example` for required and optional environment variables.
Key variables: `GEMINI_API_KEY` (optional, mock mode without it), `AUTH_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Architecture decisions
- **SQLite (local) / Postgres (production)** — schema is portable; see `docs/OWNER_GUIDE.md` for migration steps.
- **Drizzle ORM** — chosen over Prisma for being pure TypeScript (no binary engine).
- **Hand-rolled auth** (bcryptjs + jose) — works offline; swappable with Supabase Auth or Auth.js.
- **Mock fallback** — runs end-to-end with zero configuration.

## Documentation
- `docs/OWNER_GUIDE.md` — step-by-step activation (AI keys, OAuth, Postgres, deploy)
- `docs/AGENT_INSTRUCTIONS.md` — engineering instructions and roadmap
- `docs/BLUEPRINT.md` — original product blueprint

## License
MIT
```

**Tone guidelines:** No "AI-generated" markers, no apologetic language, no inline development-process commentary. Read like a product engineering team wrote it.

## 4. Rewrite docs/OWNER_GUIDE.md (formerly GUIDE.md)

Same technical content, but:
- Remove all inline notes about the AI build environment ("sandbox couldn't run")
- Remove references to specific debugging sessions or build errors encountered
- Keep env var descriptions, step numbers, and warnings accurate
- Polish prose to read like official documentation, not a chat transcript

## 5. Rewrite docs/AGENT_INSTRUCTIONS.md

- Keep substantive content (task list, what's built, what's not, architecture rationale)
- Remove conversational asides ("I fetched this page," "verified by Claude")
- Move the "BidForge" name-collision research to a separate `docs/BRANDING_RESEARCH.md`
- Keep the "what's real vs. next step" and "complete honest list of what's not built" sections

## 6. Add GitHub infrastructure

### 6a. CI workflow — `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - name: Install
        run: npm ci
      - name: Typecheck
        run: npx tsc --noEmit
      - name: Lint
        run: npm run lint
      - name: Test
        run: npm run test:unit
      - name: Build
        run: npm run build
```

### 6b. Pull request template — `.github/pull_request_template.md`

```markdown
## What changed

## Why

## How this was tested

## Anything the reviewer should pay special attention to
```

### 6c. Dependabot — `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

### 6d. Final `.gitignore`

```
node_modules/
.next/
out/
*.tsbuildinfo
*.log
*.txt
.env
.env.local
.env.*.local
data/*.db
data/*.db-shm
data/*.db-wal
.DS_Store
Thumbs.db
```

## 7. Polish .env.example comments

Remove inline commentary about the AI build environment and debugging sessions. Keep all env var descriptions accurate and concise.

## 8. Code comment audit

Scan all source files (`app/`, `lib/`, `components/`) and remove or rewrite:

**Remove:** comments that contain "AI-generated," "Claude verified," "sandbox couldn't run," "built in this session," or defensive hedging language.

**Remove:** excessively verbose multi-line comments explaining obvious code patterns.

**Keep:** comments that document non-obvious technical decisions:
- Drizzle-over-Prisma rationale (concise)
- SQLite-to-Postgres portability approach
- Auth swap path (Supabase Auth / Auth.js)
- pdf.js worker config in `lib/extract-text.ts`
- Retry logic in `lib/retry.ts`

**Specific files to audit:** `lib/gemini.ts` (most verbose), `lib/draft.ts`, `lib/embeddings.ts`, `components/tender-workspace.tsx`.

## 9. Design polish (non-breaking)

**Verify** existing design tokens are used consistently:
- `--paper`, `--ink`, `--ember`, `--slate` color tokens
- Framer Motion motion tokens from `lib/motion.ts`
- Shadow tokens from `app/globals.css`
- `:focus-visible` outline remains visible on all interactive elements

**Do NOT** change token values, fonts, or color palette. Only apply them consistently.

## 10. Verification checklist

```bash
# Clean install
rm -rf .next node_modules package-lock.json
npm install

# Typecheck
npx tsc --noEmit

# Lint
npm run lint

# Tests
npm run test:unit

# Build
npm run build
```

**Definition of done:**
- `git status` shows only tracked files
- No debug/investigation files in working tree
- `.github/` exists with `ci.yml`, `pull_request_template.md`, `dependabot.yml`
- `docs/` directory contains all documentation
- `README.md` reads professionally, no AI marks
- `npx tsc --noEmit` exits 0
- `npm run test:chunking` passes
- `npm run build` compiles successfully

## Explicit guardrails — DO NOT

1. Modify any file in `app/api/`
2. Modify `lib/db/`, `lib/auth.ts`, `lib/session.ts`, `lib/gemini.ts`, `lib/draft.ts`, `lib/embeddings.ts`
3. Change `package.json` (add/remove dependencies)
4. Change `.env.example` env var set or meanings (only polish comments)
5. Change Drizzle schema files
6. Change design token values in `app/globals.css`
7. Change fonts (Fraunces/Public Sans/IBM Plex Mono)
8. Rewrite test files in `tests/`
9. Squash or rewrite git history on `main`
10. Add a LICENSE or change repo visibility

## Commit cadence

1. `chore: remove debug and investigation artifacts`
2. `docs: reorganize documentation into docs/ directory`
3. `chore: add CI workflow, PR template, and Dependabot`
4. `docs: rewrite README.md with professional polish`
5. `docs: polish AGENT_INSTRUCTIONS.md and OWNER_GUIDE.md`
6. `refactor: remove AI-generated comment noise from source code`
7. `style: apply consistent design token usage across components`

Each commit must pass the verification checklist.