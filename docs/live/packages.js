import { formatDate as metaFormatDate, slugify as metaSlugify } from "@jdsalasc/solvejs";
import { pMap, retry } from "@jdsalasc/solvejs-async";
import { createTtlCache, stableKey } from "@jdsalasc/solvejs-cache";
import { HTTP_STATUS, TIME } from "@jdsalasc/solvejs-constants";
import { addDays, parseDateStrict } from "@jdsalasc/solvejs-date";
import { getEnvNumber } from "@jdsalasc/solvejs-env";
import { createError, errorToResponse } from "@jdsalasc/solvejs-errors";
import { calculateBackoffDelay, negotiateContentType } from "@jdsalasc/solvejs-http";
import { deepClone, stableStringify } from "@jdsalasc/solvejs-json";
import { groupBy, uniqueBy } from "@jdsalasc/solvejs-list";
import { formatMoney, fromDecimal } from "@jdsalasc/solvejs-money";
import { roundTo, safeDivide } from "@jdsalasc/solvejs-numbers";
import { deepMerge, get } from "@jdsalasc/solvejs-objects";
import { paginate } from "@jdsalasc/solvejs-pagination";
import { escapeRegex, validateByName } from "@jdsalasc/solvejs-regex";
import { s } from "@jdsalasc/solvejs-schema";
import { maxSatisfying, satisfies } from "@jdsalasc/solvejs-semver";
import { mask, slugify } from "@jdsalasc/solvejs-string";
import { buildUrl, parseQuery } from "@jdsalasc/solvejs-url";
import { validateCellphoneNumber, validateEmail } from "@jdsalasc/solvejs-validators";
import { renderPdfDemo, renderFormLab } from "./pdf-gallery.js";
import { renderXlsxDemo } from "./xlsx-gallery.js";

