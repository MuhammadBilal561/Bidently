import { extractText } from "unpdf";

/** Turns an uploaded File (PDF or .txt) into plain text for the extraction model. */
export async function fileToText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    // unpdf is a serverless-compatible PDF parser with zero native dependencies
    // that works in Vercel/Lambda/Edge environments without DOMMatrix/canvas.
    // It ships with a bundled, optimized build of PDF.js specifically for
    // Node/serverless runtimes (no browser APIs required).
    const result = await extractText(buffer, { mergePages: true });
    return result.text.trim();
  }

  return new TextDecoder("utf-8").decode(buffer);
}

