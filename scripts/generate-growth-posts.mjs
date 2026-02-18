import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function parseArgs(argv) {
  const args = { week: 1, count: 3, start: 1 };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith("--")) continue;
    const name = key.slice(2);
    if (name in args && value && !value.startsWith("--")) {
      args[name] = Number(value);
      i += 1;
    }
  }
  return args;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function loadSnippets() {
  const source = readFileSync(join("docs", "growth", "social-snippets-10x.md"), "utf8");
  const chunks = source.split(/^##\s+/gm).slice(1);
  return chunks.map((chunk) => {
    const [rawTitle, ...rest] = chunk.split("\n");
    const body = rest.join("\n").trim();
    const match = body.match(/```ts([\s\S]*?)```/);
    return {
      title: rawTitle.trim(),
      body,
      code: match ? match[1].trim() : ""
    };
  });
}

function fillTemplate(template, data) {
  return template
    .replaceAll("{{TITLE}}", data.title)
    .replaceAll("{{BODY}}", data.body)
    .replaceAll("{{CODE}}", data.code)
    .replaceAll("{{DOCS_URL}}", data.docsUrl)
    .replaceAll("{{NPM_URL}}", data.npmUrl);
}

function run() {
  const { week, count, start } = parseArgs(process.argv);
  const snippets = loadSnippets();
  const startIndex = Math.max(0, start - 1);
  const selected = snippets.slice(startIndex, startIndex + count);
  if (selected.length === 0) {
    throw new Error("No snippets selected. Check --start and --count.");
  }

  const weekLabel = `week-${String(week).padStart(2, "0")}`;
  const outDir = join("docs", "growth", "out", weekLabel);
  mkdirSync(outDir, { recursive: true });

  const tplX = readFileSync(join("docs", "growth", "templates", "x.md"), "utf8");
  const tplLinkedIn = readFileSync(join("docs", "growth", "templates", "linkedin.md"), "utf8");
  const tplDev = readFileSync(join("docs", "growth", "templates", "dev.md"), "utf8");

  const docsUrl = "https://jdsalasca.github.io/solvejs/?utm_source=social&utm_medium=post&utm_campaign=community_growth";
  const npmUrl = "https://www.npmjs.com/package/@jdsalasc/solvejs?utm_source=social&utm_medium=post&utm_campaign=community_growth";
  const indexLines = [`# ${weekLabel}`, ""];

  selected.forEach((snippet, i) => {
    const order = String(i + 1).padStart(2, "0");
    const slug = `${order}-${slugify(snippet.title)}`;
    const data = { ...snippet, docsUrl, npmUrl };
    const xText = fillTemplate(tplX, data);
    const liText = fillTemplate(tplLinkedIn, data);
    const devText = fillTemplate(tplDev, data);

    writeFileSync(join(outDir, `${slug}.x.md`), xText, "utf8");
    writeFileSync(join(outDir, `${slug}.linkedin.md`), liText, "utf8");
    writeFileSync(join(outDir, `${slug}.dev.md`), devText, "utf8");

    indexLines.push(`- ${slug}`);
  });

  writeFileSync(join(outDir, "README.md"), `${indexLines.join("\n")}\n`, "utf8");
  console.log(`Generated ${selected.length} snippets in ${outDir}`);
}

run();
