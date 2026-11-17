import { formatDate as metaFormatDate, slugify as metaSlugify } from "@jdsalasc/solvejs";
import { pMap, retry } from "@jdsalasc/solvejs-async";
import { createTtlCache, stableKey } from "@jdsalasc/solvejs-cache";
import { HTTP_STATUS, TIME } from "@jdsalasc/solvejs-constants";
import { addDays, parseDateStrict } from "@jdsalasc/solvejs-date";
import { nanoid, prefixedId, randomToken, ulid, uuidTimestamp, uuidv4, uuidv7 } from "@jdsalasc/solvejs-id";
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
import { renderApiBrowser } from "./api-browser.js";

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
    },
    variants: [
      {
        label: "Negative offset",
        code: `addDays(parseDateStrict("2026-11-16"), -7)`,
        run: () => {
          const start = parseDateStrict("2026-11-16", "YYYY-MM-DD");
          return { start: metaFormatDate(start), minus7: metaFormatDate(addDays(start, -7)) };
        }
      }
    ]
  },
  {
    id: "id",
    name: "@jdsalasc/solvejs-id",
    title: "UUID, ULID, NanoID and prefixed IDs",
    level: "Core",
    code: `prefixedId("usr")`,
    run: () => {
      const event = uuidv7();
      return {
        uuidv4: uuidv4(),
        uuidv7: event,
        eventTime: uuidTimestamp(event)?.toISOString(),
        ulid: ulid(),
        nano: nanoid(12),
        user: prefixedId("usr"),
        token: randomToken(16)
      };
    },
    variants: [
      {
        label: "Deterministic",
        code: `uuidv7({ now: () => 0, random: size => new Uint8Array(size) })`,
        run: () => {
          const source = { now: () => 0, random: (size) => new Uint8Array(size) };
          return { uuidv7: uuidv7(source), ulid: ulid(source), nano: nanoid(8, source) };
        }
      }
    ]
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
    },
    variants: [
      {
        label: "Small amounts",
        code: `formatMoney(fromDecimal("0.05"))`,
        run: () => {
          const amount = fromDecimal("0.05");
          return { minorUnits: amount, display: formatMoney(amount) };
        }
      }
    ]
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
    }),
    variants: [
      {
        label: "Invalid input",
        code: `validateEmail("not-an-email")`,
        run: () => ({
          email: validateEmail("not-an-email"),
          phone: validateCellphoneNumber("12")
        })
      }
    ]
  },
  {
    id: "string",
    name: "@jdsalasc/solvejs-string",
    title: "Safe text normalization",
    level: "Core",
    code: `slugify("Café & Code"); mask("4242424242424242")`,
    run: () => ({ slug: slugify("Café & Code"), masked: mask("4242424242424242", 4) }),
    variants: [
      {
        label: "Punctuation",
        code: `slugify("Hello, World!"); mask("1234567890", 2)`,
        run: () => ({ slug: slugify("Hello, World!"), masked: mask("1234567890", 2) })
      }
    ]
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
    },
    variants: [
      {
        label: "Dedupe only",
        code: `uniqueBy([{id:1},{id:1},{id:2}], row => row.id)`,
        run: () => uniqueBy([{ id: 1 }, { id: 1 }, { id: 2 }], (row) => row.id)
      }
    ]
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
    },
    variants: [
      {
        label: "Deep path",
        code: `get({ app: { db: { port: 5432 } } }, "app.db.port")`,
        run: () => ({ port: get({ app: { db: { port: 5432 } } }, "app.db.port") })
      }
    ]
  },
  {
    id: "numbers",
    name: "@jdsalasc/solvejs-numbers",
    title: "Safe math helpers",
    level: "Core",
    code: `safeDivide(10, 0, 0); roundTo(19.995, 2)`,
    run: () => ({ divideByZero: safeDivide(10, 0, 0), rounded: roundTo(19.995, 2) }),
    variants: [
      {
        label: "Real division",
        code: `safeDivide(10, 4); roundTo(-1.005, 2)`,
        run: () => ({ divided: safeDivide(10, 4), rounded: roundTo(-1.005, 2) })
      }
    ]
  },
  {
    id: "regex",
    name: "@jdsalasc/solvejs-regex",
    title: "Tested common patterns",
    level: "Core",
    code: `validateByName("a@b.co", "email"); escapeRegex("a.b")`,
    run: () => ({ email: validateByName("a@b.co", "email"), escaped: escapeRegex("a.b") }),
    variants: [
      {
        label: "Invalid email",
        code: `validateByName("not-an-email", "email")`,
        run: () => ({ email: validateByName("not-an-email", "email") })
      }
    ]
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
    }),
    variants: [
      {
        label: "Repeated tags",
        code: `parseQuery("?tag=docs&tag=pdf&tag=api")`,
        run: () => ({ parsed: parseQuery("?tag=docs&tag=pdf&tag=api") })
      }
    ]
  },
  {
    id: "json",
    name: "@jdsalasc/solvejs-json",
    title: "Stable JSON and deep clone",
    level: "Core",
    code: `stableStringify({ b: 1, a: 2 })`,
    run: () => ({ stable: stableStringify({ b: 1, a: 2 }), clone: deepClone({ nested: { ok: true } }) }),
    variants: [
      {
        label: "Clone independence",
        code: `const clone = deepClone(source); clone.nested.ok = false`,
        run: () => {
          const source = { nested: { ok: true } };
          const clone = deepClone(source);
          clone.nested.ok = false;
          return { source: source.nested.ok, clone: clone.nested.ok };
        }
      }
    ]
  },
  {
    id: "pagination",
    name: "@jdsalasc/solvejs-pagination",
    title: "Pages, offsets and cursors",
    level: "Core",
    code: `paginate(items, { page: 2, perPage: 10 })`,
    run: () => paginate([1, 2, 3, 4, 5], { page: 2, perPage: 2 }),
    variants: [
      {
        label: "First page",
        code: `paginate([1,2,3,4,5], { page: 1, perPage: 2 })`,
        run: () => paginate([1, 2, 3, 4, 5], { page: 1, perPage: 2 })
      }
    ]
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
    }),
    variants: [
      {
        label: "Outside range",
        code: `satisfies("2.0.0", "^1.2.3")`,
        run: () => ({ satisfies: satisfies("2.0.0", "^1.2.3") })
      }
    ]
  },
  {
    id: "errors",
    name: "@jdsalasc/solvejs-errors",
    title: "Stable application errors",
    level: "Infra",
    code: `errorToResponse(createError("NOT_FOUND", "No user"))`,
    run: () => errorToResponse(createError("NOT_FOUND", "No user with id 42.")),
    variants: [
      {
        label: "Validation error",
        code: `errorToResponse(createError("VALIDATION_FAILED", "Email is required."))`,
        run: () => errorToResponse(createError("VALIDATION_FAILED", "Email is required."))
      }
    ]
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
    }),
    variants: [
      {
        label: "Retry schedule",
        code: `calculateBackoffDelay(3, { baseMs: 200, factor: 2, jitter: false })`,
        run: () => ({ retryDelay: calculateBackoffDelay(3, { baseMs: 200, factor: 2, maxMs: 5000, jitter: false }) })
      }
    ]
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
    },
    variants: [
      {
        label: "Expired entry",
        code: `cache.set("k", "v"); cache.get("k") // after ttl`,
        run: () => {
          let now = 0;
          const cache = createTtlCache({ ttlMs: 1000, now: () => now });
          cache.set("k", "v");
          const before = cache.get("k");
          now = 2000;
          return { before, after: cache.get("k") ?? null };
        }
      }
    ]
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
    }),
    variants: [
      {
        label: "Serial map",
        code: `await pMap([1,2,3], n => n * 3, { concurrency: 1 })`,
        run: async () => ({ mapped: await pMap([1, 2, 3], async (n) => n * 3, { concurrency: 1 }) })
      }
    ]
  },
  {
    id: "env",
    name: "@jdsalasc/solvejs-env",
    title: "Fail-fast environment parsing",
    level: "Infra",
    code: `getEnvNumber("PORT", { PORT: "3000" })`,
    run: () => ({ port: getEnvNumber("PORT", { PORT: "3000" }), timeout: TIME.SECOND_MS }),
    variants: [
      {
        label: "Invalid number",
        code: `getEnvNumber("PORT", { PORT: "not-a-number" })`,
        run: () => {
          try {
            return { port: getEnvNumber("PORT", { PORT: "not-a-number" }) };
          } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
          }
        }
      }
    ]
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
    },
    variants: [
      {
        label: "Invalid payload",
        code: `User.parse({ id: 1, age: "x" })`,
        run: () => {
          try {
            const User = s.object({ id: s.string(), age: s.number().int() });
            return User.parse({ id: 1, age: "x" });
          } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
          }
        }
      }
    ]
  },
  {
    id: "constants",
    name: "@jdsalasc/solvejs-constants",
    title: "Typed constants",
    level: "Infra",
    code: `HTTP_STATUS.OK; TIME.MINUTE_MS`,
    run: () => ({ ok: HTTP_STATUS.OK, minute: TIME.MINUTE_MS }),
    variants: [
      {
        label: "More constants",
        code: `HTTP_STATUS.NOT_FOUND; TIME.HOUR_MS`,
        run: () => ({ notFound: HTTP_STATUS.NOT_FOUND, hour: TIME.HOUR_MS })
      }
    ]
  },
  {
    id: "meta",
    name: "@jdsalasc/solvejs",
    title: "One import surface",
    level: "Meta",
    code: `import { slugify, formatDate } from "@jdsalasc/solvejs"`,
    run: () => ({ slug: metaSlugify("One Import Surface"), date: metaFormatDate(new Date("2026-11-16T00:00:00Z")) }),
    variants: [
      {
        label: "Another date",
        code: `formatDate(new Date("2027-01-01T00:00:00Z"))`,
        run: () => ({ date: metaFormatDate(new Date("2027-01-01T00:00:00Z")) })
      }
    ]
  }
];

