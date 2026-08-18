import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "node:url";

/**
 * pdf.js normally loads its worker as a separate chunk, but Next.js's bundler
 * (webpack/Turbopack) doesn't emit that chunk to `.next/.../pdf.worker.mjs`,
 * so the runtime up-import for the "fake worker" fails with
 * `Setting up fake worker failed: Cannot find module ...pdf.worker.mjs`.
 *
 * Fix: point the worker at the actual file on disk and load it as a native
 * `file://` URL (a variable — not a static string — so the bundler leaves the
 * `import()` alone and Node resolves it from the filesystem).
 */
function configurePdfWorker() {
  const candidates = [
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
  ];
  for (const rel of candidates) {
    const p = path.join(process.cwd(), "node_modules", rel);
    if (fs.existsSync(p)) {
      GlobalWorkerOptions.workerSrc = pathToFileURL(p).href;
      return;
    }
  }
}
configurePdfWorker();

/** Turns an uploaded File (PDF or .txt) into plain text for the extraction model. */
export async function fileToText(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const loadingTask = getDocument({ data: buffer, useWorkerFetch: false });
    const pdf = await loadingTask.promise;
    let fullText = "";
    const numPages = pdf.numPages;
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      for (const item of textContent.items) {
        if ("str" in item) {
          fullText += item.str + " ";
        }
      }
    }
    return fullText.trim();
  }

  return new TextDecoder("utf-8").decode(buffer);
}

