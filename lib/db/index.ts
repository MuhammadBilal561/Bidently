import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// Postgres/Supabase client (see docs/OWNER_GUIDE.md Phase E). The app used a
// local SQLite file for zero-config development; on Vercel's serverless
// filesystem that file cannot be created (`ENOENT mkdir /var/task/data`), so
// production uses a Postgres database via DATABASE_URL instead.
//
// The postgres-js driver is async: route handlers `await` their query builders
// directly (no `.get()/.all()/.run()` shims) — the migrated handlers are the
// production path.
//
// Migrations are NOT auto-run here: serverless cold starts would race against
// each other on the migration lock table. Apply them explicitly in your
// deploy pipeline with `npm run db:migrate` (or `npx drizzle-kit push`).
//
// The client is created lazily: `next build` imports route modules at build
// time to collect their config, so a top-level `throw` would break the build.
// postgres-js does not connect until the first query, so without DATABASE_URL
// we hand out a Proxy that only fails when a handler actually touches `db`.

type Db = ReturnType<typeof drizzle<typeof schema>>;

let db: Db;
if (process.env.DATABASE_URL) {
  const client = postgres(process.env.DATABASE_URL, { max: 10 });
  db = drizzle(client, { schema });
} else {
  const handler: ProxyHandler<Db> = {
    get() {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example to .env.local and paste " +
          "in your Supabase connection string before using the app."
      );
    },
  };
  db = new Proxy({} as Db, handler);
}

export { db };
