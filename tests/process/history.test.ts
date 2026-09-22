import { describe, expect, it } from "vitest";

import {
  CONTROLLED_TYPES,
  validateControlledHistory,
} from "../../pipelines/guards/history.ts";
import type { HistoryCommit } from "../../pipelines/guards/history.ts";

const BOOTSTRAP = "bootstrap";
const commit = (sha: string, message: string): HistoryCommit => ({ sha, message });
const controlled = (id: string, type: string, summary: string): string =>
  `[${id}] [${type}] ${summary}\n\nTask: ${id}\nScope: narrow fixture scope\nValidation: fixture validation passed`;

const validHistory = (): HistoryCommit[] => [
  commit("legacy-one", "Extract assets before controlled history existed"),
  commit("legacy-two", "[BY-999] [FEATURE] A pre-contract title that must stay historical"),
  commit(BOOTSTRAP, "[BY-001] [DOCS] Start process parity queue\n\nBootstrap prose predates the body contract."),
  commit("by-002", controlled("BY-002", "DOCS", "Define controlled work")),
  commit("by-003", controlled("BY-003", "SEC", "Add security policy")),
];

const errorsFor = (history: readonly HistoryCommit[]): string =>
  validateControlledHistory(history, BOOTSTRAP).errors.join("\n");

describe("controlled BY history", () => {
  it("accepts a sequential controlled history and ignores everything before the exact bootstrap", () => {
    expect(validateControlledHistory(validHistory(), BOOTSTRAP)).toEqual({
      controlledCommits: 3,
      errors: [],
    });
  });

  it("keeps the BY-001 body exception narrow while requiring permanent fields afterward", () => {
    const history = validHistory();
    history[3] = commit("by-002", "[BY-002] [DOCS] Define controlled work\n\nTask: BY-002\nScope: narrow");
    expect(errorsFor(history)).toMatch(/BY-002 requires exactly one non-empty 'Validation:' body field/);
  });

  it("rejects duplicate controlled IDs", () => {
    const history = validHistory();
    history.push(commit("duplicate", controlled("BY-003", "TEST", "Duplicate an identifier")));
    expect(errorsFor(history)).toMatch(/duplicate controlled ID BY-003/);
  });

  it("rejects gaps in the sequence", () => {
    const history = validHistory().slice(0, 3);
    history.push(commit("by-003", controlled("BY-003", "TEST", "Skip an identifier")));
    expect(errorsFor(history)).toMatch(/expected BY-002, found BY-003/);
  });

  it("rejects a commit after BY-001 whose title is not controlled", () => {
    const history = validHistory().slice(0, 3);
    history.push(commit("bad-title", "tests: add a prospective history guard"));
    expect(errorsFor(history)).toMatch(/title must match/);
  });

  it("rejects controlled types outside the repository vocabulary", () => {
    const history = validHistory().slice(0, 3);
    history.push(commit(
      "bad-type",
      "[BY-002] [FEATURE] Add feature\n\nTask: BY-002\nScope: narrow\nValidation: passed",
    ));
    expect(errorsFor(history)).toMatch(/unsupported controlled type 'FEATURE'/);
    expect(CONTROLLED_TYPES).toContain("TEST");
  });

  it("rejects a Task body field that disagrees with the title ID", () => {
    const history = validHistory().slice(0, 3);
    history.push(commit(
      "bad-task",
      "[BY-002] [TEST] Validate history\n\nTask: BY-003\nScope: narrow\nValidation: passed",
    ));
    expect(errorsFor(history)).toMatch(/Task field 'BY-003' does not match BY-002/);
  });

  it("rejects missing or duplicated required body fields", () => {
    const history = validHistory().slice(0, 3);
    history.push(commit(
      "bad-body",
      "[BY-002] [TEST] Validate history\n\nTask: BY-002\nScope: one\nScope: two\nValidation:",
    ));
    expect(errorsFor(history)).toMatch(/exactly one non-empty 'Scope:' body field/);
    expect(errorsFor(history)).toMatch(/exactly one non-empty 'Validation:' body field/);
  });
});
