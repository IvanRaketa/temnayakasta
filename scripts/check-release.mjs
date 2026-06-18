import { readdir, stat, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const maxBytes = 100 * 1024 * 1024;
const ignored = new Set([".git", "node_modules", "release"]);
const forbiddenNamePattern = /[а-яё\s]/i;

const files = [];
let totalBytes = 0;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;

    const fullPath = join(dir, entry.name);
    const relPath = relative(root, fullPath).replaceAll("\\", "/");

    if (forbiddenNamePattern.test(entry.name)) {
      throw new Error(`Forbidden file or directory name: ${relPath}`);
    }

    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    const info = await stat(fullPath);
    totalBytes += info.size;
    files.push(relPath);
  }
}

await walk(root);

if (!files.includes("index.html")) {
  throw new Error("index.html must be in the project root.");
}

if (totalBytes > maxBytes) {
  throw new Error(`Project is too large: ${Math.round(totalBytes / 1024 / 1024)} MB.`);
}

const html = await readFile(join(root, "index.html"), "utf8");
if (!html.includes("/sdk.js")) {
  throw new Error("Yandex Games SDK script /sdk.js is not referenced in index.html.");
}

console.log("Release check passed.");
console.log(`Files checked: ${files.length}`);
console.log(`Approx size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
