# Bidently

> **The AI compliance matrix for bid, tender & RFP teams.** Upload the solicitation document — Bidently extracts every requirement at clause level, and drafts a grounded first-response answer for each one, cited back to source. No missed checkboxes. No invented claims.

[![CI](https://img.shields.io/github/actions/workflow/status/MuhammadBilal561/Bidently/ci.yml?branch=main&label=CI&logo=github)](https://github.com/MuhammadBilal561/Bidently/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/MuhammadBilal561/Bidently)](LICENSE)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2016-000000?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

---

## The problem

A bid, tender, or RFP is a long, inconsistent document. Eligibility rules,
technical minimums, submission deadlines, and formatting demands are scattered
across dozens of clauses — and **every missed line item can disqualify a
technically excellent proposal**. Reading a 200-clause solicitation manually
takes a bid team three to five days, and even then, people miss things.

## What Bidently does

Bidently turns that document into a structured **compliance matrix**: every
requirement, eligibility rule, and checkpoint extracted at clause level and
traceable to the exact source text. It then drafts a compliant first-response
answer for each requirement — grounded in **your own content library and the
source material, never invented** — so a human can verify every claim in
minutes instead of writing answers from scratch.

### How it works

1. **Upload** — Drop a PDF or paste the tender text. PPRA standard documents,
   World Bank RFPs, or a plain solicitation; it doesn't need a standard template.
2. **Extract** — Every checkable requirement becomes a row in a compliance
   matrix, categorized, flagged mandatory/optional, and quoted with its exact
   source text.
3. **Draft** — Answers are drafted only from your content library and cited
   back to it. A submission never sounds confident about something it can't prove.

## Who it's for

Teams that bid regularly but don't have an enterprise proposal function:
consultancies, contractors, and agencies responding to government and
international solicitations. Runs fully end-to-end with zero configuration.

## Why Bidently

- **No missed checkboxes.** Every checkable requirement becomes a tracked row
  with a source quote — the compliance matrix is the deliverable, not a summary.
- **Grounded, not generated.** Draft answers cite the content-library item and
  source snippet they were built from, so a human can verify every claim.
- **Zero-config to start.** Sign up, upload a tender, extract. Works in mock
  mode until you add a free Gemini key — real AI, the same pipeline.
- **Runs where your data lives.** Postgres / Supabase end-to-end via
  `DATABASE_URL` — no local file storage, no vendor lock-in.
- **Small-team friendly.** Multi-member orgs, roles, and per-organization
  content libraries — no seat licensing or enterprise sales motion required.

## Quick start

```bash
npm install
cp .env.example .env.local    # set DATABASE_URL (Supabase) + AUTH_SECRET
npm run db:migrate            # apply schema to Postgres once
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Sign up with any email/password and try one of the bundled sample tenders (a
PPRA-style Pakistan procurement and a World Bank RFP) — no API key needed.

> **Try real AI:** set `GEMINI_API_KEY` in `.env` (free at
> [aistudio.google.com/apikey](https://aistudio.google.com/apikey)). The same
> pipeline runs mock → real; only the extraction source changes.

## Features

| Feature | Status | How to activate |
|---|---|---|
| Structured requirement extraction | Built | Add `GEMINI_API_KEY` for real AI; mock otherwise |
| Grounded draft generation | Built | Add `GEMINI_API_KEY` for real AI; mock otherwise |
| Compliance matrix + CSV / Markdown exports | Built | Built-in |
| Per-organization content library | Built | Built-in |
| Multi-member orgs & roles | Built | Built-in |
| Two-factor authentication (TOTP) | Built | Team tab → Two-factor authentication |
| Google OAuth sign-in | Built | Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` |
| Analytics dashboard | Built | Built-in |
| Large-document chunking & dedupe | Built | Automatic above ~18,000 chars |
| Postgres / Supabase | Built | Set `DATABASE_URL` + run `npm run db:migrate` |

## Project structure

```
app/
  api/          API routes (auth, extract, draft, tender, library, analytics)
  (app)/        Authenticated dashboard and workspace
  page.tsx      Public landing gate
components/
  landing/      Landing page sections (hero, proof, how-it-works, trust, footer)
  *.tsx         Dashboard, auth, workspace, panels
lib/
  db/           Drizzle ORM schema, Postgres client, migrations
  auth.ts       Password hashing, session JWT, MFA tokens
  gemini.ts     Extraction engine (structured JSON, chunked, with mock fallback)
  draft.ts      Grounded draft generation with embedding similarity
  embeddings.ts Gemini embeddings
  validation.ts, retry.ts, content-library.ts, api-client.ts, types.ts
```

## Available scripts

```bash
npm run dev          # local dev server
npm run build        # production build
npm run test:unit    # all 7 test suites
npm run db:migrate   # apply Postgres migrations (lib/db/migrations-pg)
npm run db:studio    # Drizzle Studio browser
```

## Configuration

Reference `.env.example` for the full set of required and optional variables.

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | No | Real AI extraction & drafting; mock mode without it |
| `GEMINI_MODEL` | No | Defaults to `gemini-2.5-flash` (~250 req/day free tier); use `gemini-2.5-flash-lite` for higher quota (1000+ req/day) |
| `AUTH_SECRET` | Before deploy | Signs session cookies; generate with `openssl rand -base64 32` |
| `DATABASE_URL` | Required before deploy | Supabase/Postgres connection string (pooler URL for serverless) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | For OAuth | Enables "Continue with Google" |
| `OAUTH_REDIRECT_URI` | For OAuth | OAuth callback URL (defaults to localhost:3000 in dev) |
| `APP_URL` | Before deploy | Base URL for redirects (e.g., `https://your-app.vercel.app`) |

## Architecture decisions

- **Postgres / Supabase (production)** — the app connects through `DATABASE_URL`
  (use the Pooler/Transaction string for serverless deploys). Local dev uses the
  same Postgres database, so there's no schema drift between environments. Apply
  migrations with `npm run db:migrate`; see `docs/OWNER_GUIDE.md` for setup.
- **Drizzle ORM over Prisma** — pure TypeScript with no binary query engine.
- **Hand-rolled auth** (bcryptjs + jose) — works offline; swappable with Supabase
  Auth or Auth.js.
- **Mock fallback** — the full pipeline runs with zero keys, so the app is
  explorable before any account or API setup.

## Documentation

- `docs/OWNER_GUIDE.md` — step-by-step activation (AI keys, OAuth, Postgres, deploy)
- `docs/AGENT_INSTRUCTIONS.md` — engineering instructions and roadmap
- `docs/BLUEPRINT.md` — original product blueprint
- `SECURITY.md` — vulnerability reporting and security best practices

## Contributing

Contributions are welcome! Please:
- Fork the repository and create a feature branch
- Follow the existing code style and conventions
- Add tests for new functionality
- Ensure `npm run test:unit`, `npx tsc --noEmit`, and `npm run build` pass
- Submit a pull request with a clear description of changes

## Security

Please report security vulnerabilities responsibly. See [SECURITY.md](SECURITY.md) for details.

**Important:** Never commit real API keys, passwords, database URLs, or other secrets to this repository.

## License

[MIT](LICENSE)
