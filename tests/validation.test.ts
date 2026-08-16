// Verifies the centralized zod validation in lib/validation.ts.
// Run with: npm run test:validation

import assert from "node:assert";
import {
  signupSchema,
  loginSchema,
  extractTextSchema,
  libraryCreateSchema,
  libraryUpdateSchema,
  tenderStatusSchema,
  requirementStatusSchema,
  draftSchema,
} from "../lib/validation";

async function run() {
  // --- signup: email normalization + password rules ---
  const parsed = signupSchema.parse({
    email: "  Ayesha@Company.COM ",
    password: "secret123",
    fullName: "  Ayesha Raza  ",
    orgName: "Raza Engineering",
  });
  assert.strictEqual(parsed.email, "ayesha@company.com", "email should be trimmed + lowercased");

  assert.throws(
    () => signupSchema.parse({ email: "a@b.com", password: "short" }),
    /8 characters/,
    "short password should be rejected"
  );
  assert.throws(() => signupSchema.parse({ email: "not-an-email", password: "longenough" }));

  // --- login ---
  const login = loginSchema.parse({ email: " Me@X.io ", password: "p" });
  assert.strictEqual(login.email, "me@x.io");

  // --- extract text ---
  assert.throws(() => extractTextSchema.parse({ text: "too short" }), /too short/);
  extractTextSchema.parse({ text: "a".repeat(100) }); // ok

  // --- library create ---
  const lib = libraryCreateSchema.parse({
    title: "  Warranty Terms  ",
    body: "Three-year comprehensive warranty.",
    tags: ["a", "b"],
  });
  assert.strictEqual(lib.title, "Warranty Terms");
  assert.strictEqual(lib.category, "administrative", "category should default to administrative");
  assert.deepStrictEqual(lib.tags, ["a", "b"]);

  // An explicit invalid category is still rejected (defaults only apply to missing values).
  assert.throws(() =>
    libraryCreateSchema.parse({ title: "x", body: "y", category: "nonsense" })
  );

  // --- library update: partial + must contain something ---
  const upd = libraryUpdateSchema.parse({ title: "New title" });
  assert.strictEqual(upd.title, "New title");
  assert.throws(() => libraryUpdateSchema.parse({ title: "   " }));

  // --- statuses ---
  tenderStatusSchema.parse({ status: "won" });
  assert.throws(() => tenderStatusSchema.parse({ status: "nope" }));
  requirementStatusSchema.parse({ status: "answered" });
  assert.throws(() => requirementStatusSchema.parse({ status: "nope" }));

  // --- draft ---
  draftSchema.parse({
    id: "00000000-0000-0000-0000-000000000000",
    requirement_text: "Provide bid security.",
  });
  assert.throws(
    () => draftSchema.parse({ id: "", requirement_text: "x" }),
    /Requirement id is required/
  );

  console.log("PASS — validation schemas behave correctly (email normalization, password rules, defaulting, status enums).");
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
