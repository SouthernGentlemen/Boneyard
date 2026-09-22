import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string").sort()
    : [];
}

export function normalizeRepositorySettings(value: unknown) {
  const root = asObject(value);
  const repository = asObject(root.repository);
  const merge = asObject(repository.merge);
  const main = asObject(root.main);
  const capabilities = asObject(root.capabilities);
  const releasePolicy = asObject(root.releasePolicy);

  return {
    contract: root.contract,
    repository: {
      visibility: repository.visibility,
      defaultBranch: repository.defaultBranch,
      merge: {
        allowMergeCommit: merge.allowMergeCommit,
        allowSquashMerge: merge.allowSquashMerge,
        allowRebaseMerge: merge.allowRebaseMerge,
        deleteBranchOnMerge: merge.deleteBranchOnMerge,
      },
    },
    main: {
      protected: main.protected,
      requiredStatusChecks: stringList(main.requiredStatusChecks),
    },
    capabilities: {
      kind: capabilities.kind,
      browserRuntime: capabilities.browserRuntime,
      server: capabilities.server,
      worker: capabilities.worker,
      pages: capabilities.pages,
      deployment: capabilities.deployment,
      publication: capabilities.publication,
    },
    releasePolicy: {
      enabled: releasePolicy.enabled,
      immutableTagsWhenEnabled: releasePolicy.immutableTagsWhenEnabled,
    },
  };
}

export function compareExpectedSettings(expected: unknown, observed: unknown): string[] {
  const wanted = normalizeRepositorySettings(expected);
  const actual = normalizeRepositorySettings(observed);
  const fields: readonly [string, unknown, unknown][] = [
    ["contract", wanted.contract, actual.contract],
    ["repository.visibility", wanted.repository.visibility, actual.repository.visibility],
    ["repository.defaultBranch", wanted.repository.defaultBranch, actual.repository.defaultBranch],
    ["repository.merge.allowMergeCommit", wanted.repository.merge.allowMergeCommit, actual.repository.merge.allowMergeCommit],
    ["repository.merge.allowSquashMerge", wanted.repository.merge.allowSquashMerge, actual.repository.merge.allowSquashMerge],
    ["repository.merge.allowRebaseMerge", wanted.repository.merge.allowRebaseMerge, actual.repository.merge.allowRebaseMerge],
    ["repository.merge.deleteBranchOnMerge", wanted.repository.merge.deleteBranchOnMerge, actual.repository.merge.deleteBranchOnMerge],
    ["main.protected", wanted.main.protected, actual.main.protected],
    ["main.requiredStatusChecks", wanted.main.requiredStatusChecks, actual.main.requiredStatusChecks],
    ["capabilities.kind", wanted.capabilities.kind, actual.capabilities.kind],
    ["capabilities.browserRuntime", wanted.capabilities.browserRuntime, actual.capabilities.browserRuntime],
    ["capabilities.server", wanted.capabilities.server, actual.capabilities.server],
    ["capabilities.worker", wanted.capabilities.worker, actual.capabilities.worker],
    ["capabilities.pages", wanted.capabilities.pages, actual.capabilities.pages],
    ["capabilities.deployment", wanted.capabilities.deployment, actual.capabilities.deployment],
    ["capabilities.publication", wanted.capabilities.publication, actual.capabilities.publication],
    ["releasePolicy.enabled", wanted.releasePolicy.enabled, actual.releasePolicy.enabled],
    ["releasePolicy.immutableTagsWhenEnabled", wanted.releasePolicy.immutableTagsWhenEnabled, actual.releasePolicy.immutableTagsWhenEnabled],
  ];

  return fields
    .filter(([, expectedValue, observedValue]) => JSON.stringify(expectedValue) !== JSON.stringify(observedValue))
    .map(([path]) => path);
}

const expected = JSON.parse(readFileSync(
  new URL("../../config/github-repository-settings.json", import.meta.url),
  "utf8",
)) as unknown;

const matching = (): JsonObject => JSON.parse(JSON.stringify(expected)) as JsonObject;

describe("expected GitHub repository settings", () => {
  it("accepts a matching settings-shaped snapshot", () => {
    expect(compareExpectedSettings(expected, matching())).toEqual([]);
  });

  it("rejects a missing required main acceptance check", () => {
    const observed = matching();
    asObject(observed.main).requiredStatusChecks = [];
    expect(compareExpectedSettings(expected, observed)).toContain("main.requiredStatusChecks");
  });

  it("rejects weakened main protection", () => {
    const observed = matching();
    asObject(observed.main).protected = false;
    expect(compareExpectedSettings(expected, observed)).toContain("main.protected");
  });

  it("rejects material merge and release-policy drift", () => {
    const observed = matching();
    asObject(asObject(observed.repository).merge).allowSquashMerge = false;
    asObject(observed.releasePolicy).immutableTagsWhenEnabled = false;

    expect(compareExpectedSettings(expected, observed)).toEqual(expect.arrayContaining([
      "repository.merge.allowSquashMerge",
      "releasePolicy.immutableTagsWhenEnabled",
    ]));
  });

  it("records the current no-publication capability without pretending a release exists", () => {
    const normalized = normalizeRepositorySettings(expected);
    expect(normalized.capabilities.kind).toBe("asset-data-library");
    expect(normalized.capabilities.publication).toBe(false);
    expect(normalized.releasePolicy.enabled).toBe(false);
    expect(normalized.releasePolicy.immutableTagsWhenEnabled).toBe(true);

    const observed = matching();
    asObject(observed.capabilities).publication = true;
    asObject(observed.releasePolicy).enabled = true;
    expect(compareExpectedSettings(expected, observed)).toEqual(expect.arrayContaining([
      "capabilities.publication",
      "releasePolicy.enabled",
    ]));
  });

  it("ignores provider metadata that is intentionally outside the policy contract", () => {
    const observed = matching();
    observed.id = 1376657754;
    observed.node_id = "transient";
    observed.updated_at = "2099-01-01T00:00:00Z";
    Object.assign(asObject(observed.repository), {
      pushedAt: "2099-01-01T00:00:00Z",
      htmlUrl: "https://example.invalid/repository",
    });
    Object.assign(asObject(observed.main), {
      protectionUrl: "https://example.invalid/protection",
      workflowRunId: 123456,
    });

    expect(compareExpectedSettings(expected, observed)).toEqual([]);
  });

  it("requires the repository's accepted main CI context", () => {
    const normalized = normalizeRepositorySettings(expected);
    expect(normalized.repository.defaultBranch).toBe("main");
    expect(normalized.main.protected).toBe(true);
    expect(normalized.main.requiredStatusChecks).toEqual(["verify"]);
  });
});
