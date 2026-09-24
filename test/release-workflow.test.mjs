import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");

function position(fragment) {
  const index = workflow.indexOf(fragment);
  assert.notEqual(index, -1, `release workflow must contain ${JSON.stringify(fragment)}`);
  return index;
}

test("release workflow is tag-only and checks out the exact tag with full history", () => {
  assert.match(workflow, /push:\n\s+tags:\n\s+- "v\*\.\*\.\*"/);
  assert.doesNotMatch(workflow, /workflow_dispatch:|branches:/);
  assert.match(workflow, /permissions:\n\s+contents: write/);
  assert.match(workflow, /ref: \$\{\{ github\.ref \}\}/);
  assert.match(workflow, /fetch-depth: 0/);
  assert.match(workflow, /persist-credentials: false/);
});

test("identity and canonical acceptance gate release publication in order", () => {
  const identity = position('node scripts/release-identity.mjs --tag "$GITHUB_REF_NAME"');
  const install = position("npm ci");
  const acceptance = position("npm run check");
  const publish = position('gh release create "$GITHUB_REF_NAME"');

  assert.ok(identity < install, "release identity must pass before dependency installation");
  assert.ok(install < acceptance, "locked installation must finish before canonical acceptance");
  assert.ok(acceptance < publish, "canonical acceptance must pass before publication");
  assert.match(workflow, /SVGLAB_REQUIRE_BLENDER: "1"/);
});

test("GitHub Release publication verifies the tag and is rerun-safe", () => {
  assert.equal(workflow.match(/gh release create /g)?.length, 1);
  assert.equal(workflow.match(/gh release view /g)?.length, 2);
  assert.match(workflow, /--verify-tag/);
  assert.match(workflow, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(workflow, /already exists; nothing to publish/);
  assert.doesNotMatch(workflow, /npm publish|wrangler|pages deploy/i);
});
