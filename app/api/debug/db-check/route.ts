import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";

export const runtime = "nodejs";

// TEMPORARY diagnostic — remove after confirming production DB config.
// Reports ONLY: DATABASE_URL presence, prefix validity, and connectability.
// NEVER prints the URL, password, host, or any secret.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const required = process.env.DB_CHECK_TOKEN;
  if (required && token !== required) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.DATABASE_URL ?? "";
  const result: {
    exists: boolean;
    prefixOk: boolean;
    connected: boolean;
    error?: string;
  } = {
    exists: Boolean(url),
    prefixOk: Boolean(url) && /^postgres(s)?:\/\//i.test(url),
    connected: false,
  };

  if (!url) {
    result.error = "DATABASE_URL is not set in this environment";
    return NextResponse.json(result);
  }

  let sql: postgres.Sql | null = null;
  try {
    sql = postgres(url, { max: 1, connect_timeout: 5 });
    await sql`select 1`; // lightweight liveness probe
    result.connected = true;
  } catch (e) {
    result.connected = false;
    const msg = e instanceof Error ? e.message : String(e ?? "connection error");
    // Keep the message generic; do not echo the connection string.
    result.error = msg.slice(0, 240);
  } finally {
    try {
      if (sql) await sql.end();
    } catch {}
  }

  return NextResponse.json(result);
}