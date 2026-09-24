import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .sort();
const workflowPaths = tracked.filter((path) => /^\.github\/workflows\/.*\.ya?ml$/i.test(path));
const workflows = workflowPaths.map((path) => readFileSync(resolve(ROOT, path), "utf8")).join("\n");
const agents = readFileSync(resolve(ROOT, "AGENTS.md"), "utf8");
const contributing = readFileSync(resolve(ROOT, "CONTRIBUTING.md"), "utf8");
const readme = readFileSync(resolve(ROOT, "README.md"), "utf8");
const release = readFileSync(resolve(ROOT, ".github/workflows/release.yml"), "utf8");

const forbiddenDeployCommand =
  /(?:\bwrangler\s+(?:deploy|publish|pages\s+deploy)\b|\bnpm\s+publish\b|actions\/(?:configure-pages|upload-pages-artifact|deploy-pages)|cloudflare\/wrangler-action|github-pages-deploy-action|actions-gh-pages)/i;
const forbiddenRuntimeDependency =
  /^(?:wrangler|miniflare|@cloudflare\/workers-types|hono|express|fastify|koa)$/i;
const forbiddenTrackedPath = [
  /^wrangler\.(?:toml|jsonc?)$/i,
  /(?:^|\/)(?:worker|server)\.(?:[cm]?[jt]s|tsx?)$/i,
  /^functions\//i,
  /^public\/(?:_worker\.js|_routes\.json)$/i,
];

test("package contract stays private and exposes no runtime/deploy/publication commands", () => {
  assert.equal(manifest.private, true, "Boneyard must remain private from npm publication");

  for (const [name, command] of Object.entries(manifest.scripts ?? {})) {
    assert.doesNotMatch(name, /^(?:deploy|publish|serve|server|start|worker|pages)(?::|$)/i);
    assert.doesNotMatch(command, forbiddenDeployCommand, `script ${name} must not deploy or publish`);
  }

  for (const dependency of [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ]) {
    assert.doesNotMatch(dependency, forbiddenRuntimeDependency, `runtime/deploy dependency ${dependency} is out of scope`);
  }
});

test("tracked repository surface has no Worker, runtime server, Pages, or production deploy entry point", () => {
  for (const path of tracked) {
    for (const pattern of forbiddenTrackedPath) {
      assert.doesNotMatch(path, pattern, `tracked path ${path} crosses the library boundary`);
    }
  }

  assert.doesNotMatch(workflows, forbiddenDeployCommand);
  assert.doesNotMatch(workflows, /\bpages:\s*write\b/i);
  assert.doesNotMatch(workflows, /\bdeployment\b.*\benvironment\b/i);
});

test("GitHub Release capability remains present without npm or production deployment", () => {
  assert.ok(workflowPaths.includes(".github/workflows/release.yml"));
  assert.match(release, /push:\n\s+tags:\n\s+- "v\*\.\*\.\*"/);
  assert.match(release, /npm run check/);
  assert.match(release, /gh release create "\$GITHUB_REF_NAME"/);
  assert.match(release, /--verify-tag/);
  assert.doesNotMatch(release, forbiddenDeployCommand);
});

test("current-state docs define the immutable downstream pin/update path and no-deploy boundary", () => {
  for (const [name, document] of [
    ["AGENTS.md", agents],
    ["CONTRIBUTING.md", contributing],
    ["README.md", readme],
  ]) {
    assert.match(document, /immutable annotated `vX\.Y\.Z` Git tag/i, `${name} must name the immutable tag authority`);
    assert.match(document, /explicitly (?:advance|move)s? (?:the|that) pin/i, `${name} must keep downstream updates consumer-owned`);
  }

  assert.match(agents, /does not publish to the npm registry/i);
  assert.match(agents, /host a Worker\/runtime server/i);
  assert.match(agents, /deploy GitHub Pages/i);
  assert.match(contributing, /do not modify consumer repositories/i);
  assert.match(readme, /does not push updates into\s+consumer repositories/i);
});
