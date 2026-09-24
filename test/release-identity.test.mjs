import assert from "node:assert/strict";
import test from "node:test";
import {
  RELEASE_TAG_PATTERN,
  validateReleaseIdentity,
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
