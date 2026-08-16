// A real test, not a claim of one. Run with: npm run test:chunking
//
// Mocks global.fetch so this needs no real GEMINI_API_KEY — it verifies the
// chunking/merge/dedupe *mechanism* in lib/gemini.ts is correct. It does NOT
// prove a real Gemini call on a real 100-page tender will produce a great
// result — that still needs a live key and a real document. See
// AGENT_INSTRUCTIONS.md section on manual verification for that step.

process.env.GEMINI_API_KEY = "test-fake-key-for-mocked-fetch-only";

import assert from "node:assert";

let fetchCallCount = 0;

global.fetch = (async (_url: string, init: RequestInit) => {
  fetchCallCount++;
  const callIndex = fetchCallCount; // capture before any await — genuinely unique per call
  const body = JSON.parse(init.body as string);
  const chunkText: string = body.contents[0].parts[0].text;

  const requirements: Record<string, unknown>[] = [];

  // This requirement is deliberately placed so it lands inside the overlap
  // window between chunk 1 and chunk 2 (see buildSyntheticDocument below) —
  // it SHOULD appear in both raw chunk results, and dedupeRequirements()
  // is what's supposed to collapse it back down to one.
  if (chunkText.includes("CLAUSE-OVERLAP-MARKER")) {
    requirements.push({
      requirement_text: "The overlap requirement that appears in two chunks.",
      category: "administrative",
      source_snippet: "CLAUSE-OVERLAP-MARKER",
      is_mandatory: true,
    });
  }

  // One unique requirement per chunk, keyed to call order (NOT chunk length —
  // two chunks can legitimately share a length, which is what broke the
  // first version of this test; see the note below the test results).
  requirements.push({
    requirement_text: `Unique requirement from chunk call #${callIndex}`,
    category: "technical",
    source_snippet: chunkText.slice(0, 15),
    is_mandatory: true,
  });

  const responseText = JSON.stringify({
    document_title: chunkText.includes("TITLE-MARKER") ? "Synthetic Large Tender" : "",
    issuing_body: chunkText.includes("TITLE-MARKER") ? "Test Ministry" : null,
    requirements,
  });

  return {
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text: responseText }] } }] }),
  } as unknown as Response;
}) as typeof fetch;

/**
 * Builds a document > CHUNK_THRESHOLD (18,000 chars) with a title marker at
 * the very start (chunk 1 only) and an overlap marker placed to land inside
 * the chunk1/chunk2 overlap window (positions ~13,200-14,000, given
 * CHUNK_SIZE=14,000 and CHUNK_OVERLAP=800 in lib/gemini.ts).
 */
function buildSyntheticDocument(): string {
  const prefix = "TITLE-MARKER-HERE ";
  const padding = "A".repeat(13_500); // pushes the next marker to ~13,519
  const overlapZone = " CLAUSE-OVERLAP-MARKER sits at a chunk boundary on purpose. ";
  const tail = "B".repeat(20_000); // guarantees a 3rd chunk
  return prefix + padding + overlapZone + tail;
}

async function run() {
  const { extractRequirements } = await import("../lib/gemini");

  const doc = buildSyntheticDocument();
  assert.ok(doc.length > 18_000, "Test document must exceed the chunk threshold");

  const result = await extractRequirements(doc);

  assert.ok(
    fetchCallCount >= 3,
    `Expected at least 3 chunk requests for a ~${doc.length}-char document, got ${fetchCallCount}`
  );
  assert.strictEqual(
    result.document_title,
    "Synthetic Large Tender",
    "Title should be pulled from the chunk containing the front-matter marker, not overwritten by a later empty chunk"
  );

  const overlapCopies = result.requirements.filter((r) =>
    r.requirement_text.includes("overlap requirement")
  );
  assert.strictEqual(
    overlapCopies.length,
    1,
    `Expected the overlap-zone requirement deduped to exactly 1 copy, got ${overlapCopies.length}`
  );

  assert.strictEqual(
    result.requirements.length,
    fetchCallCount + 1,
    `Expected (one unique requirement per chunk) + (one deduped overlap requirement) = ${fetchCallCount + 1}, got ${result.requirements.length}`
  );

  console.log(
    `PASS — ${fetchCallCount} chunk requests for a ${doc.length}-char document, ` +
      `${result.requirements.length} requirements after merge+dedupe, overlap correctly collapsed from 2 copies to 1.`
  );
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