const GROUPS = ["Flagship", "Core", "Infra", "Meta"];
const RELATED = {
  pdf: ["xlsx", "money", "date"],
  xlsx: ["pdf", "money", "json"],
  date: ["money", "pagination", "async"],
  id: ["json", "url", "schema"],
  money: ["date", "xlsx", "numbers"],
  validators: ["string", "errors", "schema"],
  string: ["validators", "url", "json"],
  list: ["pagination", "objects", "json"],
  regex: ["validators", "string", "constants"],
  constants: ["http", "errors"],
  numbers: ["money", "validators", "list"],
  objects: ["json", "env", "cache"],
  async: ["cache", "http", "errors"],
  env: ["objects", "schema", "errors"],
  schema: ["validators", "errors", "json"],
  url: ["string", "http", "pagination"],
  cache: ["async", "http", "json"],
  json: ["objects", "cache", "http"],
  pagination: ["url", "date", "list"],
  semver: ["errors", "json"],
  errors: ["http", "validators", "json"],
  http: ["async", "cache", "errors"],
  meta: ["pdf", "xlsx", "date"]
};
const nav = document.querySelector("#package-nav");
const content = document.querySelector("#package-content");
const count = document.querySelector("#package-count");
const search = document.querySelector("#package-search");
const packageEmpty = document.querySelector("#package-empty");
const packageName = document.querySelector("#package-name");
const packageTitle = document.querySelector("#package-title");
const packageLevel = document.querySelector("#package-level");
const packageNpm = document.querySelector("#package-npm");
const packageLink = document.querySelector("#package-link");
const packageInstall = document.querySelector("#package-install");
const packageSource = document.querySelector("#package-source");
if (packageLink) {
  packageLink.addEventListener("click", () => {
    const result = navigator.clipboard?.writeText(location.href);
    result?.then(() => {
      packageLink.textContent = "Copied";
      setTimeout(() => {
        packageLink.textContent = "Copy link";
      }, 1200);
    });
  });
}
if (packageInstall) {
  packageInstall.addEventListener("click", () => {
    const result = navigator.clipboard?.writeText(packageInstall.textContent ?? "");
    result?.then(() => {
      const previous = packageInstall.textContent;
      packageInstall.textContent = "Copied";
      setTimeout(() => {
        packageInstall.textContent = previous;
      }, 1200);
    });
  });
}
if (count) count.textContent = `${PACKAGES.length} packages`;

