import type { ExtractedRequirement, ExtractionResult } from "./types";
import { HttpError, withRetry } from "./retry";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_KEY = process.env.GEMINI_API_KEY;

// Documents longer than this get split into overlapping chunks and
// extracted per-chunk, then merged. A single call on a 100-page tender
// tends to summarize rather than enumerate — chunking is what makes
// exhaustive extraction actually exhaustive instead of "a representative
// sample," which is the difference between a demo and a real tool.
const CHUNK_THRESHOLD = 18_000; // characters
const CHUNK_SIZE = 14_000;
const CHUNK_OVERLAP = 800; // avoids splitting a requirement across a chunk boundary

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    document_title: { type: "string" },
    issuing_body: { type: "string" },
    submission_deadline: { type: "string" },
    requirements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requirement_text: { type: "string" },
          category: {
            type: "string",
            enum: ["technical", "financial", "legal", "administrative"],
          },
          source_page: { type: "integer" },
          source_snippet: { type: "string" },
          is_mandatory: { type: "boolean" },
          evaluation_weight: { type: "number" },
          keywords: { type: "array", items: { type: "string" } },
        },
        required: ["requirement_text", "category", "source_snippet", "is_mandatory"],
      },
    },
  },
  required: ["document_title", "requirements"],
};

const SYSTEM_PROMPT = `You are the extraction engine inside a bid and tender compliance tool used by real
companies to decide whether they can win a contract. Under-extraction costs them the bid, so
exhaustiveness is the entire point.

Read the tender/RFP text and extract EVERY requirement a bidder must satisfy to be compliant.
Rules:
- Do not summarize or sample. A real 20-40 page tender section typically contains 15-50+ distinct
  checkable requirements once you count eligibility criteria, technical specs, financial terms,
  submission mechanics, and evaluation criteria separately. If your list feels short, re-read the
  text for items you skipped, not just the obvious headline requirements.
- Extract each distinct obligation as its own item, even if several appear in the same paragraph or
  clause. Do not merge multiple requirements into one summary line.
- Every requirement must include "source_snippet": a short verbatim excerpt (under 25 words) from
  the input text that the requirement is grounded in. Never invent a requirement with no textual basis.
- Categorize each as technical, financial, legal, or administrative.
- Mark is_mandatory true only when the text uses binding language (must, shall, required, mandatory).
- Estimate source_page only if page markers exist in the text; otherwise omit it.
- Extract issuing_body and submission_deadline if present in the text.
- Skip narrative background, boilerplate definitions, and anything that isn't independently checkable.

This may be one section of a larger document — extract only what's actually present in the text
you're given, and don't invent a title/issuing body/deadline if this excerpt doesn't contain one.`;

/**
 * Calls Gemini's free-tier API with structured JSON output. Falls back to a
 * realistic mock (grounded in real PPRA / World Bank sample documents)
 * whenever GEMINI_API_KEY isn't set, so the app is explorable with zero
 * configuration.
 */
export async function extractRequirements(
  documentText: string
): Promise<ExtractionResult> {
  if (!API_KEY) {
    return mockExtraction();
  }

  const chunks = splitIntoChunks(documentText);
  const perChunkResults = await Promise.all(
    chunks.map((chunk) => extractChunk(chunk))
  );

  // Merge: first chunk's title/issuer/deadline win (front matter usually
  // lives at the top of the document); requirements are pooled and deduped.
  const merged: ExtractionResult = {
    document_title: perChunkResults.find((r) => r.document_title)?.document_title ?? "Untitled tender",
    issuing_body: perChunkResults.find((r) => r.issuing_body)?.issuing_body ?? null,
    submission_deadline:
      perChunkResults.find((r) => r.submission_deadline)?.submission_deadline ?? null,
    mode: "live",
    requirements: dedupeRequirements(
      perChunkResults.flatMap((res, i) =>
        res.requirements.map((r) => ({ requirement: r, chunkIndex: i }))
      )
    ),
  };

  return merged;
}

function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_THRESHOLD) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

async function extractChunk(
  chunk: string
): Promise<{
  document_title: string;
  issuing_body: string | null;
  submission_deadline: string | null;
  requirements: ExtractedRequirement[];
}> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: chunk }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: EXTRACTION_SCHEMA,
      temperature: 0.1,
      maxOutputTokens: 32768,
    },
  };

  const res = await withRetry(async () => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const errText = await r.text();
      // Throwing the status lets withRetry retry transient 429/5xx responses.
      throw new HttpError(`Gemini request failed (${r.status}): ${errText}`, r.status);
    }
    return r;
  });

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no extractable content.");

  const parsed = JSON.parse(text);

  return {
    document_title: parsed.document_title ?? "",
    issuing_body: parsed.issuing_body ?? null,
    submission_deadline: parsed.submission_deadline ?? null,
    requirements: (parsed.requirements ?? []).map(
      (r: Record<string, unknown>, i: number) => ({
        id: `tmp_${i}`, // replaced by the DB id at persist time; only needs to be unique pre-dedupe
        requirement_text: String(r.requirement_text ?? ""),
        category: (r.category as ExtractedRequirement["category"]) ?? "administrative",
        source_page: typeof r.source_page === "number" ? r.source_page : null,
        source_snippet: String(r.source_snippet ?? ""),
        is_mandatory: Boolean(r.is_mandatory),
        evaluation_weight: typeof r.evaluation_weight === "number" ? r.evaluation_weight : null,
        keywords: Array.isArray(r.keywords) ? r.keywords : [],
      })
    ),
  };
}

