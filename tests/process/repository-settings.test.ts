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

function statusChecks(value: unknown): { name: string; exactHead: unknown }[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(asObject)
    .filter((entry) => typeof entry.name === "string")
    .map((entry) => ({
      name: entry.name as string,
      exactHead: entry.exactHead,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function normalizeRepositorySettings(value: unknown) {
  const root = asObject(value);
  const mergeMethods = asObject(root.mergeMethods);
  const mainProtection = asObject(root.mainProtection);
  const workflowPermissions = asObject(root.workflowPermissions);
  const releaseTags = asObject(root.releaseTags);
  const capabilities = asObject(root.capabilities);

  return {
    contract: root.contract,
    policyKind: root.policyKind,
    repository: root.repository,
    defaultBranch: root.defaultBranch,
    mergeMethods: {
      mergeCommit: mergeMethods.mergeCommit,
      squash: mergeMethods.squash,
      rebase: mergeMethods.rebase,
    },
    deleteBranchOnMerge: root.deleteBranchOnMerge,
    requiredStatusChecks: statusChecks(root.requiredStatusChecks),
    mainProtection: {
      protected: mainProtection.protected,
      requirePullRequest: mainProtection.requirePullRequest,
      requireBranchUpToDate: mainProtection.requireBranchUpToDate,
      allowDeletion: mainProtection.allowDeletion,
      allowForcePush: mainProtection.allowForcePush,
    },
    workflowPermissions: {
      defaultWorkflowPermissions: workflowPermissions.defaultWorkflowPermissions,
      canApprovePullRequestReviews: workflowPermissions.canApprovePullRequestReviews,
    },
    releaseTags: {
      pattern: releaseTags.pattern,
      enforcement: releaseTags.enforcement,
      immutable: releaseTags.immutable,
      allowDeletion: releaseTags.allowDeletion,
      allowUpdate: releaseTags.allowUpdate,
      bypassActors: stringList(releaseTags.bypassActors),
    },
    capabilities: {
      kind: capabilities.kind,
      browserRuntime: capabilities.browserRuntime,
      server: capabilities.server,
      worker: capabilities.worker,
      pages: capabilities.pages,
      deployment: capabilities.deployment,
      npmPublication: capabilities.npmPublication,
    },
  };
}

export function compareExpectedSettings(expected: unknown, observed: unknown): string[] {
  const wanted = normalizeRepositorySettings(expected);
  const actual = normalizeRepositorySettings(observed);
  const fields: readonly [string, unknown, unknown][] = [
    ["contract", wanted.contract, actual.contract],
    ["policyKind", wanted.policyKind, actual.policyKind],
    ["repository", wanted.repository, actual.repository],
    ["defaultBranch", wanted.defaultBranch, actual.defaultBranch],
    ["mergeMethods.mergeCommit", wanted.mergeMethods.mergeCommit, actual.mergeMethods.mergeCommit],
    ["mergeMethods.squash", wanted.mergeMethods.squash, actual.mergeMethods.squash],
    ["mergeMethods.rebase", wanted.mergeMethods.rebase, actual.mergeMethods.rebase],
    ["deleteBranchOnMerge", wanted.deleteBranchOnMerge, actual.deleteBranchOnMerge],
    ["requiredStatusChecks", wanted.requiredStatusChecks, actual.requiredStatusChecks],
    ["mainProtection.protected", wanted.mainProtection.protected, actual.mainProtection.protected],
    ["mainProtection.requirePullRequest", wanted.mainProtection.requirePullRequest, actual.mainProtection.requirePullRequest],
    ["mainProtection.requireBranchUpToDate", wanted.mainProtection.requireBranchUpToDate, actual.mainProtection.requireBranchUpToDate],
    ["mainProtection.allowDeletion", wanted.mainProtection.allowDeletion, actual.mainProtection.allowDeletion],
    ["mainProtection.allowForcePush", wanted.mainProtection.allowForcePush, actual.mainProtection.allowForcePush],
    ["workflowPermissions.defaultWorkflowPermissions", wanted.workflowPermissions.defaultWorkflowPermissions, actual.workflowPermissions.defaultWorkflowPermissions],
    ["workflowPermissions.canApprovePullRequestReviews", wanted.workflowPermissions.canApprovePullRequestReviews, actual.workflowPermissions.canApprovePullRequestReviews],
    ["releaseTags.pattern", wanted.releaseTags.pattern, actual.releaseTags.pattern],
    ["releaseTags.enforcement", wanted.releaseTags.enforcement, actual.releaseTags.enforcement],
    ["releaseTags.immutable", wanted.releaseTags.immutable, actual.releaseTags.immutable],
    ["releaseTags.allowDeletion", wanted.releaseTags.allowDeletion, actual.releaseTags.allowDeletion],
    ["releaseTags.allowUpdate", wanted.releaseTags.allowUpdate, actual.releaseTags.allowUpdate],
    ["releaseTags.bypassActors", wanted.releaseTags.bypassActors, actual.releaseTags.bypassActors],
    ["capabilities.kind", wanted.capabilities.kind, actual.capabilities.kind],
    ["capabilities.browserRuntime", wanted.capabilities.browserRuntime, actual.capabilities.browserRuntime],
    ["capabilities.server", wanted.capabilities.server, actual.capabilities.server],
    ["capabilities.worker", wanted.capabilities.worker, actual.capabilities.worker],
    ["capabilities.pages", wanted.capabilities.pages, actual.capabilities.pages],
    ["capabilities.deployment", wanted.capabilities.deployment, actual.capabilities.deployment],
    ["capabilities.npmPublication", wanted.capabilities.npmPublication, actual.capabilities.npmPublication],
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
  it("accepts a matching desired-policy snapshot", () => {
    expect(compareExpectedSettings(expected, matching())).toEqual([]);
  });

  it("requires protected main and the exact-head verify check", () => {
    const normalized = normalizeRepositorySettings(expected);
    expect(normalized.defaultBranch).toBe("main");
    expect(normalized.mainProtection).toEqual({
      protected: true,
      requirePullRequest: true,
      requireBranchUpToDate: true,
      allowDeletion: false,
      allowForcePush: false,
    });
    expect(normalized.requiredStatusChecks).toEqual([
      {
        name: "verify",
        exactHead: true,
      },
    ]);

    const observed = matching();
    asObject(observed.mainProtection).protected = false;
    asObject(observed.mainProtection).requireBranchUpToDate = false;
    asObject(observed.mainProtection).allowForcePush = true;
    observed.requiredStatusChecks = [
      {
        name: "verify",
        exactHead: false,
      },
    ];

    expect(compareExpectedSettings(expected, observed)).toEqual(expect.arrayContaining([
      "requiredStatusChecks",
      "mainProtection.protected",
      "mainProtection.requireBranchUpToDate",
      "mainProtection.allowForcePush",
    ]));
  });

  it("rejects merge-method and completed-branch-cleanup drift", () => {
    const observed = matching();
    const mergeMethods = asObject(observed.mergeMethods);
    mergeMethods.mergeCommit = true;
    mergeMethods.squash = false;
    mergeMethods.rebase = true;
    observed.deleteBranchOnMerge = false;

    expect(compareExpectedSettings(expected, observed)).toEqual(expect.arrayContaining([
      "mergeMethods.mergeCommit",
      "mergeMethods.squash",
      "mergeMethods.rebase",
      "deleteBranchOnMerge",
    ]));
  });

  it("requires least-privilege workflow defaults", () => {
    const normalized = normalizeRepositorySettings(expected);
    expect(normalized.workflowPermissions).toEqual({
      defaultWorkflowPermissions: "read",
      canApprovePullRequestReviews: false,
    });

    const observed = matching();
    const workflowPermissions = asObject(observed.workflowPermissions);
    workflowPermissions.defaultWorkflowPermissions = "write";
    workflowPermissions.canApprovePullRequestReviews = true;

    expect(compareExpectedSettings(expected, observed)).toEqual(expect.arrayContaining([
      "workflowPermissions.defaultWorkflowPermissions",
      "workflowPermissions.canApprovePullRequestReviews",
    ]));
  });

  it("requires immutable v* release tags with no bypass actors", () => {
    const normalized = normalizeRepositorySettings(expected);
    expect(normalized.releaseTags).toEqual({
      pattern: "v*",
      enforcement: "active",
      immutable: true,
      allowDeletion: false,
      allowUpdate: false,
      bypassActors: [],
    });

    const observed = matching();
    const releaseTags = asObject(observed.releaseTags);
    releaseTags.enforcement = "disabled";
    releaseTags.immutable = false;
    releaseTags.allowDeletion = true;
    releaseTags.allowUpdate = true;
    releaseTags.bypassActors = ["RepositoryRole:maintain"];

    expect(compareExpectedSettings(expected, observed)).toEqual(expect.arrayContaining([
      "releaseTags.enforcement",
      "releaseTags.immutable",
      "releaseTags.allowDeletion",
      "releaseTags.allowUpdate",
      "releaseTags.bypassActors",
    ]));
  });

  it("preserves Boneyard's asset/data-library no-deployment boundary", () => {
    const normalized = normalizeRepositorySettings(expected);
    expect(normalized.capabilities).toEqual({
      kind: "asset-data-library",
      browserRuntime: false,
      server: false,
      worker: false,
      pages: false,
      deployment: false,
      npmPublication: false,
    });

    const observed = matching();
    const capabilities = asObject(observed.capabilities);
    capabilities.worker = true;
    capabilities.deployment = true;
    capabilities.npmPublication = true;

    expect(compareExpectedSettings(expected, observed)).toEqual(expect.arrayContaining([
      "capabilities.worker",
      "capabilities.deployment",
      "capabilities.npmPublication",
    ]));
  });

  it("ignores live metadata and visibility that are outside the desired policy contract", () => {
    const observed = matching();
    Object.assign(observed, {
      id: 1376657754,
      visibility: "public",
      updated_at: "2099-01-01T00:00:00Z",
    });
    Object.assign(asObject(observed.mainProtection), {
      protectionUrl: "https://example.invalid/protection",
      workflowRunId: 123456,
    });

    expect(compareExpectedSettings(expected, observed)).toEqual([]);
  });
});
