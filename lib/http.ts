import { NextResponse } from "next/server";

/**
 * Small, consistent HTTP response layer so every route returns the same shape:
 *   - success: the payload as JSON
 *   - failure: { error: string } with an appropriate status code
 *
 * Routes should throw `AppError` for expected failures and let the centralized
 * `toErrorResponse` turn unexpected errors into a 500. This keeps error
 * handling uniform instead of a `try/catch` with bespoke JSON per route.
 */

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** Throwable, expected application error with an HTTP status. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** Normalize any thrown value into a JSON error response. */
export function toErrorResponse(err: unknown, fallback = "Something went wrong."): NextResponse {
  if (err instanceof AppError) return fail(err.message, err.status);
  // Zod validation failures carry a readable .issues array; surface the first one.
  if (
    err &&
    typeof err === "object" &&
    "issues" in err &&
    Array.isArray((err as { issues: unknown[] }).issues)
  ) {
    const issues = (err as { issues: { message?: string }[] }).issues;
    return fail(issues[0]?.message || "Invalid request.", 400);
  }
  const message = err instanceof Error && err.message ? err.message : fallback;
  if (err instanceof Error) console.error(err);
  return fail(message, 500);
}
