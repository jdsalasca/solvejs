const TOPICS = [
  {
    id: "date-format",
    title: "Format and Parse Dates Safely",
    description: "Use strict parsing, UTC-safe formatting, and date math utilities.",
    path: "problems/date-format.html",
    tags: ["date", "format", "timezone", "parse"],
    packages: ["@jdsalasc/solvejs-date"],
    level: "Beginner"
  },
  {
    id: "form-validators",
    title: "Validate Form and API Inputs",
    description: "Return structured validation results with clear error codes.",
    path: "problems/form-validators.html",
    tags: ["validation", "forms", "api", "uuid", "ipv4"],
    packages: ["@jdsalasc/solvejs-validators"],
    level: "Intermediate"
  },
  {
    id: "array-and-numbers",
    title: "Transform Arrays and Run Safe Math",
    description: "Group, deduplicate, sort, and calculate percentages safely.",
    path: "problems/array-and-numbers.html",
    tags: ["array", "list", "number", "analytics"],
    packages: ["@jdsalasc/solvejs-list", "@jdsalasc/solvejs-numbers"],
    level: "Beginner"
  },
  {
    id: "string-format",
    title: "Normalize and Sanitize Strings",
    description: "Slugify, title-case, strip HTML, and truncate user-facing text.",
    path: "problems/string-format.html",
    tags: ["string", "slug", "sanitize", "ui"],
    packages: ["@jdsalasc/solvejs-string"],
    level: "Beginner"
  },
  {
    id: "regex-patterns",
    title: "Use Common Regex Patterns",
    description: "Apply tested patterns for emails, UUIDs, IPv4, and ISO dates.",
    path: "problems/regex-patterns.html",
    tags: ["regex", "security", "patterns"],
    packages: ["@jdsalasc/solvejs-regex"],
    level: "Intermediate"
  },
  {
    id: "object-utils",
    title: "Shape and Merge Objects",
    description: "Pick keys, set nested paths, and deep merge app configuration.",
    path: "problems/object-utils.html",
    tags: ["object", "deep merge", "nested path"],
    packages: ["@jdsalasc/solvejs-objects"],
    level: "Intermediate"
  },
  {
    id: "nextjs-integration",
    title: "Integrate SolveJS in Next.js",
    description: "Use validators and parsers in route handlers and server actions.",
    path: "guides/nextjs-integration.html",
    tags: ["nextjs", "integration", "api"],
    packages: ["@jdsalasc/solvejs-validators", "@jdsalasc/solvejs-numbers"],
    level: "Intermediate"
  },
  {
    id: "express-integration",
    title: "Integrate SolveJS in Express",
    description: "Add reusable validation middleware with structured result codes.",
    path: "guides/express-integration.html",
    tags: ["express", "integration", "middleware"],
    packages: ["@jdsalasc/solvejs-validators"],
    level: "Intermediate"
  },
  {
    id: "nest-integration",
    title: "Integrate SolveJS in NestJS",
    description: "Use utility validators inside services and domain logic.",
    path: "guides/nest-integration.html",
    tags: ["nestjs", "integration", "service"],
    packages: ["@jdsalasc/solvejs-validators"],
    level: "Intermediate"
  },
  {
    id: "validator-locale-matrix",
    title: "Validator Locale Matrix",
    description: "See current country coverage for phone and postal validation.",
    path: "guides/validator-locale-matrix.html",
    tags: ["validators", "locale", "postal", "phone"],
    packages: ["@jdsalasc/solvejs-validators"],
    level: "Reference"
  },
  {
    id: "package-inventory",
    title: "Package Inventory",
    description: "Inspect API surface and test-count snapshot across all SolveJS packages.",
    path: "guides/package-inventory.html",
    tags: ["inventory", "quality", "tests", "exports"],
    packages: ["@jdsalasc/solvejs"],
    level: "Reference"
  },
  {
    id: "solvejs-vs-lodash",
    title: "SolveJS vs Lodash",
    description: "Compare scope, typing, and adoption fit for utility workflows.",
    path: "guides/solvejs-vs-lodash.html",
    tags: ["comparison", "lodash", "adoption"],
    packages: ["@jdsalasc/solvejs"],
    level: "Reference"
  },
  {
    id: "solvejs-vs-datefns-validator",
    title: "SolveJS vs date-fns + validator",
    description: "Compare one-ecosystem consistency vs mixed-library stacks.",
    path: "guides/solvejs-vs-datefns-validator.html",
    tags: ["comparison", "date-fns", "validator", "adoption"],
    packages: ["@jdsalasc/solvejs-date", "@jdsalasc/solvejs-validators"],
    level: "Reference"
  }
];

