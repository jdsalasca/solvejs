// Crash audit: calls every exported function of every package with adversarial inputs and records
// what it throws. A function that returns a documented error shape is fine; a function that dies
// with "Cannot read properties of undefined" is a defect a user can hit with hostile input.
//
// This is a probe, not a gate: the output is reviewed by hand, because a documented TypeError and a
// genuine crash look the same to a script.
import { createRequire } from "node:module";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(import.meta.url);

const ADVERSARIAL = [
  undefined,
  null,
  NaN,
  Infinity,
  -0,
  "",
  "   ",
  "\u0000",
  {},
  [],
  [undefined],
  { toString: null },
  Symbol("x"),
  10n,
  () => {},
  new Date(NaN),
  Object.create(null)
];

const packages = readdirSync("packages").filter((name) => existsSync(join("packages", name, "dist", "cjs")));

const findings = [];
let called = 0;

function describeInput(input) {
  if (typeof input === "symbol") return "Symbol";
  if (typeof input === "bigint") return "BigInt";
  return JSON.stringify(input) ?? String(input);
}

function recordFinding(name, exportName, input, error) {
  const message = error instanceof Error ? error.message : String(error);
  const type = error instanceof Error ? error.constructor.name : typeof error;
  // A structured validation error carries a `code`; anything else is worth a look.
  const structured = error && typeof error === "object" && typeof error.code === "string";
  findings.push({
    package: name,
    fn: exportName,
    input: describeInput(input),
    type,
    structured,
    message: message.slice(0, 90)
  });
}

function probeFunction(name, exportName, value) {
  const arity = Math.max(1, value.length);
  for (const input of ADVERSARIAL) {
    const args = Array.from({ length: arity }, () => input);
    called += 1;
    try {
      const result = value(...args);
      if (result && typeof result.then === "function") result.catch(() => {});
    } catch (error) {
      recordFinding(name, exportName, input, error);
    }
  }
}

for (const name of packages) {
  const entry = join("packages", name, "dist", "cjs", "index.cjs");
  if (!existsSync(entry)) continue;
  // eslint-disable-next-line security/detect-non-literal-require -- entry path comes from the workspace list
  const module = require(join(process.cwd(), entry));

  for (const [exportName, value] of Object.entries(module)) {
    if (typeof value !== "function") continue;
    // Skip error classes: constructing them is not a supported call.
    if (/Error$/.test(exportName)) continue;
    probeFunction(name, exportName, value);
  }
}

const suspicious = findings.filter((f) => !f.structured);
console.log(`${called} calls, ${findings.length} threw, ${suspicious.length} without a structured code.`);

const grouped = new Map();
for (const item of suspicious) {
  const key = `${item.package} ${item.fn}`;
  if (!grouped.has(key)) grouped.set(key, new Set());
  grouped.get(key).add(`${item.type}: ${item.message}`);
}

for (const [key, messages] of [...grouped.entries()].sort()) {
  console.log(`\n${key}`);
  for (const message of messages) console.log(`    ${message}`);
}