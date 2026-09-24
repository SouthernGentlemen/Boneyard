import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  RELEASE_TAG_PATTERN,
  validateReleaseIdentity,
  verifyReleaseIdentity,
} from "../scripts/release-identity.mjs";

function matchingIdentity() {
  return {
    tag: "v0.1.0",
    tagObject: "tag-object",
    tagObjectType: "tag",
    taggedCommit: "commit-a",
    headCommit: "commit-a",
    taggedTree: "tree-a",
    headTree: "tree-a",
    packageBlob: "package-blob",
    packageVersion: "0.1.0",
    packagePrivate: true,
    worktreeClean: true,
  };
}

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function writePackage(root, version = "0.1.0") {
  writeFileSync(
    join(root, "package.json"),
    `${JSON.stringify({ name: "release-identity-fixture", version, private: true }, null, 2)}\n`,
  );
}

function commitAll(root, message) {
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", message]);
}

function withDisposableRepo(run, version = "0.1.0") {
  const root = mkdtempSync(join(tmpdir(), "boneyard-release-identity-"));
  try {
    git(root, ["init", "--quiet"]);
    git(root, ["config", "user.name", "Boneyard Tests"]);
    git(root, ["config", "user.email", "boneyard-tests@example.invalid"]);
    writePackage(root, version);
    commitAll(root, "fixture");
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("strict release tag and exact identity pass", () => {
  assert.match("v0.1.0", RELEASE_TAG_PATTERN);
  assert.deepEqual(validateReleaseIdentity(matchingIdentity()), []);
});

test("tag/version mismatch fails", () => {
  const identity = matchingIdentity();
  identity.packageVersion = "0.1.1";
  assert.match(validateReleaseIdentity(identity).join("\n"), /tag\/version mismatch/);
});

test("lightweight tags fail the annotated-tag boundary", () => {
  const identity = matchingIdentity();
  identity.tagObjectType = "commit";
  assert.match(validateReleaseIdentity(identity).join("\n"), /must be annotated/);
});

test("tagged commit and repository tree must equal exact HEAD", () => {
  const commit = matchingIdentity();
  commit.headCommit = "commit-b";
  assert.match(validateReleaseIdentity(commit).join("\n"), /tagged commit mismatch/);

  const tree = matchingIdentity();
  tree.headTree = "tree-b";
  assert.match(validateReleaseIdentity(tree).join("\n"), /repository tree mismatch/);
});

test("private package and clean tracked checkout remain part of release identity", () => {
  const publicPackage = matchingIdentity();
  publicPackage.packagePrivate = false;
  assert.match(validateReleaseIdentity(publicPackage).join("\n"), /private: true/);

  const dirty = matchingIdentity();
  dirty.worktreeClean = false;
  assert.match(validateReleaseIdentity(dirty).join("\n"), /working tree\/index/);
});

test("disposable repository rejects a lightweight release tag", () => {
  withDisposableRepo((root) => {
    git(root, ["tag", "v0.1.0"]);
    const result = verifyReleaseIdentity(root, "v0.1.0");
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /must be annotated/);
  });
});

test("disposable repository rejects a mismatched package version", () => {
  withDisposableRepo((root) => {
    git(root, ["tag", "-a", "v0.1.0", "-m", "v0.1.0"]);
    const result = verifyReleaseIdentity(root, "v0.1.0");
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /tag\/version mismatch/);
  }, "0.1.1");
});

test("disposable repository rejects a tag that does not point at exact HEAD", () => {
  withDisposableRepo((root) => {
    git(root, ["tag", "-a", "v0.1.0", "-m", "v0.1.0"]);
    writeFileSync(join(root, "after-tag.txt"), "later commit\n");
    commitAll(root, "after tag");

    const result = verifyReleaseIdentity(root, "v0.1.0");
    assert.equal(result.ok, false);
    assert.match(result.errors.join("\n"), /tagged commit mismatch/);
  });
});

test("disposable repository accepts the annotated exact-head release identity", () => {
  withDisposableRepo((root) => {
    git(root, ["tag", "-a", "v0.1.0", "-m", "v0.1.0"]);
    const result = verifyReleaseIdentity(root, "v0.1.0");
    assert.equal(result.ok, true, result.errors.join("\n"));
    assert.equal(result.tagObjectType, "tag");
    assert.equal(result.taggedCommit, result.headCommit);
    assert.equal(result.taggedTree, result.headTree);
  });
});
