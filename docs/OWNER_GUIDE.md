# Bidently — Owner's Guide

This guide covers the things only you can do: accounts, keys, and deployment.
Everything described here is already built into the application; these steps
activate it, in order.

Run the automated checks at any point with:

```bash
npm run test:unit   # all unit tests
npx tsc --noEmit    # typecheck (should be silent)
```

---

## Phase A — Run it locally (5 minutes, needs a database)

1. Create a Supabase project; open **Project Settings → Database →
   Connection string**. Use the **Pooler (Transaction)** connection string for
   serverless deploys.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL` (plus an
   `AUTH_SECRET`, e.g. from `openssl rand -base64 32`).
3. Apply the schema to the database once, then start:

   ```bash
   npm install
   npm run db:migrate
   npm run dev
   ```

Open http://localhost:3000. Sign up with any email/password and try the two
sample tenders.

- Add, edit, and delete **content-library** items (Tenders → Content library tab).
- Manage **Team** members and roles, and set up **two-factor auth** for your own
  account (Team tab → "Two-factor authentication").

---

## Phase B — Turn on real AI extraction (needs your free Gemini key)

1. Get a free key (no card required): https://aistudio.google.com/apikey
2. Copy `.env.example` to `.env.local` and add your key:

   ```
   GEMINI_API_KEY=YOUR_KEY
   ```

3. Restart `npm run dev`. Extraction and draft generation now use Gemini for real.
   Without a key, the app runs in zero-config mock mode — the sample requirements
   are the mock, not a bug.

> **503 / "high demand" errors?** They are transient and the app retries them
> automatically with exponential backoff (`lib/retry.ts`). If a request still
> fails after a few tries, switch to a more stable model in `.env.local`:
>
> ```
> GEMINI_MODEL=gemini-2.0-flash
> ```
>
> Check https://ai.google.dev/gemini-api/docs/models for the current free-tier
> model names; the default `gemini-flash-latest` is an alias that occasionally
> gets busier.

Optional: `GEMINI_MODEL` (defaults to `gemini-flash-latest`) and
`GEMINI_EMBEDDING_MODEL` (defaults to `gemini-embedding-001`). Verify the current
free-tier model names at https://ai.google.dev/gemini-api/docs/models before
deploying.

---

## Phase C — Turn on two-factor authentication (no accounts needed)

1. Sign in and open the **Team** tab.
2. Under "Two-factor authentication", select **Set up**.
3. Scan the QR / `otpauth` link with Google Authenticator, Authy, or 1Password,
   enter the 6-digit code, and select **Enable**.
4. Sign-in now requires the code after your password. TOTP is computed locally
   with Node's crypto — nothing leaves your server.

---

## Phase D — Turn on "Continue with Google" (needs a Google Cloud project)

1. Go to https://console.cloud.google.com and create or select a project.
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Authorized redirect URI:
     `http://localhost:3000/api/auth/oauth/google/callback`
     (add your production URL later too, e.g.
     `https://yourapp.vercel.app/api/auth/oauth/google/callback`).
3. Copy the Client ID and Client Secret into `.env.local`:

   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   OAUTH_REDIRECT_URI=http://localhost:3000/api/auth/oauth/google/callback
   ```

   `OAUTH_REDIRECT_URI` is optional and defaults to localhost; set it to your
   production URL when deployed.
4. Restart `npm run dev`. The "Continue with Google" button now appears on the
   sign-in screen.

---

## Phase E — Database: Postgres / Supabase (active by default)

The app runs on Postgres / Supabase end-to-end — no local file storage.
`lib/db/schema.ts` is the Postgres schema, `lib/db/index.ts` connects through
`DATABASE_URL`, and migrations live in `lib/db/migrations-pg/`.

1. Create a Supabase project; open **Project Settings → Database →
   Connection string**. Use the **Pooler (Transaction)** connection string for
   serverless deploys.
2. Put it in `.env.local`:

   ```
   DATABASE_URL=postgresql://...pooler.supabase.com:6543/postgres?sslmode=require
   ```

3. Apply the migrations:

   ```bash
   npm run db:migrate
   ```

   (Or paste `lib/db/migrations-pg/*.sql` into the Supabase SQL editor.)
   Migrations are intentionally NOT auto-run on boot: serverless cold starts
   would race against each other on the migration lock table.
4. After changing the schema, regenerate a migration with:

   ```bash
   npx drizzle-kit generate --config drizzle.config.ts
   ```

   then apply it with `npm run db:migrate`.
5. Re-run the checklist in `docs/AGENT_INSTRUCTIONS.md` §5 against the real
   database — especially cross-org isolation and the JSONB array round-trip.
6. Watch for connection-pool pressure under concurrent draft generation; tune
   the pool size (`max` in `lib/db/index.ts`) if needed.

---

## Phase F — Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel → **New Project → Import** the repository.
3. Add the environment variables (Project → Settings → Environment Variables):
   `GEMINI_API_KEY`, `AUTH_SECRET` (generate one with `openssl rand -base64 32`),
   `GEMINI_MODEL`, `DATABASE_URL` (the Supabase pooler URL from Phase E), and
   optionally `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OAUTH_REDIRECT_URI`,
   `APP_URL`.
4. `APP_URL` tells the OAuth callback where to redirect; set it to your Vercel
   URL.
5. Deploy and confirm:
   - sign-up writes to Supabase,
   - a second account cannot open the first account's tender (404),
   - extraction and drafts run through the real Gemini API,
   - OAuth and MFA behave on the production URL (update the Google OAuth redirect
     URI to include the Vercel URL).

---

## Phase G — Sanity checklist after any change

```bash
npx tsc --noEmit        # typecheck
npm run test:unit       # 8 suites: chunking, dedupe, validation, auth, totp, authz, retry, compat
npm run build           # production build
```

If something breaks: read the error, fix it, and re-run the loop above until all
three are green.
