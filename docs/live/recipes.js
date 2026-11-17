import { retry } from "@jdsalasc/solvejs-async";
import { memoizeAsync } from "@jdsalasc/solvejs-cache";
import { addBusinessDays, formatDate, parseIsoDate, toIsoDate } from "@jdsalasc/solvejs-date";
import { calculateBackoffDelay } from "@jdsalasc/solvejs-http";
import { applyMergePatch, deepEqual, getJsonPointer, stableStringify } from "@jdsalasc/solvejs-json";
import { applyPercentage, formatMoney, fromDecimal, sumMoney } from "@jdsalasc/solvejs-money";
import { deepMerge } from "@jdsalasc/solvejs-objects";
import { offsetToCursor, pageCount, paginate } from "@jdsalasc/solvejs-pagination";
import { normalizeWhitespace } from "@jdsalasc/solvejs-string";
import { buildUrl } from "@jdsalasc/solvejs-url";
import { validateEmail, validateUsername } from "@jdsalasc/solvejs-validators";

const RECIPES = [
  {
    id: "api-input",
    title: "Sanitize then validate",
    description: "Clean user input with the string package and return the stable validation envelope from the validators package.",
    packages: ["string", "validators"],
    code: `const email = normalizeWhitespace("  ADA@EXAMPLE.COM  ").toLowerCase();
const emailResult = validateEmail(email);
const usernameResult = validateUsername("Ada Lovelace");

({ email, emailResult, usernameResult })`,
    run: () => {
      const email = normalizeWhitespace("  ADA@EXAMPLE.COM  ").toLowerCase();
      return {
        email,
        emailResult: validateEmail(email),
        usernameResult: validateUsername("Ada Lovelace")
      };
    }
  },
  {
    id: "money-date",
    title: "Invoice total and due date",
    description: "Parse decimal strings into minor units, sum and tax them without floating point drift, then add five business days.",
    packages: ["money", "date"],
    code: `const lines = ["19.99", "5.00", "120.00"].map(fromDecimal);
const subtotal = sumMoney(lines);
const tax = applyPercentage(subtotal, 8);
const total = sumMoney([subtotal, tax]);
const due = addBusinessDays(parseIsoDate("2026-11-17"), 5);

({ subtotal: formatMoney(subtotal), tax: formatMoney(tax),
   total: formatMoney(total), due: toIsoDate(due),
   pretty: formatDate(due, "DD/MM/YYYY") })`,
    run: () => {
      const lines = ["19.99", "5.00", "120.00"].map((value) => fromDecimal(value));
      const subtotal = sumMoney(lines);
      const tax = applyPercentage(subtotal, 8);
      const total = sumMoney([subtotal, tax]);
      const due = addBusinessDays(parseIsoDate("2026-11-17"), 5);
      return {
        subtotal: formatMoney(subtotal),
        tax: formatMoney(tax),
        total: formatMoney(total),
        due: toIsoDate(due),
        pretty: formatDate(due, "DD/MM/YYYY")
      };
    }
  },
  {
    id: "retry",
    title: "Retry with backoff",
    description: "Retry an operation that fails twice, and show the deterministic delay schedule the HTTP package produces for each attempt.",
    packages: ["async", "http"],
    code: `let attempts = 0;
const result = await retry(async () => {
  attempts += 1;
  if (attempts < 3) throw new Error("503 Service Unavailable");
  return { ok: true, attempts };
}, { retries: 3, delayMs: 1 });

({ result, delays: [1, 2, 3].map(attempt =>
  calculateBackoffDelay(attempt, { baseMs: 100, factor: 2, maxMs: 1000, jitter: false })
) })`,
    run: async () => {
      let attempts = 0;
      const result = await retry(
        async () => {
          attempts += 1;
          if (attempts < 3) throw new Error("503 Service Unavailable");
          return { ok: true, attempts };
        },
        { retries: 3, delayMs: 1 }
      );
      return {
        result,
        delays: [1, 2, 3].map((attempt) =>
          calculateBackoffDelay(attempt, { baseMs: 100, factor: 2, maxMs: 1000, jitter: false })
        )
      };
    }
  },
  {
    id: "cache",
    title: "Memoize async work",
    description: "Deduplicate a slow lookup by argument and keep the cached value for a TTL. The second call returns without touching the source.",
    packages: ["cache"],
    code: `let calls = 0;
const loadUser = memoizeAsync(async (id) => {
  calls += 1;
  return { id, source: "database" };
}, { ttlMs: 60_000 });

const first = await loadUser("usr_42");
const second = await loadUser("usr_42");

({ first, second, calls, sameReference: first === second })`,
    run: async () => {
      let calls = 0;
      const loadUser = memoizeAsync(
        async (id) => {
          calls += 1;
          return { id, source: "database" };
        },
        { ttlMs: 60_000 }
      );
      const first = await loadUser("usr_42");
      const second = await loadUser("usr_42");
      return { first, second, calls, sameReference: first === second };
    }
  },
  {
    id: "pagination",
    title: "Paginate into a cursor URL",
    description: "Slice a list into a page envelope, count the total pages and turn the offset into a cursor for the next request.",
    packages: ["pagination", "url"],
    code: `const rows = ["A", "B", "C", "D", "E"];
const page = paginate(rows, { page: 2, perPage: 2 });
const cursor = offsetToCursor(2);

({ page, pages: pageCount(rows.length, 2), cursor,
   nextUrl: buildUrl("https://api.example.com/items",
     { query: { cursor, limit: "2" } }) })`,
    run: () => {
      const rows = ["A", "B", "C", "D", "E"];
      const cursor = offsetToCursor(2);
      return {
        page: paginate(rows, { page: 2, perPage: 2 }),
        pages: pageCount(rows.length, 2),
        cursor,
        nextUrl: buildUrl("https://api.example.com/items", { query: { cursor, limit: "2" } })
      };
    }
  },
  {
    id: "config",
    title: "Merge config and hash it",
    description: "Deep-merge defaults with environment overrides, compare the result structurally and produce a stable JSON string.",
    packages: ["objects", "json"],
    code: `const defaults = { theme: { color: "blue", radius: 8 }, features: ["pdf"], retries: 2 };
const overrides = { theme: { radius: 12 }, features: ["pdf", "xlsx"] };
const expected = { theme: { color: "blue", radius: 12 }, features: ["pdf", "xlsx"], retries: 2 };
const merged = deepMerge(defaults, overrides);

({ merged, sameAsExpected: deepEqual(merged, expected), json: stableStringify(merged) })`,
    run: () => {
      const defaults = { theme: { color: "blue", radius: 8 }, features: ["pdf"], retries: 2 };
      const overrides = { theme: { radius: 12 }, features: ["pdf", "xlsx"] };
      const merged = deepMerge(defaults, overrides);
      const expected = { theme: { color: "blue", radius: 12 }, features: ["pdf", "xlsx"], retries: 2 };
      return {
        merged,
        sameAsExpected: deepEqual(merged, expected),
        json: stableStringify(merged)
      };
    }
  },
  {
    id: "merge-patch",
    title: "Patch a JSON document",
    description: "Apply an RFC 7386 merge patch and read nested values with an RFC 6901 pointer, without mutating the original document.",
    packages: ["json"],
    code: `const current = { name: "Ada", address: { city: "London", zip: "N1" }, tags: ["math"] };
const patch = { address: { zip: null }, tags: ["code"], active: true };
const next = applyMergePatch(current, patch);

({ next, city: getJsonPointer(next, "/address/city"),
   originalZip: getJsonPointer(current, "/address/zip") })`,
    run: () => {
      const current = { name: "Ada", address: { city: "London", zip: "N1" }, tags: ["math"] };
      const patch = { address: { zip: null }, tags: ["code"], active: true };
      const next = applyMergePatch(current, patch);
      return {
        next,
        city: getJsonPointer(next, "/address/city"),
        originalZip: getJsonPointer(current, "/address/zip")
      };
    }
  }
];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function copyText(button, text) {
  const result = navigator.clipboard?.writeText(text);
  if (!result) return;
  await result.then(
    () => {
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = "Copy";
      }, 1200);
    },
    () => undefined
  );
}

