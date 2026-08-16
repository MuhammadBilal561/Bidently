# Bidently

AI bid & tender compliance platform — extract every requirement, draft grounded answers, never miss a checkbox.

## What it does

Bidently reads a bid, tender, or RFP and turns it into a structured compliance matrix: every requirement, eligibility rule, and checkpoint, extracted at clause level and traceable to its source. It then drafts a compliant first-response answer for each requirement, grounded in your company's content library and the source material — never invented.

Built for teams that bid regularly but don't have an enterprise proposal function. What takes a bid team three to five days of manual reading and rewriting takes a few hours of review and polish.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000

The SQLite database auto-creates and auto-migrates on first run. Sign up with any email/password and try one of the sample tenders. Without a `GEMINI_API_KEY` the app runs in zero-config mock mode.

## Features

| Feature | Status | How to activate |
|---|---|---|
| Structured requirement extraction | Built | Add `GEMINI_API_KEY` for real AI; mock otherwise |
| Grounded draft generation | Built | Add `GEMINI_API_KEY` for real AI; mock otherwise |
| Compliance matrix + CSV/Markdown exports | Built | Built-in |
| Content library | Built | Built-in |
| Multi-member orgs & roles | Built | Built-in |
| Two-factor authentication (TOTP) | Built | Team tab → Two-factor authentication |
| Google OAuth | Built | Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` |
| Analytics dashboard | Built | Built-in |
| Postgres / Supabase | Built, unverified | See `docs/OWNER_GUIDE.md` Phase E |

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