const PACKAGES = [
  {
    id: "pdf",
    name: "@jdsalasc/solvejs-pdf",
    title: "PDF generation, typography and AcroForm",
    level: "Flagship",
    demo: "pdf"
  },
  {
    id: "xlsx",
    name: "@jdsalasc/solvejs-xlsx",
    title: "XLSX writer, reader and live preview",
    level: "Flagship",
    demo: "xlsx"
  },
  {
    id: "date",
    name: "@jdsalasc/solvejs-date",
    title: "Strict dates and UTC math",
    level: "Core",
    code: `addDays(parseDateStrict("2026-11-16"), 30)`,
    run: () => {
      const start = parseDateStrict("2026-11-16", "YYYY-MM-DD");
      return { start: metaFormatDate(start), plus30: metaFormatDate(addDays(start, 30)) };
    }
  },
  {
    id: "money",
    name: "@jdsalasc/solvejs-money",
    title: "Exact minor-unit money",
    level: "Core",
    code: `formatMoney(percentageOf(100000, 19))`,
    run: () => {
      const amount = fromDecimal("1234.56");
      return { minorUnits: amount, display: formatMoney(amount), tax19: formatMoney(1898) };
    }
  },
  {
    id: "validators",
    name: "@jdsalasc/solvejs-validators",
    title: "Structured validation codes",
    level: "Core",
    code: `validateEmail("dev@example.com")`,
    run: () => ({
      email: validateEmail("dev@example.com"),
      phone: validateCellphoneNumber("+573001234567", { allowInternational: true })
    })
  },
  {
    id: "string",
    name: "@jdsalasc/solvejs-string",
    title: "Safe text normalization",
    level: "Core",
    code: `slugify("Café & Code"); mask("4242424242424242")`,
    run: () => ({ slug: slugify("Café & Code"), masked: mask("4242424242424242", 4) })
  },
  {
    id: "list",
    name: "@jdsalasc/solvejs-list",
    title: "Array grouping and dedupe",
    level: "Core",
    code: `groupBy(uniqueBy(rows, row => row.id), row => row.team)`,
    run: () => {
      const rows = [
        { id: 1, team: "web" },
        { id: 1, team: "web" },
        { id: 2, team: "api" }
      ];
      return groupBy(uniqueBy(rows, (row) => row.id), (row) => row.team);
    }
  },
  {
    id: "objects",
    name: "@jdsalasc/solvejs-objects",
    title: "Nested paths and deep merge",
    level: "Core",
    code: `deepMerge({ app: { env: "dev" } }, { app: { port: 3000 } })`,
    run: () => {
      const merged = deepMerge({ app: { env: "dev" } }, { app: { port: 3000 } });
      return { merged, env: get(merged, "app.env") };
    }
  },
  {
    id: "numbers",
    name: "@jdsalasc/solvejs-numbers",
    title: "Safe math helpers",
    level: "Core",
    code: `safeDivide(10, 0, 0); roundTo(19.995, 2)`,
    run: () => ({ divideByZero: safeDivide(10, 0, 0), rounded: roundTo(19.995, 2) })
  },
  {
    id: "regex",
    name: "@jdsalasc/solvejs-regex",
    title: "Tested common patterns",
    level: "Core",
    code: `validateByName("a@b.co", "email"); escapeRegex("a.b")`,
    run: () => ({ email: validateByName("a@b.co", "email"), escaped: escapeRegex("a.b") })
  },
  {
    id: "url",
    name: "@jdsalasc/solvejs-url",
    title: "Deterministic URLs",
    level: "Core",
    code: `buildUrl("https://api.dev", { path: "users", query: { page: 2 } })`,
    run: () => ({
      url: buildUrl("https://api.dev", { path: "users", query: { page: 2, q: "pdf reports" } }),
      parsed: parseQuery("?page=2&tag=docs&tag=pdf")
    })
  },
  {
    id: "json",
    name: "@jdsalasc/solvejs-json",
    title: "Stable JSON and deep clone",
    level: "Core",
    code: `stableStringify({ b: 1, a: 2 })`,
    run: () => ({ stable: stableStringify({ b: 1, a: 2 }), clone: deepClone({ nested: { ok: true } }) })
  },
  {
    id: "pagination",
    name: "@jdsalasc/solvejs-pagination",
    title: "Pages, offsets and cursors",
    level: "Core",
    code: `paginate(items, { page: 2, perPage: 10 })`,
    run: () => paginate([1, 2, 3, 4, 5], { page: 2, perPage: 2 })
  },
  {
    id: "semver",
    name: "@jdsalasc/solvejs-semver",
    title: "Ranges and version bumps",
    level: "Core",
    code: `satisfies("1.9.0", "^1.2.3")`,
    run: () => ({
      satisfies: satisfies("1.9.0", "^1.2.3"),
      max: maxSatisfying(["1.0.0", "1.4.2", "2.0.0"], "^1.0.0")
    })
  },
  {
    id: "errors",
    name: "@jdsalasc/solvejs-errors",
    title: "Stable application errors",
    level: "Infra",
    code: `errorToResponse(createError("NOT_FOUND", "No user"))`,
    run: () => errorToResponse(createError("NOT_FOUND", "No user with id 42."))
  },
  {
    id: "http",
    name: "@jdsalasc/solvejs-http",
    title: "HTTP status and negotiation",
    level: "Infra",
    code: `negotiateContentType(["application/json"], { accept: "text/html,application/json;q=0.9" })`,
    run: () => ({
      chosen: negotiateContentType(["application/json"], { accept: "text/html,application/json;q=0.9" }),
      retryDelay: calculateBackoffDelay(2, { baseMs: 100, factor: 2, maxMs: 2000, jitter: false }),
      status: HTTP_STATUS.TOO_MANY_REQUESTS
    })
  },
  {
    id: "cache",
    name: "@jdsalasc/solvejs-cache",
    title: "TTL and LRU caches",
    level: "Infra",
    code: `const cache = createTtlCache({ ttlMs: 1000 }); cache.set("k", "v")`,
    run: () => {
      const cache = createTtlCache({ ttlMs: 1000, now: () => 0 });
      cache.set("user:42", "Ada");
      return { key: stableKey({ userId: 42 }), value: cache.get("user:42"), size: cache.size() };
    }
  },
  {
    id: "async",
    name: "@jdsalasc/solvejs-async",
    title: "Retries and bounded concurrency",
    level: "Infra",
    code: `await pMap([1,2,3], async n => n * 2, { concurrency: 2 })`,
    run: async () => ({
      mapped: await pMap([1, 2, 3], async (n) => n * 2, { concurrency: 2 }),
      retried: await retry(() => 42, { retries: 1, delayMs: 0 })
    })
  },
  {
    id: "env",
    name: "@jdsalasc/solvejs-env",
    title: "Fail-fast environment parsing",
    level: "Infra",
    code: `getEnvNumber("PORT", { PORT: "3000" })`,
    run: () => ({ port: getEnvNumber("PORT", { PORT: "3000" }), timeout: TIME.SECOND_MS })
  },
  {
    id: "schema",
    name: "@jdsalasc/solvejs-schema",
    title: "Typed runtime schemas",
    level: "Infra",
    code: `s.object({ id: s.string(), age: s.number().int() }).parse(input)`,
    run: () => {
      const User = s.object({ id: s.string(), age: s.number().int() });
      return User.parse({ id: "u1", age: 42 });
    }
  },
  {
    id: "constants",
    name: "@jdsalasc/solvejs-constants",
    title: "Typed constants",
    level: "Infra",
    code: `HTTP_STATUS.OK; TIME.MINUTE_MS`,
    run: () => ({ ok: HTTP_STATUS.OK, minute: TIME.MINUTE_MS })
  },
  {
    id: "meta",
    name: "@jdsalasc/solvejs",
    title: "One import surface",
    level: "Meta",
    code: `import { slugify, formatDate } from "@jdsalasc/solvejs"`,
    run: () => ({ slug: metaSlugify("One Import Surface"), date: metaFormatDate(new Date("2026-11-16T00:00:00Z")) })
  }
];

