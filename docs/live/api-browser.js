/* eslint-disable complexity, max-lines-per-function -- API browser renders a searchable declaration index */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let cache;

async function loadApi() {
  if (!cache) {
    cache = fetch("./api.json").then((response) => {
      if (!response.ok) throw new Error("Could not load api.json.");
      return response.json();
    });
  }
  return cache;
}

function copy(text) {
  return navigator.clipboard?.writeText(text).catch(() => undefined);
}

export async function renderApiBrowser(container) {
  container.replaceChildren(el("p", "api-empty", "Loading API index…"));
  let data;
  try {
    data = await loadApi();
  } catch (error) {
    container.replaceChildren(
      el("p", "api-empty", `${error.message} Run npm run generate:api and redeploy the docs.`)
    );
    return;
  }

  const toolbar = el("div", "api-toolbar");
  const searchLabel = el("label", "api-field");
  searchLabel.append(el("span", undefined, "Search"));
  const search = el("input");
  search.type = "search";
  search.name = "api-search";
  search.id = "api-search";
  search.placeholder = "Function, type or description…";
  search.autocomplete = "off";
  searchLabel.append(search);

  const packageLabel = el("label", "api-field");
  packageLabel.append(el("span", undefined, "Package"));
  const select = el("select");
  select.name = "api-package";
  select.id = "api-package";
  const all = el("option", undefined, "All packages");
  all.value = "";
  select.append(all);
  for (const pkg of data.packages) {
    const option = el("option", undefined, `${pkg.name.replace("@jdsalasc/", "")} · ${pkg.version}`);
    option.value = pkg.name;
    select.append(option);
  }
  packageLabel.append(select)
  const count = el("span", "mini-pill", "");
  toolbar.append(searchLabel, packageLabel, count);

  const summary = el("p", "api-summary", "");
  const results = el("div", "api-results");
  container.replaceChildren(toolbar, summary, results);

  function render() {
    const query = search.value.trim().toLowerCase();
    const selected = select.value;
    const packages = data.packages.filter((pkg) => !selected || pkg.name === selected);
    const matches = [];
    for (const pkg of packages) {
      for (const entry of pkg.entries) {
        if (
          !query ||
          entry.name.toLowerCase().includes(query) ||
          entry.signature?.toLowerCase().includes(query) ||
          entry.doc?.toLowerCase().includes(query)
        ) {
          matches.push({ pkg, entry });
        }
      }
    }
    count.textContent = `${matches.length} entries`;
    summary.textContent = query
      ? `${matches.length} matches for “${search.value.trim()}”`
      : `${data.packages.length} packages · generated ${data.generatedAt}`;
    results.replaceChildren();
    if (matches.length === 0) {
      results.append(el("p", "api-empty", "No API entry matches that search."));
      return;
    }
    let current = "";
    let shown = 0;
    for (const match of matches) {
      if (shown >= 400) break;
      if (match.pkg.name !== current) {
        current = match.pkg.name;
        const heading = el("div", "api-package-head");
        const link = el("a", undefined, match.pkg.name);
        link.href = `https://www.npmjs.com/package/${match.pkg.name}`;
        link.target = "_blank";
        link.rel = "noreferrer";
        heading.append(link, el("span", "mini-pill", match.pkg.version));
        results.append(heading);
      }
      const card = el("article", "api-entry");
      const head = el("div", "api-entry-head");
      head.append(el("span", `api-kind api-kind-${match.entry.kind}`, match.entry.kind));
      head.append(el("code", "api-name", match.entry.name));
      const button = el("button", "api-copy", "Copy");
      button.type = "button";
      button.addEventListener("click", () => {
        copy(`${match.entry.name}\n${match.entry.signature ?? ""}`.trim());
        button.textContent = "Copied";
        setTimeout(() => {
          button.textContent = "Copy";
        }, 1200);
      });
      head.append(button);
      card.append(head);
      if (match.entry.signature) card.append(el("pre", "api-signature", match.entry.signature));
      if (match.entry.doc) card.append(el("p", "api-doc", match.entry.doc));
      results.append(card);
      shown += 1;
    }
    if (matches.length > shown) {
      results.append(el("p", "api-empty", `Showing the first ${shown} of ${matches.length}. Narrow the search to see the rest.`));
    }
  }

  search.addEventListener("input", render);
  select.addEventListener("change", render);
  render();
}
