import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "./schema";
import { compatDb } from "./compat";

// Postgres client for lib/db/index.ts (activated by the Phase E swap in
// GUIDE.md: rename schema.pg.ts -> schema.ts and this file -> index.ts).
//
// IMPORTANT: the import above is "./schema" (not "./schema.pg") because the
// activation steps rename schema.pg.ts to schema.ts. A stale "./schema.pg"
// reference is exactly what breaks the build after the swap.
//
// `compatDb` wraps the client so the app's synchronous query API
// (`.get()/.all()/.run()`) works against the async postgres-js driver — see
// lib/db/compat.ts. The route handlers must `await` those calls (which they
// do) for the Postgres path to actually execute them.
//
// Not yet run against a live database — verify it against your Supabase
// project before trusting it in production (see GUIDE.md Phase E).

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and paste in " +
      "your Supabase connection string before using this database client."
  );
}

const client = postgres(process.env.DATABASE_URL, { max: 10 });
export const db = compatDb(drizzle(client, { schema }));

migrate(db, { migrationsFolder: "./lib/db/migrations-pg" }).catch((err) => {
  console.error("Postgres migration failed on boot:", err);
});