/**
 * Collapses duplicate requirements across chunk results.
 *
 * The previous version deduped on exact text alone, which could not tell a
 * genuine repeated clause (e.g. the same compliance term required in two
 * different annexes) from a duplicate introduced by the fixed overlap window
 * between adjacent chunks. It could therefore silently drop a real
 * requirement.
 *
 * Fix: each requirement is tagged with the chunk it came from, and a duplicate
 * is only collapsed when the two occurrences come from the *same* chunk or two
 * *adjacent/overlapping* chunks — the only configurations where chunking can
 * produce a copy. An identical clause that genuinely appears in two distant,
 * non-overlapping sections is now preserved.
 */
function dedupeRequirements(
  pooled: { requirement: ExtractedRequirement; chunkIndex: number }[]
): ExtractedRequirement[] {
  const firstSeen = new Map<string, number>(); // normalized text -> chunk it first appeared in
  const out: ExtractedRequirement[] = [];

  for (const { requirement: r, chunkIndex } of pooled) {
    const key = r.requirement_text.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key) continue;

    const firstChunk = firstSeen.get(key);
    if (firstChunk !== undefined && Math.abs(firstChunk - chunkIndex) <= 1) {
      continue; // chunk-boundary duplicate (same or overlapping chunk) — drop it
    }

    firstSeen.set(key, chunkIndex);
    out.push({ ...r, id: `req_${out.length + 1}` });
  }

  return out;
}

/**
 * Demo-mode data, modeled on the real PPRA National Standard Bidding
 * Document (Information Systems) and a live PPRA IT-equipment tender — so
 * the zero-config demo still feels like a real procurement document.
 *
 * This ALWAYS returns the same fixed 6 items regardless of input — it's a
 * stand-in for a live model, not a smaller version of one. If you're seeing
 * only 6-7 requirements on a large real tender, check whether GEMINI_API_KEY
 * is actually set before assuming the extraction itself is shallow.
 */
function mockExtraction(): ExtractionResult {
  return {
    document_title:
      "Procurement of Network Security Gateway — National Standard Bidding Document",
    issuing_body: "Federal Board of Revenue (PPRA-regulated)",
    submission_deadline: "14 days from date of publication",
    mode: "mock",
    requirements: [
      {
        id: "req_1",
        requirement_text:
          "Bidder must submit a bid security in the form of a call deposit or bank guarantee for the full tender amount.",
        category: "financial",
        source_page: 4,
        source_snippet: "Bid security or Bid Securing Declaration furnished in accordance with ITB 18.",
        is_mandatory: true,
        evaluation_weight: null,
        keywords: ["bid security", "bank guarantee"],
      },
      {
        id: "req_2",
        requirement_text:
          "Bidder must provide documentary evidence of manufacturer authorization for goods it does not manufacture itself.",
        category: "legal",
        source_page: 6,
        source_snippet:
          "Documentary evidence established in accordance with ITB that the Bidder has been authorized by the manufacturer.",
        is_mandatory: true,
        evaluation_weight: null,
        keywords: ["authorization", "manufacturer"],
      },
      {
        id: "req_3",
        requirement_text:
          "The firm must submit an affidavit confirming it has not been blacklisted by any government or semi-government agency.",
        category: "administrative",
        source_page: 3,
        source_snippet:
          "The blacklisted firm by any Govt. Agency is not eligible for participation in the tender.",
        is_mandatory: true,
        evaluation_weight: null,
        keywords: ["blacklist", "affidavit", "eligibility"],
      },
      {
        id: "req_4",
        requirement_text:
          "Proposed solution must meet the technical specifications and performance requirements defined in the Bid Data Sheet, with no unauthorized alternatives.",
        category: "technical",
        source_page: 9,
        source_snippet:
          "Alternatives will not be considered, unless specifically allowed for in the BDS.",
        is_mandatory: true,
        evaluation_weight: 40,
        keywords: ["technical specification", "compliance"],
      },
      {
        id: "req_5",
        requirement_text:
          "Bid must remain valid for the period specified in the Bid Data Sheet; bids with a shorter validity period will be rejected as non-responsive.",
        category: "administrative",
        source_page: 5,
        source_snippet:
          "A Bid valid for a shorter period shall be rejected by the Procuring Agency as non-responsive.",
        is_mandatory: true,
        evaluation_weight: null,
        keywords: ["bid validity"],
      },
      {
        id: "req_6",
        requirement_text:
          "Bidder should include references from similar supplies made to other government departments in the recent past.",
        category: "technical",
        source_page: 11,
        source_snippet: "Departments for similar supplies made in recent past.",
        is_mandatory: false,
        evaluation_weight: 15,
        keywords: ["references", "past performance"],
      },
    ],
  };
}
