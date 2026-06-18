import archiver from "archiver";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const releaseDir = join(root, "release");
const zipPath = join(releaseDir, "minimarket-24-yandex-games.zip");
const ignored = new Set([".git", "node_modules", "release", "package-lock.json"]);

if (!existsSync(releaseDir)) {
  mkdirSync(releaseDir);
}

const output = createWriteStream(zipPath);
const archive = archiver("zip", { zlib: { level: 9 } });

archive.pipe(output);

async function addDir(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;

    const fullPath = join(dir, entry.name);
    const archivePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      await addDir(fullPath, archivePath);
    } else {
      archive.file(fullPath, { name: archivePath });
    }
  }
}

await addDir(root);
await archive.finalize();

output.on("close", () => {
  console.log(`Created ${zipPath}`);
  console.log(`Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
});
