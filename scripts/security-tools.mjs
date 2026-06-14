import { spawnSync } from "node:child_process";

const tools = [
  {
    name: "gitleaks",
    command: "gitleaks detect --no-git --redact --source .",
  },
  {
    name: "semgrep",
    command: "semgrep scan --config auto .",
  },
  {
    name: "snyk",
    command: "snyk test",
  },
  {
    name: "trivy",
    command: "trivy fs --scanners vuln,secret,misconfig .",
  },
];

function isAvailable(command) {
  const checker =
    process.platform === "win32"
      ? { command: "where", args: [command] }
      : { command: "sh", args: ["-lc", `command -v ${command}`] };

  const result = spawnSync(checker.command, checker.args, { stdio: "ignore" });

  return result.status === 0;
}

console.log("Safe local security checks:");
console.log("- npm run security:audit");
console.log("- npm run security:audit:high");
console.log("");
console.log("Optional tools detected on this machine:");

for (const tool of tools) {
  const available = isAvailable(tool.name);
  console.log(`${available ? "ok" : "missing"} ${tool.name}`);

  if (available) {
    console.log(`  ${tool.command}`);
  }
}

console.log("");
console.log(
  "This script only checks tool availability and prints commands. It does not scan or upload code.",
);
