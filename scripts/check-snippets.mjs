// Parses every TypeScript snippet in every package README and fails on a syntax error.
//
// A README example is a promise: the reader copies it. A snippet that does not parse is worse than
// no snippet, because the failure only shows up after a paste. This gate parses rather than executes,
// so a fragment that references an undefined name is fine while an unbalanced brace or a stray
// keyword is not.
//
// It found its first defect immediately: solvejs-errors showed a bare `catch` block with no `try`.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const packages = readdirSync("packages")
  .map((name) => join("packages", name))
  .filter((path) => existsSync(join(path, "README.md")));

const problems = [];
let checked = 0;

for (const path of packages) {
  const readme = readFileSync(join(path, "README.md"), "utf8");
  const displayPath = `${path.replace(/\\/g, "/")}/README.md`;
  const fences = [...readme.matchAll(/```(tsx|typescript|ts)[^\n]*\n([\s\S]*?)```/g)];

  for (const [index, fence] of fences.entries()) {
    checked += 1;
    const language = fence[1];
    const source = fence[2];
    const extension = language === "tsx" ? "tsx" : "ts";
    const file = ts.createSourceFile(
      `${displayPath}#snippet-${index + 1}.${extension}`,
      source,
      ts.ScriptTarget.ESNext,
      true,
      language === "tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    for (const diagnostic of file.parseDiagnostics ?? []) {
      const { line, character } = file.getLineAndCharacterOfPosition(diagnostic.start);
      problems.push(
        `${displayPath} snippet ${index + 1}, line ${line + 1}:${character + 1} — ` +
          ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")
      );
    }
  }
}

console.log(`Parsed ${checked} TypeScript snippets from ${packages.length} READMEs.`);
if (problems.length > 0) {
  console.error(`${problems.length} snippet problem(s):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exitCode = 1;
}