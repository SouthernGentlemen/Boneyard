#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const RELEASE_TAG_PATTERN = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function git(root, args) {
  return execFileSync("git", [...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function validateReleaseIdentity(identity) {
  const failures = [];
  const expectedTag = `v${identity.packageVersion ?? ""}`;

  if (!RELEASE_TAG_PATTERN.test(identity.tag ?? "")) {
    failures.push(`tag must match vX.Y.Z, got ${JSON.stringify(identity.tag)}`);
  }
  if (identity.tag !== expectedTag) {
    failures.push(`tag/version mismatch: expected ${expectedTag}, got ${identity.tag}`);
  }
  if (identity.packagePrivate !== true) {
    failures.push("package.json must keep private: true");
  }
  if (identity.tagObjectType !== "tag") {
    failures.push(`release tag must be annotated, got object type ${JSON.stringify(identity.tagObjectType)}`);
  }
  if (identity.taggedCommit !== identity.headCommit) {
    failures.push(
      `tagged commit mismatch: tag resolves to ${identity.taggedCommit}, HEAD is ${identity.headCommit}`,
    );
  }
  if (identity.taggedTree !== identity.headTree) {
    failures.push(
      `repository tree mismatch: tag resolves to ${identity.taggedTree}, HEAD is ${identity.headTree}`,
    );
  }
  if (identity.worktreeClean !== true) {
    failures.push("tracked working tree/index must match the exact tagged commit");
  }

  return failures;
}

export function readReleaseIdentity(root, tag) {
  if (!RELEASE_TAG_PATTERN.test(tag ?? "")) {
    throw new Error(`release tag must match vX.Y.Z, got ${JSON.stringify(tag)}`);
  }

  const tagRef = `refs/tags/${tag}`;
  const tagObject = git(root, ["rev-parse", "--verify", tagRef]);
  const tagObjectType = git(root, ["cat-file", "-t", tagObject]);
  const taggedCommit = git(root, ["rev-parse", "--verify", `${tagRef}^{commit}`]);
  const headCommit = git(root, ["rev-parse", "--verify", "HEAD^{commit}"]);
  const taggedTree = git(root, ["rev-parse", "--verify", `${tagRef}^{tree}`]);
  const headTree = git(root, ["rev-parse", "--verify", "HEAD^{tree}"]);
  const packageBlob = git(root, ["rev-parse", "--verify", `${taggedCommit}:package.json`]);
  const packageJson = JSON.parse(git(root, ["show", `${taggedCommit}:package.json`]));
  const worktreeClean = git(root, ["status", "--porcelain=v1", "--untracked-files=no"]) === "";

  return {
    tag,
    tagObject,
    tagObjectType,
    taggedCommit,
    headCommit,
    taggedTree,
    headTree,
    packageBlob,
    packageVersion: packageJson.version,
    packagePrivate: packageJson.private,
    worktreeClean,
  };
}

export function verifyReleaseIdentity(root, tag) {
  const identity = readReleaseIdentity(root, tag);
  const errors = validateReleaseIdentity(identity);
  return { ok: errors.length === 0, ...identity, errors };
}

function parseArgs(argv) {
  let tag;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--tag") {
      tag = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${arg}`);
  }

  tag ??= process.env.RELEASE_TAG ?? process.env.GITHUB_REF_NAME;
  if (!tag) throw new Error("release tag is required: pass --tag vX.Y.Z");

  return { tag, json };
}

export function main(argv = process.argv.slice(2)) {
  let json = false;
  try {
    const parsed = parseArgs(argv);
    json = parsed.json;
    const result = verifyReleaseIdentity(ROOT, parsed.tag);

    if (json) console.log(JSON.stringify(result, null, 2));
    else if (result.ok) {
      console.log(
        `release-identity: ${result.tag} -> ${result.taggedCommit} tree ${result.taggedTree} package ${result.packageBlob}`,
      );
    } else {
      for (const error of result.errors) console.error(`release-identity: ${error}`);
    }

    return result.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (json) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
    else console.error(`release-identity: ${message}`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
