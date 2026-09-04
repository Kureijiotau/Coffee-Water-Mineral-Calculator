#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import process from "node:process";

function git(args, { allowFailure = false } = {}) {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", allowFailure ? "pipe" : "inherit"],
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return "";
    }
    throw error;
  }
}

const failures = [];
const notes = [];

const repositoryRoot = git(["rev-parse", "--show-toplevel"]);
process.chdir(repositoryRoot);

const status = git(["status", "--porcelain=v1", "--untracked-files=all"]);
if (status) {
  failures.push(
    "Working tree is not clean. Commit, stash, or remove these paths before syncing:\n" +
      status,
  );
}

const whitespaceErrors = git(["diff", "--check", "HEAD"], { allowFailure: true });
if (whitespaceErrors) {
  failures.push(`Whitespace errors found:\n${whitespaceErrors}`);
}

const unmergedPaths = git(
  ["diff", "--name-only", "--diff-filter=U"],
  { allowFailure: true },
);
if (unmergedPaths) {
  failures.push(`Unresolved merge paths found:\n${unmergedPaths}`);
}

const unsupportedLockfiles = git(
  ["ls-files", "--", "package-lock.json", "yarn.lock", "npm-shrinkwrap.json"],
  { allowFailure: true },
);
if (unsupportedLockfiles) {
  failures.push(
    `Unsupported package-manager lockfiles are tracked:\n${unsupportedLockfiles}`,
  );
}

const head = git(["rev-parse", "HEAD"]);
const headTree = git(["rev-parse", "HEAD^{tree}"]);
const branch = git(["branch", "--show-current"]);
const upstream = git(
  ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
  { allowFailure: true },
);

if (upstream) {
  const upstreamHead = git(["rev-parse", upstream]);
  const upstreamTree = git(["rev-parse", `${upstream}^{tree}`]);

  if (branch === "main" && upstream !== "origin/main") {
    failures.push(
      `main is tracking ${upstream}; it must track origin/main before syncing.`,
    );
  }

  if (head !== upstreamHead) {
    const divergence = git(
      ["rev-list", "--left-right", "--count", `HEAD...${upstream}`],
      { allowFailure: true },
    );
    failures.push(
      `HEAD does not exactly match ${upstream} (ahead/behind: ${divergence || "unknown"}).`,
    );
  }

  if (headTree !== upstreamTree) {
    failures.push(
      `HEAD and ${upstream} contain different file trees (${headTree} vs ${upstreamTree}).`,
    );
  }

  notes.push(`verified exact commit and tree match with ${upstream}`);
} else if (process.env.GITHUB_SHA) {
  if (head !== process.env.GITHUB_SHA) {
    failures.push(
      `Checked-out commit ${head} does not match GitHub Actions commit ${process.env.GITHUB_SHA}.`,
    );
  } else {
    notes.push("verified checked-out commit against GITHUB_SHA");
  }
} else {
  failures.push(
    "No upstream branch is configured. Configure origin/main before using this repository as the canonical workspace.",
  );
}

const trackedFileCount = git(["ls-files"]).split("\n").filter(Boolean).length;
notes.push(`audited ${trackedFileCount} tracked files`);

if (failures.length > 0) {
  console.error("Repository synchronization audit failed.");
  for (const failure of failures) {
    console.error(`\n- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Repository synchronization audit passed: ${notes.join("; ")}.`);
}