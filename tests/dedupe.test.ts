// Verifies the chunk-aware dedupe fix in lib/gemini.ts:
//  1. A duplicate that appears in *overlapping/adjacent* chunks is collapsed.
//  2. A genuine identical clause that appears in two *distant*, non-overlapping
//     chunks is PRESERVED (the previous exact-text dedupe dropped it).
// Run with: npm run test:dedupe

process.env.GEMINI_API_KEY = "test-fake-key-for-mocked-fetch-only";

import assert from "node:assert";

interface MockChunk {
  chunkIndex: number;
  text: string;
}

const captured: { chunkIndex: number; hasAdj: boolean; hasFarA: boolean; hasFarB: boolean }[] = [];

global.fetch = (async (_url: string, init: RequestInit) => {
  const body = JSON.parse(init.body as string);
  const chunkText: string = body.contents[0].parts[0].text;
  const chunkIndex = captured.length;

  captured.push({
    chunkIndex,
    hasAdj: chunkText.includes("ADJ-MARKER"),
    hasFarA: chunkText.includes("FAR-A-MARKER"),
    hasFarB: chunkText.includes("FAR-B-MARKER"),
  });

  const requirements: Record<string, unknown>[] = [];
  if (chunkText.includes("ADJ-MARKER")) {
    requirements.push({
      requirement_text: "The adjacent-overlap requirement that chunking duplicates.",
      category: "administrative",
      source_snippet: "ADJ-MARKER",
      is_mandatory: true,
    });
  }
  if (chunkText.includes("FAR-A-MARKER")) {
    requirements.push({
      requirement_text: "A genuinely repeated mandatory compliance clause.",
      category: "legal",
      source_snippet: "FAR-A-MARKER",
      is_mandatory: true,
    });
  }
  if (chunkText.includes("FAR-B-MARKER")) {
    requirements.push({
      requirement_text: "A genuinely repeated mandatory compliance clause.",
      category: "legal",
      source_snippet: "FAR-B-MARKER",
      is_mandatory: true,
    });
  }

  const responseText = JSON.stringify({
    document_title: chunkText.includes("FAR-A-MARKER") ? "Dedupe Test Tender" : "",
    issuing_body: null,
    requirements,
  });

  return {
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text: responseText }] } }] }),
  } as unknown as Response;
}) as typeof fetch;

/**
 * Document engineered so:
 *  - chunk 0 and chunk 1 BOTH contain ADJ-MARKER (overlap window)
 *  - FAR-A-MARKER only in chunk 0
 *  - FAR-B-MARKER only in chunk 2 (far enough to be a genuine distant repeat)
 */
function buildDocument(): string {
  const farA = "FAR-A-MARKER ";
  const padding = "A".repeat(13_490);
  const adj = " ADJ-MARKER "; // lands ~13,505-13,516 → inside chunk0/chunk1 overlap
  const tail = "B".repeat(20_000);
  const farB = " FAR-B-MARKER";
  return farA + padding + adj + tail + farB;
}

async function run() {
  const { extractRequirements } = await import("../lib/gemini");
  const doc = buildDocument();
  assert.ok(doc.length > 18_000, "Test doc must exceed chunk threshold");

  const result = await extractRequirements(doc);

  assert.ok(captured.length >= 3, `Expected >= 3 chunks, got ${captured.length}`);

  // Chunk 0 must be the only chunk with FAR-A-MARKER, chunk 2 the only with FAR-B.
  const chunksWithFarA = captured.filter((c) => c.hasFarA);
  const chunksWithFarB = captured.filter((c) => c.hasFarB);
  assert.strictEqual(chunksWithFarA.length, 1, "FAR-A marker should appear exactly once");
  assert.strictEqual(chunksWithFarB.length, 1, "FAR-B marker should appear exactly once");
  assert.notStrictEqual(chunksWithFarA[0].chunkIndex, chunksWithFarB[0].chunkIndex);

  const adjCopies = result.requirements.filter((r) =>
    r.requirement_text.includes("adjacent-overlap")
  );
  const distantCopies = result.requirements.filter((r) =>
    r.requirement_text.includes("genuinely repeated")
  );

  assert.strictEqual(
    adjCopies.length,
    1,
    `Overlap duplicate should collapse to 1, got ${adjCopies.length}`
  );
  assert.strictEqual(
    distantCopies.length,
    2,
    `A genuine repeated clause in distant sections must be preserved: expected 2, got ${distantCopies.length}`
  );

  console.log(
    `PASS — adjacent-overlap duplicate collapsed (1), genuine distant repeat preserved (2) across ${captured.length} chunks.`
  );
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