// eslint-disable-next-line max-lines-per-function -- one renderer wires the tab list, code card and output
export function renderRecipes(container) {
  if (!container) return;
  let selected = 0;
  let runToken = 0;

  const layout = el("div", "recipes-layout");
  const list = el("div", "recipe-list");
  const work = el("article", "recipe-work");
  const head = el("div", "recipe-head");
  const heading = el("div");
  const title = el("h3");
  const packages = el("div", "recipe-packages");
  heading.append(title, packages);
  const actions = el("div", "recipe-actions");
  const runButton = el("button", "live-button", "Run again");
  runButton.type = "button";
  actions.append(runButton);
  head.append(heading, actions);

  const description = el("p", "live-caption");
  const codeWrap = el("div", "recipe-code-wrap");
  const code = el("pre", "recipe-code");
  const codeCopy = el("button", "copy-code", "Copy");
  codeCopy.type = "button";
  codeWrap.append(code, codeCopy);
  const outputHead = el("div", "recipe-output-head");
  const outputLabel = el("span", "panel-kicker", "OUTPUT");
  const outputCopy = el("button", "copy-code", "Copy");
  outputCopy.type = "button";
  outputHead.append(outputLabel, outputCopy);
  const output = el("pre", "live-output recipe-output");
  output.setAttribute("aria-live", "polite");
  work.append(head, description, codeWrap, outputHead, output);

  RECIPES.forEach((recipe, index) => {
    const button = el("button", "recipe-tab");
    button.type = "button";
    button.dataset.recipe = recipe.id;
    button.append(el("span", undefined, String(index + 1).padStart(2, "0")), el("strong", undefined, recipe.title));
    button.addEventListener("click", () => select(index));
    list.append(button);
  });

  function paint() {
    const recipe = RECIPES[selected];
    for (const button of list.children) {
      const active = button.dataset.recipe === recipe.id;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    }
    title.textContent = recipe.title;
    description.textContent = recipe.description;
    packages.replaceChildren(
      ...recipe.packages.map((name) => el("span", "recipe-package", `solvejs-${name}`))
    );
    code.textContent = recipe.code;
    output.textContent = "Running…";
    output.classList.remove("is-error");
  }

  async function execute() {
    const recipe = RECIPES[selected];
    const token = ++runToken;
    output.textContent = "Running…";
    output.classList.remove("is-error");
    try {
      const value = await recipe.run();
      // eslint-disable-next-line security/detect-possible-timing-attacks -- request counter, not a secret
      if (token !== runToken) return;
      output.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    } catch (error) {
      // eslint-disable-next-line security/detect-possible-timing-attacks -- request counter, not a secret
      if (token !== runToken) return;
      output.classList.add("is-error");
      output.textContent = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }
  }

  function select(index) {
    selected = index;
    paint();
    execute();
  }

  runButton.addEventListener("click", execute);
  codeCopy.addEventListener("click", () => copyText(codeCopy, code.textContent ?? ""));
  outputCopy.addEventListener("click", () => copyText(outputCopy, output.textContent ?? ""));

  layout.append(list, work);
  container.append(layout);
  select(0);
}

renderRecipes(document.querySelector("#recipes-host"));
