import { embed, cosineSimilarity } from "./embeddings";
import { HttpError, withRetry } from "./retry";
import type {
  ContentLibraryItem,
  DraftAnswer,
  ExtractedRequirement,
  MatchedSource,
} from "./types";

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MATCH_THRESHOLD = 0.55; // below this, treat as a content gap rather than force a bad match

export async function generateDraft(
  requirement: ExtractedRequirement,
  library: ContentLibraryItem[]
): Promise<DraftAnswer> {
  if (!API_KEY) {
    return mockDraft(requirement, library);
  }

  // 1. Embed the requirement and every library item, rank by real cosine similarity.
  const reqVector = await embed(requirement.requirement_text);
  const scored = await Promise.all(
    library.map(async (item) => ({
      item,
      score: reqVector ? cosineSimilarity(reqVector, (await embed(item.body))!) : 0,
    }))
  );
  scored.sort((a, b) => b.score - a.score);
  const topMatches = scored.filter((s) => s.score >= MATCH_THRESHOLD).slice(0, 2);

  if (topMatches.length === 0) {
    return {
      requirement_id: requirement.id,
      answer: "",
      sources: [],
      content_gap: true,
      mode: "live",
    };
  }

  // 2. Ask Gemini to draft an answer grounded ONLY in the matched content.
  const context = topMatches
    .map((m) => `[${m.item.title}]\n${m.item.body}`)
    .join("\n\n");

  const prompt = `You are drafting a bid response for Bidently. Using ONLY the company content below, write a compliant, specific answer (2-4 sentences) to the requirement. Do not invent facts not present in the content. If the content only partially covers the requirement, say so plainly rather than filling the gap.

REQUIREMENT: ${requirement.requirement_text}

COMPANY CONTENT:
${context}

Return only the answer text, no preamble.`;

  const res = await withRetry(async () => {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
      }
    );
    if (!r.ok) {
      const errText = await r.text();
      throw new HttpError(`Draft generation failed (${r.status}): ${errText}`, r.status);
    }
    return r;
  });
  const data = await res.json();
  const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const sources: MatchedSource[] = topMatches.map((m) => ({
    content_id: m.item.id,
    title: m.item.title,
    similarity: Math.round(m.score * 100) / 100,
  }));

  return { requirement_id: requirement.id, answer, sources, content_gap: false, mode: "live" };
}

/**
 * Hand-matched demo answers. Matched by a distinctive keyword from the fixed
 * mock-extraction text (lib/gemini.ts) rather than by id — ids are freshly
 * generated on every persist (see app/api/extract/route.ts), so they can't
 * be used as a stable lookup key here.
 */
function mockDraft(
  requirement: ExtractedRequirement,
  library: ContentLibraryItem[]
): DraftAnswer {
  const table: { keyword: string; answer: string; sourceTitles: string[] }[] = [
    {
      keyword: "bid security",
      answer:
        "We will furnish the required bid security as a bank guarantee covering the full tender amount prior to the submission deadline, in the format specified in the bidding document.",
      sourceTitles: [],
    },
    {
      keyword: "manufacturer authorization",
      answer:
        "We are an authorized reseller for the OEMs we bid with and can provide a manufacturer authorization letter dated within 30 days of submission, alongside our current ISO/IEC 27001:2022 certification.",
      sourceTitles: ["ISO 27001 & Manufacturer Certifications"],
    },
    {
      keyword: "blacklist",
      answer:
        "Our company is not currently blacklisted or debarred by any government or semi-government body, and we maintain notarized compliance affidavits that can be issued within 48 hours of request.",
      sourceTitles: ["Corporate Registration & Compliance Statement"],
    },
    {
      keyword: "technical specification",
      answer:
        "Our proposed appliance meets the stated throughput and NGFW requirements; in a comparable 2025 deployment for a national telecom client we sustained 12 Gbps inspected throughput across 40 sites with zero unplanned downtime.",
      sourceTitles: ["NGFW Deployment Case Study — National Telecom Client"],
    },
    {
      keyword: "valid",
      answer:
        "Our bid will remain valid for the full period specified in the Bid Data Sheet, consistent with our standard submission practice.",
      sourceTitles: [],
    },
    {
      keyword: "reference",
      answer:
        "We have completed 14 similar equipment supply contracts for government and regulated-sector clients over the last five years, including three federal agencies; full reference contacts are available as an annex.",
      sourceTitles: ["Past Performance & Reference List"],
    },
  ];

  const lower = requirement.requirement_text.toLowerCase();
  const match = table.find((t) => lower.includes(t.keyword));
  if (!match) {
    return {
      requirement_id: requirement.id,
      answer: "",
      sources: [],
      content_gap: true,
      mode: "mock",
    };
  }

  const sources: MatchedSource[] = match.sourceTitles
    .map((title) => library.find((c) => c.title === title))
    .filter((item): item is ContentLibraryItem => Boolean(item))
    .map((item) => ({ content_id: item.id, title: item.title, similarity: 0.82 }));

  return {
    requirement_id: requirement.id,
    answer: match.answer,
    sources,
    content_gap: false, // a straightforward procedural commitment still counts as answered
    mode: "mock",
  };
}
