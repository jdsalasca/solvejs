import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { execSync } from "node:child_process";

function listHtmlFiles() {
  const output = execSync("rg --files docs -g *.html", { encoding: "utf8" }).trim();
  if (!output) return [];
  return output.split(/\r?\n/).filter(Boolean);
}

function extractLinks(html) {
  const links = [];
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
    links.push(match[1]);
  }
  return links;
}

function isSkippable(link) {
  return (
    !link ||
    link.startsWith("#") ||
    link.startsWith("mailto:") ||
    link.startsWith("tel:") ||
    link.startsWith("javascript:") ||
    /^https?:\/\//i.test(link)
  );
}

const files = listHtmlFiles();
const failures = [];

for (const file of files) {
  const html = readFileSync(file, "utf8");
  const links = extractLinks(html);
  const baseDir = dirname(file);

  for (const link of links) {
    if (isSkippable(link)) continue;
    const clean = link.split("#")[0].split("?")[0];
    if (!clean) continue;

    const candidate = clean.startsWith("/")
      ? normalize(join("docs", clean))
      : normalize(join(baseDir, clean));

    if (!existsSync(candidate)) {
      failures.push(`${file} -> ${link}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Broken docs links found:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Docs link check passed for ${files.length} HTML files.`);
}
