/**
 * Compatibility layer that lets the app's SQLite-style query API work against
 * the async postgres-js client.
 *
 * The app's route handlers were written for Drizzle's better-sqlite3 driver,
 * which is synchronous: `db.select()...get()`, `db.select()...all()`,
 * `db.insert()...run()`. The postgres-js driver is async: the same builders are
 * promises (awaiting a SELECT yields the rows; awaiting an INSERT yields
 * `{ rowCount, rows, command }`) and expose NO `.get()/.all()/.run()`.
 *
 * `compatDb()` wraps the Postgres drizzle client in a proxy that:
 *   - attaches `.get()`, `.all()`, `.run()` to every async query builder
 *     (`.get()` -> first row, `.all()` -> rows array, `.run()` -> `{ changes }`),
 *   - threads the wrap through the whole chain (`.insert().values().onConflictDoUpdate().run()`),
 *   - leaves the raw client untouched otherwise.
 *
 * Applied ONLY by `lib/db/index.pg.ts`. The SQLite client (`lib/db/index.ts`)
 * is already synchronous and is NOT wrapped.
 */

const compatMarker = Symbol("bidently-db-compat");

type Thenable = PromiseLike<unknown>;

function isThenable(value: unknown): value is Thenable {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function attachCompat(q: Thenable): void {
  (q as unknown as Record<PropertyKey, unknown>).get = () =>
    Promise.resolve(q).then((rows) => (Array.isArray(rows) ? rows[0] : rows));
  (q as unknown as Record<PropertyKey, unknown>).all = () =>
    Promise.resolve(q).then((rows) =>
      Array.isArray(rows) ? rows : rows === undefined ? [] : [rows]
    );
  (q as unknown as Record<PropertyKey, unknown>).run = () =>
    Promise.resolve(q).then((result) => {
      const r = result as { rowCount?: number } | null | undefined;
      return { changes: r?.rowCount ?? 0, lastInsertRowid: 0 };
    });
}

function wrap<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if ((value as unknown as Record<PropertyKey, unknown>)[compatMarker]) return value;

  // Async query builder (Postgres): attach compat methods, then proxy it so
  // every chained call (`.values()`, `.set()`, `.where()`, ...) also threads
  // through `wrap`.
  if (isThenable(value)) {
    attachCompat(value);
    (value as unknown as Record<PropertyKey, unknown>)[compatMarker] = true;
    return new Proxy(value, {
      get(target, prop, receiver) {
        const v = Reflect.get(target, prop, receiver);
        if (typeof v === "function") {
          return (...args: unknown[]) => wrap(v.apply(target, args));
        }
        return v;
      },
    }) as T;
  }

  // Plain object / function: proxy method results through `wrap` so a chain
  // starting at a non-query method (e.g. `db.insert(...)`) stays compatible.
  if (typeof value === "object" || typeof value === "function") {
    return new Proxy(value, {
      get(target, prop, receiver) {
        const v = Reflect.get(target, prop, receiver);
        if (typeof v === "function") {
          return (...args: unknown[]) => wrap(v.apply(target, args));
        }
        return v;
      },
    });
  }

  return value;
}

/** Wrap a Postgres drizzle client so the app's `.get()/.all()/.run()` API works. */
export function compatDb<T>(db: T): T {
  return wrap(db);
}
