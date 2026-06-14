import { lstat, readdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

const rootTargets = [
  ".next",
  ".pglite",
  ".turbo",
  ".parcel-cache",
  "out",
  "dist",
  "coverage",
];

const rootFilePatterns = [
  /^\.next-dev\..*\.log$/i,
  /^\.next-.*\.pid$/i,
  /^\.pglite-server\..*\.log$/i,
  /\.log$/i,
  /\.tsbuildinfo$/i,
];

function isInsideWorkspace(targetPath) {
  const resolved = path.resolve(root, targetPath);
  return resolved !== root && resolved.startsWith(`${root}${path.sep}`);
}

async function exists(targetPath) {
  try {
    await lstat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function getSize(targetPath) {
  const stat = await lstat(targetPath);

  if (!stat.isDirectory()) {
    return stat.size;
  }

  let total = 0;
  const entries = await readdir(targetPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isSymbolicLink()) {
      const linkStat = await lstat(fullPath);
      total += linkStat.size;
      continue;
    }
    total += await getSize(fullPath);
  }

  return total;
}

function formatSize(bytes) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

const targets = [];

for (const name of rootTargets) {
  targets.push(path.join(root, name));
}

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (rootFilePatterns.some((pattern) => pattern.test(entry.name))) {
    targets.push(path.join(root, entry.name));
  }
}

let freed = 0;
let removed = 0;

for (const target of targets) {
  if (!isInsideWorkspace(target) || !(await exists(target))) continue;

  const size = await getSize(target);
  await rm(target, { recursive: true, force: true });
  freed += size;
  removed += 1;
  console.log(`removed ${path.relative(root, target)} (${formatSize(size)})`);
}

if (removed === 0) {
  console.log("nothing to clean");
} else {
  console.log(`clean complete, freed about ${formatSize(freed)}`);
}
