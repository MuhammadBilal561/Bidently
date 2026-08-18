const fs = require("fs");
(async () => {
  const s = fs.readFileSync("node_modules/pdfjs-dist/legacy/build/pdf.mjs", "utf8");
  const i = s.indexOf("DOMMatrix");
  console.log("== around first DOMMatrix ==");
  console.log(s.slice(Math.max(0, i - 500), i + 800));
  console.log("\n== count of DOMMatrix occurrences ==", (s.match(/DOMMatrix/g) || []).length);

  console.log("\n== attempt dynamic import in Node ==");
  try {
    const mod = await import("pdfjs-dist/legacy/build/pdf.mjs");
    console.log("IMPORT OK, keys:", Object.keys(mod).slice(0, 12).join(","));
  } catch (e) {
    console.log("IMPORT FAILED:", e.message);
  }
})();
