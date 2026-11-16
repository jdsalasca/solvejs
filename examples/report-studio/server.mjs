import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const repo = resolve(here, "../..");
const packageRoots = {
  "pkg-xlsx": join(repo, "packages/solvejs-xlsx/dist/esm"),
  "pkg-pdf": join(repo, "packages/solvejs-pdf/dist/esm")
};
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8"
};

function safeJoin(root, path) {
  const base = resolve(root);
  const target = resolve(base, path);
  return target.startsWith(base + sep) ? target : null;
}

// eslint-disable-next-line complexity -- small static router with explicit fallbacks
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === "/") {
      const file = join(here, "index.html");
      response.writeHead(200, { "content-type": mime[".html"] });
      response.end(await readFile(file));
      return;
    }
    const packageName = pathname.split("/")[1];
    const root = packageRoots[packageName];
    if (root) {
      const relative = pathname.slice(packageName.length + 2);
      const file = safeJoin(root, relative);
      if (!file || !existsSync(file)) throw new Error("Not found");
      response.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
      response.end(await readFile(file));
      return;
    }
    const file = safeJoin(here, pathname.slice(1));
    if (!file || !existsSync(file)) throw new Error("Not found");
    response.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

const port = Number(process.env.PORT ?? 4174);
server.listen(port, () => {
  console.log(`Report studio running at http://localhost:${port}`);
});
