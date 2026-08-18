import { HttpError, withRetry } from "./retry";

const API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

/** Calls Gemini's embedding endpoint. Returns null in mock mode (no API key). */
export async function embed(text: string): Promise<number[] | null> {
  if (!API_KEY) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${API_KEY}`;

  const res = await withRetry(async () => {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      throw new HttpError(`Embedding request failed (${r.status}): ${errText}`, r.status);
    }
    return r;
  });

  const data = await res.json();
  const values: number[] | undefined = data?.embedding?.values;
  if (!values) throw new Error("Embedding response had no vector.");
  return values;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
