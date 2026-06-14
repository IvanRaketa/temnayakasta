import { lstat, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

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

function printRows(title, rows) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
  for (const row of rows) {
    console.log(`${row.size.padStart(10)}  ${row.name}`);
  }
}

const entries = await readdir(root, { withFileTypes: true });
const topRows = [];
let total = 0;

for (const entry of entries) {
  const fullPath = path.join(root, entry.name);
  const size = await getSize(fullPath);
  total += size;
  topRows.push({ name: entry.name, bytes: size, size: formatSize(size) });
}

topRows.sort((a, b) => b.bytes - a.bytes);

console.log(`Project size: ${formatSize(total)} (${root})`);
printRows("Top-level items", topRows.slice(0, 25));

const nextPath = path.join(root, ".next");
try {
  await lstat(nextPath);
  const nextEntries = await readdir(nextPath, { withFileTypes: true });
  const nextRows = [];
  for (const entry of nextEntries) {
    const fullPath = path.join(nextPath, entry.name);
    const size = await getSize(fullPath);
    nextRows.push({ name: `.next/${entry.name}`, bytes: size, size: formatSize(size) });
  }
  nextRows.sort((a, b) => b.bytes - a.bytes);
  printRows(".next breakdown", nextRows);
} catch {
  console.log("\n.next breakdown\n---------------\n.next is not present");
}

const nodeModulesPath = path.join(root, "node_modules");
try {
  await lstat(nodeModulesPath);
  const nodeEntries = await readdir(nodeModulesPath, { withFileTypes: true });
  const nodeRows = [];
  for (const entry of nodeEntries) {
    const fullPath = path.join(nodeModulesPath, entry.name);
    const size = await getSize(fullPath);
    nodeRows.push({ name: `node_modules/${entry.name}`, bytes: size, size: formatSize(size) });
  }
  nodeRows.sort((a, b) => b.bytes - a.bytes);
  printRows("Largest node_modules entries", nodeRows.slice(0, 15));
} catch {
  console.log("\nLargest node_modules entries\n----------------------------\nnode_modules is not present");
}