function normalize(value) {
  return String(value || "").toLowerCase();
}

function currentTopic() {
  const filename = location.pathname.split("/").pop() || "index.html";
  return TOPICS.find((topic) => topic.path.endsWith(filename));
}

function topicHref(topic) {
  const root = document.body.dataset.root || ".";
  return `${root}/${topic.path}`;
}

function topicScore(topic, query) {
  const q = normalize(query);
  const haystack = [
    topic.title,
    topic.description,
    topic.tags.join(" "),
    topic.packages.join(" "),
    topic.level
  ].join(" ").toLowerCase();

  if (!q) {
    return 1;
  }
  if (normalize(topic.title).startsWith(q)) {
    return 6;
  }
  if (normalize(topic.title).includes(q)) {
    return 5;
  }
  if (topic.tags.some((tag) => normalize(tag).includes(q))) {
    return 4;
  }
  if (topic.packages.some((pkg) => normalize(pkg).includes(q))) {
    return 3;
  }
  if (haystack.includes(q)) {
    return 2;
  }
  return 0;
}

function renderResults(container, topics) {
  container.innerHTML = "";

  if (topics.length === 0) {
    container.innerHTML = '<p class="search-empty">No recipes found. Try terms like <code>date</code>, <code>uuid</code>, <code>array</code>, or <code>object</code>.</p>';
    return;
  }

  const list = document.createElement("ul");
  list.className = "search-list";

  for (const topic of topics) {
    const item = document.createElement("li");
    item.className = "search-item";
    item.innerHTML = `
      <a class="search-link" href="${topicHref(topic)}">${topic.title}</a>
      <p>${topic.description}</p>
      <p class="meta">${topic.packages.join(", ")} | ${topic.level}</p>
    `;
    list.appendChild(item);
  }

  container.appendChild(list);
}

function initSearch() {
  const input = document.querySelector("[data-doc-search]");
  const results = document.querySelector("[data-search-results]");
  if (!input || !results) {
    return;
  }

  const refresh = () => {
    const query = input.value.trim();
    const ranked = TOPICS
      .map((topic) => ({ topic, score: topicScore(topic, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.topic.title.localeCompare(b.topic.title))
      .map((entry) => entry.topic);

    renderResults(results, ranked);
  };

  input.addEventListener("input", refresh);
  refresh();
}

function initCookbookNav() {
  const nav = document.querySelector("[data-cookbook-nav]");
  if (!nav) {
    return;
  }

  const current = location.pathname.split("/").pop() || "index.html";
  const list = document.createElement("ul");
  list.className = "cookbook-list";

  for (const topic of TOPICS) {
    const href = topicHref(topic);
    const filename = topic.path.split("/").pop();
    const activeClass = filename === current ? " active" : "";
    const item = document.createElement("li");
    item.innerHTML = `<a class="cookbook-link${activeClass}" href="${href}">${topic.title}</a>`;
    list.appendChild(item);
  }

  nav.appendChild(list);
}

function initRelatedRecipes() {
  const container = document.querySelector("[data-related-recipes]");
  const topic = currentTopic();
  if (!container || !topic) {
    return;
  }

  const related = TOPICS
    .filter((entry) => entry.id !== topic.id)
    .map((entry) => {
      const sharedTags = entry.tags.filter((tag) => topic.tags.includes(tag)).length;
      const sharedPackages = entry.packages.filter((pkg) => topic.packages.includes(pkg)).length;
      return { entry, score: sharedTags * 2 + sharedPackages };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.entry);

  if (related.length === 0) {
    return;
  }

  const list = document.createElement("ul");
  list.className = "topic-list";
  for (const entry of related) {
    const item = document.createElement("li");
    item.innerHTML = `<a class="topic-link" href="${topicHref(entry)}">${entry.title}</a><p>${entry.description}</p>`;
    list.appendChild(item);
  }
  container.appendChild(list);
}

document.addEventListener("DOMContentLoaded", () => {
  initSearch();
  initCookbookNav();
  initRelatedRecipes();
});
