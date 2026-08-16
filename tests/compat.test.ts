// Verifies lib/db/compat.ts: the app's synchronous query API (.get/.all/.run)
// must work against an async (Postgres) query builder.
// Run with: npm run test:compat
import assert from "node:assert";
import { compatDb } from "../lib/db/compat";

/** Builds a mock async drizzle builder that resolves to `executor()`. */
function makeBuilder(executor: () => unknown) {
  const q = {
    then(onF?: (v: unknown) => unknown, onR?: (e: unknown) => unknown) {
      return Promise.resolve().then(executor).then(onF, onR);
    },
    from: (_t?: unknown) => q,
    values: (_v?: unknown) => q,
    set: (_s?: unknown) => q,
    where: (_w?: unknown) => q,
    onConflictDoUpdate: (_u?: unknown) => q,
    // compat methods are attached by compatDb at runtime; typed as `any` here
    // so the test calls below are accepted by the compiler.
    get: null as unknown,
    all: null as unknown,
    run: null as unknown,
  };
  return q;
}

const mockDb = {
  select: () => makeBuilder(() => [{ id: "1", name: "a" }, { id: "2", name: "b" }]),
  insert: () => makeBuilder(() => ({ rowCount: 1, command: "INSERT" })),
  update: () => makeBuilder(() => ({ rowCount: 1, command: "UPDATE" })),
  delete: () => makeBuilder(() => ({ rowCount: 2, command: "DELETE" })),
  plain: () => 42,
};

async function run() {
  const db = compatDb(mockDb) as any;

  // .all() returns the rows array.
  const rows = await db.select().from("t").where({}).all();
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].id, "1");

  // .get() returns the first row.
  const first = await db.select().from("t").get();
  assert.strictEqual(first.name, "a");

  // .run() returns { changes } after a chained insert+onConflictDoUpdate.
  const insert = await db.insert().values({}).onConflictDoUpdate({}).run();
  assert.strictEqual(insert.changes, 1);

  // update/delete also report changes.
  assert.strictEqual((await db.update().set({}).where({}).run()).changes, 1);
  assert.strictEqual((await db.delete().where({}).run()).changes, 2);

  // Non-query methods pass through untouched.
  assert.strictEqual(db.plain(), 42);

  console.log("PASS — compat layer exposes .get/.all/.run on async builders, threads through chains, and passes plain values through.");
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