let active = PACKAGES[0];
let cleanup = () => {};
let apiActive = false;

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

function relatedBlock(pkg) {
  const ids = RELATED[pkg.id] ?? [];
  if (ids.length === 0) return null;
  const wrap = el("div", "package-related");
  wrap.append(el("span", "package-related-label", "Pairs well with"));
  for (const id of ids) {
    const related = PACKAGES.find((candidate) => candidate.id === id);
    if (!related) continue;
    const link = el("a", "package-related-link", related.name.replace("@jdsalasc/solvejs", "solvejs"));
    link.href = `#pkg-${related.id}`;
    link.title = related.title;
    wrap.append(link);
  }
  return wrap;
}

function packagePager(pkg) {
  const index = PACKAGES.indexOf(pkg);
  const previous = index > 0 ? PACKAGES[index - 1] : undefined;
  const next = index < PACKAGES.length - 1 ? PACKAGES[index + 1] : undefined;
  const wrap = el("nav", "package-pager");
  wrap.setAttribute("aria-label", "Package navigation");
  for (const [direction, target, label] of [
    ["previous", previous, "Previous"],
    ["next", next, "Next"]
  ]) {
    if (!target) continue;
    const link = el("a", `package-page-link is-${direction}`);
    link.href = `#pkg-${target.id}`;
    link.append(
      el("span", "package-page-label", direction === "previous" ? `← ${label}` : `${label} →`),
      el("strong", undefined, target.name.replace("@jdsalasc/solvejs", "solvejs"))
    );
    wrap.append(link);
  }
  if (!previous) wrap.classList.add("only-next");
  if (!next) wrap.classList.add("only-previous");
  return wrap;
}

