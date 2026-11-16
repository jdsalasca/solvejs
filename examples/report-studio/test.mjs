import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

function startStudio(port) {
  const child = spawn(process.execPath, ["examples/report-studio/server.mjs"], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("studio server did not start"));
    }, 10_000);
    child.stdout.on("data", (chunk) => {
      if (!chunk.toString().includes("Report studio running")) return;
      clearTimeout(timer);
      resolve(child);
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`studio server exited with ${code}`));
    });
  });
}

test("serves the app and the built package entry points", async () => {
  const port = 4200 + Math.floor(Math.random() * 200);
  const child = await startStudio(port);
  try {
    const index = await fetch(`http://localhost:${port}/`);
    assert.equal(index.status, 200);
    assert.match(await index.text(), /SolveJS Report Studio/);

    const pdf = await fetch(`http://localhost:${port}/pkg-pdf/index.js`);
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers.get("content-type"), /text\/javascript/);

    const xlsx = await fetch(`http://localhost:${port}/pkg-xlsx/index.js`);
    assert.equal(xlsx.status, 200);

    const traversal = await fetch(`http://localhost:${port}/pkg-pdf/../../../package.json`);
    assert.equal(traversal.status, 404);
  } finally {
    child.kill();
  }
});
