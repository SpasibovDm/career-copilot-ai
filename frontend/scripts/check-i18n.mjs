import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT_DIRS = ["app", "components"];
const TEXT_NODE_REGEX = />[^<{][^<]*[A-Za-z][^<]*</g;
const ATTRIBUTES = ["aria-label", "placeholder", "title", "alt"];

const findings = [];

function walk(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!fullPath.endsWith(".tsx")) {
      continue;
    }
    const content = readFileSync(fullPath, "utf-8");
    const relative = fullPath.replace(process.cwd() + "/", "");

    const textMatches = content.match(TEXT_NODE_REGEX) ?? [];
    for (const match of textMatches) {
      const cleaned = match.replace(/[<>]/g, "").trim();
      if (cleaned && !cleaned.startsWith("{") && !cleaned.includes("t(")) {
        findings.push(`${relative}: JSX text "${cleaned}"`);
      }
    }

    for (const attr of ATTRIBUTES) {
      const regex = new RegExp(`${attr}="([^"]*[A-Za-z][^"]*)"`, "g");
      let result = regex.exec(content);
      while (result) {
        const value = result[1];
        if (!value.includes("{") && !value.includes("t(")) {
          findings.push(`${relative}: ${attr}="${value}"`);
        }
        result = regex.exec(content);
      }
    }
  }
}

for (const root of ROOT_DIRS) {
  walk(join(process.cwd(), root));
}

if (findings.length) {
  console.error("Hardcoded strings detected:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
} else {
  console.log("i18n check passed: no hardcoded strings found.");
}
