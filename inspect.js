const fs = require("fs");
const path = require("path");
function list(dir, filter) {
  const out = [];
  (function walk(d) {
    let ents = [];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (!filter || filter.test(p)) out.push(p);
    }
  })(dir);
  return out;
}
console.log("== pdf-parse files ==");
console.log(list(path.join("node_modules", "pdf-parse"), /\.(mjs|js|cjs)$/i).join("\n"));
console.log("\n== pdfjs-dist legacy build ==");
console.log(list(path.join("node_modules", "pdfjs-dist", "legacy", "build"), /pdf.*\.(mjs|js)$/i).join("\n"));
console.log("\n== pdf-parse package.json main/exports ==");
const pp = require("./node_modules/pdf-parse/package.json");
console.log("main:", pp.main, "module:", pp.module, "exports:", JSON.stringify(pp.exports));
