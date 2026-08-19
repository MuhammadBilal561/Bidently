/**
 * Verifies that fileToText() extracts REAL text from a PDF using unpdf
 * (not mock/demo data). The PDF is hand-crafted as a raw byte stream so this
 * test has no extra dependencies.
 *
 * Run with: node --import tsx tests/pdf-extraction.test.ts
 */

import assert from "node:assert";
import { fileToText } from "../lib/extract-text";

// Minimal but valid single-page PDF that contains the string "Hello PDF World"
// Generated from the raw PDF object structure — no library needed.
function buildMinimalPdf(text: string): ArrayBuffer {
  const pageText = text;
  // Build a minimal 1-page PDF with one text stream
  const stream = `BT /F1 12 Tf 100 700 Td (${pageText}) Tj ET`;
  const streamLen = stream.length;

  const raw = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>>>>>/Contents 4 0 R>>endobj
4 0 obj<</Length ${streamLen}>>
stream
${stream}
endstream
endobj
xref
0 5
0000000000 65535 f 
trailer<</Size 5/Root 1 0 R>>
startxref
0
%%EOF`;

  return new TextEncoder().encode(raw).buffer;
}

async function run() {
  const EXPECTED = "Hello PDF World";
  const pdfBytes = buildMinimalPdf(EXPECTED);

  // Wrap in a File object (available in Node 20+ via global)
  const file = new File([pdfBytes], "test.pdf", { type: "application/pdf" });

  console.log(`Extracting text from in-memory PDF (${pdfBytes.byteLength} bytes) using unpdf...`);
  const extracted = await fileToText(file);

  console.log(`Extracted: "${extracted}"`);

  assert.ok(
    extracted.includes(EXPECTED),
    `Expected extracted text to contain "${EXPECTED}", got: "${extracted}"`
  );
  assert.ok(
    extracted.length > 0,
    "fileToText() returned empty string — extraction failed"
  );

  console.log("PASS — fileToText() returned real PDF text using unpdf (serverless-compatible).");
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
