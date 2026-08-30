import fs from "node:fs";
import path from "node:path";

const outputRoot = path.resolve("out");
const locales = new Set([
  "en", "de", "es", "fr", "it", "ja", "ko", "pt", "th", "tr", "vi", "id", "zh-Hans",
]);

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(filePath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

    const relative = path.relative(outputRoot, filePath);
    const firstSegment = relative.split(path.sep)[0];
    const locale = locales.has(firstSegment) ? firstSegment : "en";
    const html = fs.readFileSync(filePath, "utf8");
    const updated = html.replace(/<html(?:\s+lang="[^"]*")?/i, `<html lang="${locale}"`);
    if (updated !== html) fs.writeFileSync(filePath, updated);
  }
}

visit(outputRoot);