function renderSimple(pkg) {
  const examples = [
    { label: "Happy path", code: pkg.code, run: pkg.run },
    ...(pkg.variants ?? [])
  ];
  let current = 0;
  const grid = el("div", "package-grid");
  const code = codeCard("Code", examples[0].code);
  const result = resultCard();
  grid.append(code.card, result.card);

  const variants = el("div", "package-variants");
  examples.forEach((example, index) => {
    const button = el("button", "demo-pill", example.label);
    button.type = "button";
    button.classList.toggle("is-active", index === 0);
    button.addEventListener("click", () => {
      current = index;
      code.codeNode.textContent = example.code;
      for (const item of variants.children) item.classList.toggle("is-active", item === button);
      execute();
    });
    variants.append(button);
  });
  content.replaceChildren(...(examples.length > 1 ? [variants] : []), grid);

  async function execute() {
    result.output.classList.remove("is-error");
    result.output.textContent = "Running…";
    try {
      const value = await Promise.resolve().then(examples[current].run);
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

function enhanceCodeBlocks(root) {
  for (const pre of root.querySelectorAll("pre")) {
    if (pre.parentElement?.classList.contains("code-wrap")) continue;
    const wrap = el("div", "code-wrap");
    pre.before(wrap);
    wrap.append(pre);
    const button = el("button", "copy-code", "Copy");
    button.type = "button";
    button.addEventListener("click", () => {
      const result = navigator.clipboard?.writeText(pre.textContent ?? "");
      result?.then(
        () => {
          button.textContent = "Copied";
          setTimeout(() => {
            button.textContent = "Copy";
          }, 1200);
        },
        () => undefined
      );
    });
    wrap.append(button);
  }
}

// eslint-disable-next-line complexity -- package header, nav state and demo cleanup
function setActive(pkg) {
  active = pkg;
  apiActive = false;
  packageNpm.hidden = false;
  if (packageLink) packageLink.hidden = false;
  if (packageInstall) {
    packageInstall.hidden = false;
    packageInstall.textContent = `npm i ${pkg.name}`;
  }
  if (packageSource) {
    packageSource.hidden = false;
    const folder = pkg.name === "@jdsalasc/solvejs" ? "solvejs" : `solvejs-${pkg.id}`;
    packageSource.href = `https://github.com/jdsalasca/solvejs/tree/main/packages/${folder}`;
  }
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
  const related = relatedBlock(pkg);
  if (related) content.prepend(related);
  content.append(packagePager(pkg));
  enhanceCodeBlocks(content);
}

function selectApi(updateHash = true) {
  active = null;
  apiActive = true;
  for (const button of nav.querySelectorAll(".nav-item")) {
    const selected = button.dataset.id === "api";
    button.classList.toggle("is-active", selected);
    if (selected) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  }
  packageName.textContent = "API Reference";
  packageTitle.textContent = "Generated from the TypeScript declarations";
  packageLevel.textContent = "REFERENCE";
  packageNpm.hidden = true;
  if (packageLink) packageLink.hidden = true;
  if (packageInstall) packageInstall.hidden = true;
  if (packageSource) packageSource.hidden = true;
  cleanup();
  content.replaceChildren();
  cleanup = () => {};
  renderApiBrowser(content);
  if (updateHash) history.replaceState(null, "", "#api");
}

function select(id, updateHash = true) {
  const pkg = PACKAGES.find((candidate) => candidate.id === id) ?? PACKAGES[0];
  if (!apiActive && pkg === active && content.childElementCount > 0) return;
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

const reference = el("div", "nav-group");
const referenceHeading = el("h3", "nav-group-label", "Reference");
referenceHeading.append(el("span", undefined, "1"));
reference.append(referenceHeading);
const apiButton = el("button", "nav-item");
apiButton.type = "button";
apiButton.dataset.id = "api";
apiButton.title = "Generated API reference for every package";
const apiDot = el("span", "nav-dot");
apiDot.dataset.level = "reference";
apiButton.append(apiDot, el("span", "nav-name", "API Reference"), el("span", "nav-arrow", "→"));
apiButton.addEventListener("click", () => selectApi());
reference.append(apiButton);
nav.append(reference);

function filterNav(query) {
  let visibleTotal = 0;
  for (const section of nav.querySelectorAll(".nav-group")) {
    let visible = 0;
    for (const button of section.querySelectorAll(".nav-item")) {
      const pkg = PACKAGES.find((candidate) => candidate.id === button.dataset.id);
      const haystack =
        button.dataset.id === "api" ? "api reference types declarations signatures" : `${pkg.name} ${pkg.title} ${pkg.level}`;
      const match = !query || haystack.toLowerCase().includes(query);
      button.hidden = !match;
      if (match) visible += 1;
    }
    visibleTotal += visible;
    section.hidden = visible === 0;
  }
  return visibleTotal;
}

function isTypingTarget(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

function clearSearch() {
  if (document.activeElement !== search || !search.value) return;
  search.value = "";
  search.dispatchEvent(new Event("input"));
  search.blur();
}

search.addEventListener("input", () => {
  const query = search.value.trim().toLowerCase();
  const visibleTotal = filterNav(query);
  if (count) {
    count.textContent = query ? `${visibleTotal} of ${PACKAGES.length} packages` : `${PACKAGES.length} packages`;
  }
  if (packageEmpty) packageEmpty.hidden = visibleTotal > 0;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !isTypingTarget(event.target)) {
    event.preventDefault();
    (document.querySelector("#api-search") ?? search).focus();
    return;
  }
  if (event.key === "Escape") clearSearch();
});

const initial = location.hash.startsWith("#pkg-") ? location.hash.slice(5) : "pdf";
if (location.hash === "#api") selectApi(false);
else select(initial, false);

function revealExplorer(smooth = false) {
  const explorer = document.querySelector("#package-explorer");
  if (explorer) explorer.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "instant" });
}

if (location.hash.startsWith("#pkg-") || location.hash === "#api") {
  requestAnimationFrame(() => revealExplorer(false));
}

window.addEventListener("hashchange", () => {
  if (location.hash === "#api") selectApi(false);
  else if (location.hash.startsWith("#pkg-")) select(location.hash.slice(5), false);
  if (location.hash === "#api" || location.hash.startsWith("#pkg-")) revealExplorer(true);
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
