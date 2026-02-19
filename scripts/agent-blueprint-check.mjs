#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredDocs = [
  "docs/agent/README.md",
  "docs/agent/user-stories.md",
  "docs/agent/process-flows.md",
  "docs/agent/system-design.md",
  "docs/agent/execution-checklists.md",
  "docs/agent/implementation-blueprint.md",
  "docs/agent/non-functional-requirements.md",
  "docs/agent/telemetry-spec.md",
  "docs/agent/gemini-codex-execution-prompts.md"
];

const requiredHeadings = new Map([
  ["docs/agent/implementation-blueprint.md", ["## Objectives", "## Wave Plan (12 Weeks)", "## Risk Register"]],
  ["docs/agent/non-functional-requirements.md", ["## Reliability", "## Performance", "## SLO Targets"]],
  ["docs/agent/telemetry-spec.md", ["## Metrics Catalog", "## Event Taxonomy", "## Weekly Review Ritual"]],
  ["docs/agent/gemini-codex-execution-prompts.md", ["## Prompt 1: Story Kickoff", "## Prompt 5: Pre-PR Quality Gate", "## Anti-Patterns to Avoid"]]
]);

const issues = [];

function readFile(relPath) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    issues.push(`Missing required file: ${relPath}`);
    return "";
  }
  const data = fs.readFileSync(fullPath, "utf8");
  if (!data.trim()) {
    issues.push(`File is empty: ${relPath}`);
  }
  return data;
}

for (const relPath of requiredDocs) {
  readFile(relPath);
}

for (const [relPath, headings] of requiredHeadings.entries()) {
  const content = readFile(relPath);
  for (const heading of headings) {
    if (!content.includes(heading)) {
      issues.push(`Missing heading "${heading}" in ${relPath}`);
    }
  }
}

const stories = readFile("docs/agent/user-stories.md");
const backlog = readFile("docs/community/issue-backlog.md");
const storyMatches = [...stories.matchAll(/^### (SJ-[A-Z0-9-]+)\b/gm)].map((m) => m[1]);

if (storyMatches.length === 0) {
  issues.push("No story IDs found in docs/agent/user-stories.md");
}

const duplicateStoryIds = storyMatches.filter((id, idx) => storyMatches.indexOf(id) !== idx);
if (duplicateStoryIds.length > 0) {
  const unique = [...new Set(duplicateStoryIds)].sort();
  issues.push(`Duplicate story IDs in docs/agent/user-stories.md: ${unique.join(", ")}`);
}

for (const id of storyMatches) {
  if (!backlog.includes(`story:${id}`)) {
    issues.push(`Backlog is missing story entry for ${id} in docs/community/issue-backlog.md`);
  }
}

if (issues.length > 0) {
  console.error("Agent blueprint check failed:\n");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Agent blueprint check passed. Validated ${requiredDocs.length} docs and ${storyMatches.length} story IDs.`);
