import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

function listHtmlFiles(root) {
  const files = [];
  function walk(path) {
    for (const entry of readdirSync(path)) {
      const fullPath = join(path, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (fullPath.endsWith(".html")) {
        files.push(normalize(fullPath));
      }
    }
  }
  walk(root);
  return files;
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

const files = listHtmlFiles("docs");
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