const GROUPS = ["Flagship", "Core", "Infra", "Meta"];
const nav = document.querySelector("#package-nav");
const content = document.querySelector("#package-content");
const count = document.querySelector("#package-count");
const search = document.querySelector("#package-search");
const packageName = document.querySelector("#package-name");
const packageTitle = document.querySelector("#package-title");
const packageLevel = document.querySelector("#package-level");
const packageNpm = document.querySelector("#package-npm");
if (count) count.textContent = `${PACKAGES.length} packages`;

let active = PACKAGES[0];
let cleanup = () => {};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function codeCard(label, code) {
  const card = el("section", "package-code");
  const head = el("div", "package-code-head");
  head.append(el("span", undefined, label), el("span", undefined, "ESM · zero deps"));
  const pre = el("pre");
  const codeNode = el("code", undefined, code);
  pre.append(codeNode);
  card.append(head, pre);
  return { card, codeNode };
}

function resultCard() {
  const card = el("section", "package-result");
  const head = el("div", "package-result-head");
  const label = el("span", undefined, "Live result");
  const run = el("button", "result-run", "Run again");
  run.type = "button";
  head.append(label, run);
  const output = el("pre", "live-output");
  card.append(head, output);
  return { card, output, run };
}

function renderSimple(pkg) {
  const grid = el("div", "package-grid");
  const code = codeCard("Code", pkg.code);
  const result = resultCard();
  grid.append(code.card, result.card);
  content.replaceChildren(grid);

  async function execute() {
    result.output.classList.remove("is-error");
    result.output.textContent = "Running…";
    try {
      const value = await Promise.resolve().then(pkg.run);
      result.output.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    } catch (error) {
      result.output.classList.add("is-error");
      result.output.textContent = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }
  }
  result.run.addEventListener("click", execute);
  execute();
  return () => {};
}

function setActive(pkg) {
  active = pkg;
  for (const button of nav.querySelectorAll(".nav-item")) {
    const selected = button.dataset.id === pkg.id;
    button.classList.toggle("is-active", selected);
    if (selected) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  }
  packageName.textContent = pkg.name;
  packageTitle.textContent = pkg.title;
  packageLevel.textContent = pkg.level.toUpperCase();
  packageNpm.href = `https://www.npmjs.com/package/${pkg.name}`;
  cleanup();
  content.replaceChildren();
  cleanup =
    pkg.demo === "pdf"
      ? renderPdfDemo(content)
      : pkg.demo === "xlsx"
        ? renderXlsxDemo(content)
        : renderSimple(pkg);
}

function select(id, updateHash = true) {
  const pkg = PACKAGES.find((candidate) => candidate.id === id) ?? PACKAGES[0];
  if (pkg === active && content.childElementCount > 0) return;
  setActive(pkg);
  if (updateHash) history.replaceState(null, "", `#pkg-${pkg.id}`);
}

for (const group of GROUPS) {
  const packages = PACKAGES.filter((pkg) => pkg.level === group);
  const section = el("div", "nav-group");
  const heading = el("h3", "nav-group-label", group);
  heading.append(el("span", undefined, String(packages.length)));
  section.append(heading);
  for (const pkg of packages) {
    const button = el("button", "nav-item");
    button.type = "button";
    button.dataset.id = pkg.id;
    button.title = pkg.title;
    const dot = el("span", "nav-dot");
    dot.dataset.level = pkg.level.toLowerCase();
    const label = el("span", "nav-name", pkg.name.replace("@jdsalasc/solvejs", "solvejs"));
    const arrow = el("span", "nav-arrow", "→");
    button.append(dot, label, arrow);
    button.addEventListener("click", () => select(pkg.id));
    section.append(button);
  }
  nav.append(section);
}

search.addEventListener("input", () => {
  const query = search.value.trim().toLowerCase();
  for (const section of nav.querySelectorAll(".nav-group")) {
    let visible = 0;
    for (const button of section.querySelectorAll(".nav-item")) {
      const pkg = PACKAGES.find((candidate) => candidate.id === button.dataset.id);
      const match = !query || `${pkg.name} ${pkg.title} ${pkg.level}`.toLowerCase().includes(query);
      button.hidden = !match;
      if (match) visible += 1;
    }
    section.hidden = visible === 0;
  }
});

const initial = location.hash.startsWith("#pkg-") ? location.hash.slice(5) : "pdf";
select(initial, false);

window.addEventListener("hashchange", () => {
  if (location.hash.startsWith("#pkg-")) select(location.hash.slice(5), false);
});

const formLab = renderFormLab({
  status: document.querySelector("#form-status"),
  fields: document.querySelector("#form-fields"),
  meta: document.querySelector("#form-meta"),
  viewer: document.querySelector("#form-viewer"),
  upload: document.querySelector("#form-upload"),
  sample: document.querySelector("#form-sample"),
  json: document.querySelector("#form-json"),
  filled: document.querySelector("#form-filled")
});
void formLab;
