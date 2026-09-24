import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const ci = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
const release = readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");

const CHECKOUT = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";
const SETUP_NODE = "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020";
const DIRECT_TOOLS = {
  "@types/node": "24.13.5",
  typescript: "5.9.3",
  vitest: "5.0.1",
};

test("pins the shared runtime and Boneyard source-consumer development lane", () => {
  assert.equal(pkg.packageManager, "npm@11.19.1");
  assert.deepEqual(pkg.engines, { node: "26.9.0", npm: "11.19.1" });
  assert.deepEqual(pkg.devDependencies, DIRECT_TOOLS);
  assert.deepEqual(lock.packages[""].devDependencies, DIRECT_TOOLS);
  for (const [name, version] of Object.entries(DIRECT_TOOLS)) {
    assert.equal(lock.packages[`node_modules/${name}`]?.version, version);
  }
});

test("common npm command meanings keep advisory work outside canonical acceptance", () => {
  assert.equal(pkg.scripts.verify, "npm run check");
  assert.equal(pkg.scripts["audit:dependencies"], "npm audit --audit-level=high");
  assert.equal(pkg.scripts["test:shared-contract"], "node --test test/shared-contract.test.mjs");
  assert.ok(pkg.scripts.check.includes("npm run test:shared-contract"));
  assert.ok(!pkg.scripts.check.includes("audit:dependencies"));
});

function assertWorkflowScriptsExist(source, name) {
  for (const match of source.matchAll(/^\s*run:\s*npm run ([A-Za-z0-9:_-]+)/gm)) {
    assert.ok(pkg.scripts[match[1]], `${name} invokes missing npm script ${match[1]}`);
  }
}

test("CI uses exact source identity, immutable shared actions and equivalent gates", () => {
  assert.ok(ci.includes(`uses: ${CHECKOUT}`));
  assert.ok(ci.includes(`uses: ${SETUP_NODE}`));
  assert.ok(ci.includes("ref: ${{ github.event.pull_request.head.sha || github.sha }}"));
  assert.ok(ci.includes("fetch-depth: 0"));
  assert.ok(ci.includes("persist-credentials: false"));
  assert.ok(ci.includes('git diff --check "$BASE_SHA...$HEAD_SHA"'));
  assert.ok(ci.includes("node-version-file: .node-version"));
  assert.ok(ci.includes("run: npm ci"));
  assert.ok(ci.includes("run: npm run audit:dependencies"));
  assert.ok(ci.includes("run: npm run check"));
  assertWorkflowScriptsExist(ci, "CI");
});

test("release keeps the same immutable checkout/toolchain contract without inventing deployment", () => {
  assert.ok(release.includes(`uses: ${CHECKOUT}`));
  assert.ok(release.includes(`uses: ${SETUP_NODE}`));
  assert.ok(release.includes("persist-credentials: false"));
  assert.ok(release.includes("node-version-file: .node-version"));
  assertWorkflowScriptsExist(release, "release");
  assert.doesNotMatch(release, /npm publish|wrangler|pages deploy/i);
});
