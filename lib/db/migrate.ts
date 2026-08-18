import fs from "node:fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

// Standalone entry point for applying Postgres migrations without starting the
// app — run it in a deploy pipeline (`npm run db:migrate`) or locally before
// `npm run dev`. Serverless platforms intentionally do NOT auto-migrate on
// boot (cold starts would race on the migration lock table), so apply the SQL
// under lib/db/migrations-pg once against your Supabase project first.

// Load .env.local (like drizzle.config.ts) so DATABASE_URL works without
// shell-level exports. Real env vars take precedence.
const envPath = ".env.local";
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

async function main() {
  const connectionUrl = process.env.DATABASE_URL;
  if (!connectionUrl) {
    console.error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and paste in " +
        "your Supabase connection string before running migrations."
    );
    process.exit(1);
  }

  const client = postgres(connectionUrl, { max: 1 });
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "./lib/db/migrations-pg" });
  await client.end();
  console.log("✓ Migrations applied to Postgres");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
