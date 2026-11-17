/* eslint-disable complexity -- TypeScript symbol classification is a compact switch */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

const root = process.cwd();
const packagesDir = join(root, "packages");
const output = join(root, "docs", "live", "api.json");

function packageDirs() {
  return readdirSync(packagesDir)
    .map((name) => join(packagesDir, name))
    .filter((path) => existsSync(join(path, "package.json")));
}

function programFor(dir) {
  const configPath = join(dir, "tsconfig.esm.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(configPath));
  return ts.createProgram(parsed.fileNames, parsed.options);
}

function signatureOf(checker, symbol, declaration) {
  if (!declaration) return symbol.getName();
  if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)) {
    const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
    const signature = checker.getSignaturesOfType(type, ts.SignatureKind.Call)[0];
    if (signature) {
      return checker.signatureToString(
        signature,
        declaration,
        ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.WriteArrowStyleSignature
      );
    }
  }
  if (ts.isTypeAliasDeclaration(declaration)) {
    return declaration.getText().replace(/^export\s+/, "").replace(/\s+/g, " ").trim();
  }
  if (ts.isInterfaceDeclaration(declaration)) {
    return `interface ${declaration.name.text}`;
  }
  if (ts.isClassDeclaration(declaration)) {
    return `class ${declaration.name?.text ?? symbol.getName()}`;
  }
  if (ts.isEnumDeclaration(declaration)) {
    return `enum ${declaration.name.text}`;
  }
  if (ts.isVariableDeclaration(declaration)) {
    const type = checker.getTypeOfSymbolAtLocation(symbol, declaration);
    return `const ${symbol.getName()}: ${checker.typeToString(type, declaration, ts.TypeFormatFlags.NoTruncation)}`;
  }
  return symbol.getName();
}

function kindOf(declaration) {
  if (!declaration) return "value";
  if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)) return "function";
  if (ts.isTypeAliasDeclaration(declaration)) return "type";
  if (ts.isInterfaceDeclaration(declaration)) return "interface";
  if (ts.isClassDeclaration(declaration)) return "class";
  if (ts.isEnumDeclaration(declaration)) return "enum";
  if (ts.isVariableDeclaration(declaration)) return "const";
  if (ts.isModuleDeclaration(declaration)) return "namespace";
  return "value";
}

function entriesFor(dir) {
  const program = programFor(dir);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(resolve(dir, "src", "index.ts"));
  if (!sourceFile) return [];
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) return [];
  const entries = [];
  const seen = new Set();
  for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
    const resolved = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    const name = symbol.getName();
    if (seen.has(name)) continue;
    seen.add(name);
    const declaration = (resolved.getDeclarations() ?? [])[0];
    const kind = kindOf(declaration);
    if (kind === "value" && !declaration) continue;
    const doc = ts.displayPartsToString(resolved.getDocumentationComment(checker)).replace(/\s+/g, " ").trim();
    entries.push({
      name,
      kind,
      signature: signatureOf(checker, resolved, declaration).replace(/\s+/g, " ").trim().slice(0, 280),
      ...(doc ? { doc: doc.slice(0, 240) } : {})
    });
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

const packages = packageDirs()
  .map((dir) => {
    const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    return { name: manifest.name, version: manifest.version, entries: entriesFor(dir) };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync(
  output,
  `${JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), packages }, null, 2)}\n`,
  "utf8"
);
console.log(`Wrote ${packages.length} package APIs to ${output}`);
