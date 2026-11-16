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
import { Bookmark, Pdf, PdfPage, Text, renderPdf } from "@jdsalasc/solvejs-pdf";
import { escapeRegex, validateByName } from "@jdsalasc/solvejs-regex";
import { s } from "@jdsalasc/solvejs-schema";
import { maxSatisfying, satisfies } from "@jdsalasc/solvejs-semver";
import { mask, slugify } from "@jdsalasc/solvejs-string";
import { buildUrl, parseQuery } from "@jdsalasc/solvejs-url";
import { validateCellphoneNumber, validateEmail } from "@jdsalasc/solvejs-validators";
import { writeXlsx } from "@jdsalasc/solvejs-xlsx";

const PACKAGES = [
  {
    name: "@jdsalasc/solvejs-pdf",
    title: "PDF generation + viewer",
    level: "Flagship",
    code: `Pdf({ children: PdfPage({ children: [
  Bookmark({ title: "Intro" }),
  Text({ value: "Hello", bold: true, italic: true })
]) })`,
    run: () => {
      const bytes = renderPdf(
        Pdf({
          title: "Live PDF",
          children: PdfPage({
            children: [
              Bookmark({ title: "Intro" }),
              Text({ value: "Hello", bold: true, italic: true, textTransform: "uppercase", underline: true }),
              Text({ value: "Pay within 15 days", color: "#4F8CFF", fontSize: 10 })
            ]
          })
        })
      );
      return { bytes: bytes.byteLength, signature: new TextDecoder().decode(bytes.subarray(0, 8)) };
    }
  },
  {
    name: "@jdsalasc/solvejs-xlsx",
    title: "XLSX writer + reader",
    level: "Flagship",
    code: `writeXlsx({ sheets: [{ name: "Orders", rows, dataValidations }] })`,
    run: () => {
      const bytes = writeXlsx({
        sheets: [
          {
            name: "Orders",
            columns: [{ header: "Status", width: 16 }, { header: "Qty", width: 10 }],
            rows: [["open", 2]],
            dataValidations: [{ range: "A2:A50", type: "list", values: ["open", "paid"] }]
          }
        ]
      });
      return { bytes: bytes.byteLength, sheet: "Orders", validation: "A2:A50 list" };
    }
  },
  {
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
    name: "@jdsalasc/solvejs-string",
    title: "Safe text normalization",
    level: "Core",
    code: `slugify("Café & Code"); mask("4242424242424242")`,
    run: () => ({ slug: slugify("Café & Code"), masked: mask("4242424242424242", 4) })
  },
  {
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
    name: "@jdsalasc/solvejs-numbers",
    title: "Safe math helpers",
    level: "Core",
    code: `safeDivide(10, 0, 0); roundTo(19.995, 2)`,
    run: () => ({ divideByZero: safeDivide(10, 0, 0), rounded: roundTo(19.995, 2) })
  },
  {
    name: "@jdsalasc/solvejs-regex",
    title: "Tested common patterns",
    level: "Core",
    code: `validateByName("a@b.co", "email"); escapeRegex("a.b")`,
    run: () => ({ email: validateByName("a@b.co", "email"), escaped: escapeRegex("a.b") })
  },
  {
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
    name: "@jdsalasc/solvejs-json",
    title: "Stable JSON and deep clone",
    level: "Core",
    code: `stableStringify({ b: 1, a: 2 })`,
    run: () => ({ stable: stableStringify({ b: 1, a: 2 }), clone: deepClone({ nested: { ok: true } }) })
  },
  {
    name: "@jdsalasc/solvejs-pagination",
    title: "Pages, offsets and cursors",
    level: "Core",
    code: `paginate(items, { page: 2, perPage: 10 })`,
    run: () => paginate([1, 2, 3, 4, 5], { page: 2, perPage: 2 })
  },
  {
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
    name: "@jdsalasc/solvejs-errors",
    title: "Stable application errors",
    level: "Infra",
    code: `errorToResponse(createError("NOT_FOUND", "No user"))`,
    run: () => errorToResponse(createError("NOT_FOUND", "No user with id 42."))
  },
  {
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
    name: "@jdsalasc/solvejs-env",
    title: "Fail-fast environment parsing",
    level: "Infra",
    code: `getEnvNumber("PORT", { PORT: "3000" })`,
    run: () => ({ port: getEnvNumber("PORT", { PORT: "3000" }), timeout: TIME.SECOND_MS })
  },
  {
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
    name: "@jdsalasc/solvejs-constants",
    title: "Typed constants",
    level: "Infra",
    code: `HTTP_STATUS.OK; TIME.MINUTE_MS`,
    run: () => ({ ok: HTTP_STATUS.OK, minute: TIME.MINUTE_MS })
  },
  {
    name: "@jdsalasc/solvejs",
    title: "One import surface",
    level: "Meta",
    code: `import { slugify, formatDate } from "@jdsalasc/solvejs"`,
    run: () => ({ slug: metaSlugify("One Import Surface"), date: metaFormatDate(new Date("2026-11-16T00:00:00Z")) })
  }
];

const tabs = document.querySelector("#package-tabs");
const code = document.querySelector("#package-code");
const output = document.querySelector("#package-output");
const name = document.querySelector("#package-name");
const level = document.querySelector("#package-level");
const count = document.querySelector("#package-count");
if (count) count.textContent = `${PACKAGES.length} packages`;

let active = 0;

function select(index) {
  active = index;
  const pkg = PACKAGES[index];
  tabs.querySelectorAll(".package-tab").forEach((tab, tabIndex) => {
    tab.setAttribute("aria-selected", String(tabIndex === index));
  });
  name.textContent = pkg.name;
  level.textContent = `${pkg.level} · ${pkg.title}`;
  code.textContent = pkg.code;
  output.textContent = "Running...";
  Promise.resolve()
    .then(pkg.run)
    .then((result) => {
      output.textContent = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    })
    .catch((error) => {
      output.textContent = error instanceof Error ? error.message : String(error);
    });
}

for (const [index, pkg] of PACKAGES.entries()) {
  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "package-tab";
  tab.setAttribute("role", "tab");
  tab.setAttribute("aria-selected", String(index === 0));
  tab.textContent = pkg.name.replace("@jdsalasc/solvejs", "solvejs");
  tab.addEventListener("click", () => select(index));
  tabs.append(tab);
}
select(active);
