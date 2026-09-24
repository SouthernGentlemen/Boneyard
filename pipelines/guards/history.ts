#!/usr/bin/env node
/**
 * check:history — validate the prospective BY controlled-change sequence on first-parent history.
 *
 * History before BY-001 is intentionally outside this contract. BY-001 is the one bootstrap
 * commit allowed to predate the permanent Task/Scope/Validation body fields introduced by BY-002.
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

export const BOOTSTRAP_SHA = "6330f31005c920e7baf41458ba5f1e9431abf463";
export const CONTROLLED_TYPES = ["BUILD", "DOCS", "FIX", "OPS", "REFACTOR", "SEC", "TEST"] as const;

const CONTROLLED_TYPE_SET = new Set<string>(CONTROLLED_TYPES);
const TITLE = /^\[(BY-(\d{3}))\] \[([A-Z]+)\] (\S(?:.*\S)?)$/;

export interface HistoryCommit {
  readonly sha: string;
  readonly message: string;
}

export interface HistoryValidation {
  readonly controlledCommits: number;
  readonly errors: readonly string[];
}

function short(sha: string): string {
  return sha.slice(0, 12);
}

function bodyFields(message: string): Map<string, string[]> {
  const fields = new Map<string, string[]>();
  for (const line of message.split(/\r?\n/).slice(1)) {
    const match = line.match(/^(Task|Scope|Validation):\s*(.*?)\s*$/);
    if (!match) continue;
    const values = fields.get(match[1]) ?? [];
    values.push(match[2]);
    fields.set(match[1], values);
  }
  return fields;
}

export function validateControlledHistory(
  commits: readonly HistoryCommit[],
  bootstrapSha = BOOTSTRAP_SHA,
): HistoryValidation {
  const bootstrapIndex = commits.findIndex((commit) => commit.sha === bootstrapSha);
  if (bootstrapIndex < 0) {
    return {
      controlledCommits: 0,
      errors: [`BY-001 bootstrap ${bootstrapSha} is absent from first-parent history`],
    };
  }

  const errors: string[] = [];
  const seen = new Set<number>();
  const earlyMaintenance = new Set<number>();
  const controlled = commits.slice(bootstrapIndex);

  let expected = 1;
  for (const commit of controlled) {
    const [title = ""] = commit.message.split(/\r?\n/, 1);
    const match = title.match(TITLE);

    if (!match) {
      errors.push(`${short(commit.sha)}: title must match '[BY-NNN] [TYPE] Imperative summary'`);
      continue;
    }

    const id = Number.parseInt(match[2], 10);
    const label = match[1];
    const type = match[3];

    if (seen.has(id)) errors.push(`${short(commit.sha)}: duplicate controlled ID ${label}`);
    else seen.add(id);

    while (earlyMaintenance.has(expected)) expected += 1;
    const maintenance = /^Portfolio-Plan-Maintenance: true$/m.test(commit.message);
    if (maintenance && id > expected) {
      earlyMaintenance.add(id);
    } else if (id !== expected) {
      errors.push(
        `${short(commit.sha)}: expected BY-${String(expected).padStart(3, "0")}, found ${label}`,
      );
    } else {
      expected += 1;
    }

    if (!CONTROLLED_TYPE_SET.has(type)) {
      errors.push(
        `${short(commit.sha)}: unsupported controlled type '${type}'; expected one of ${CONTROLLED_TYPES.join(", ")}`,
      );
    }

    if (id === 1 && commit.sha === bootstrapSha) continue;

    const fields = bodyFields(commit.message);
    for (const field of ["Task", "Scope", "Validation"] as const) {
      const values = fields.get(field) ?? [];
      if (values.length !== 1 || !values[0]) {
        errors.push(
          `${short(commit.sha)}: ${label} requires exactly one non-empty '${field}:' body field`,
        );
      }
    }

    const task = fields.get("Task")?.[0];
    if (task && task !== label) {
      errors.push(`${short(commit.sha)}: Task field '${task}' does not match ${label}`);
    }
  }

  return { controlledCommits: controlled.length, errors };
}

function git(root: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd: root, encoding: "utf8" }).trimEnd();
}

export function readControlledHistory(
  root = ROOT,
  bootstrapSha = BOOTSTRAP_SHA,
): HistoryCommit[] {
  try {
    git(root, ["cat-file", "-e", `${bootstrapSha}^{commit}`]);
    git(root, ["merge-base", "--is-ancestor", bootstrapSha, "HEAD"]);
    const revisions = git(
      root,
      ["log", "--first-parent", "--reverse", "--format=%H", `${bootstrapSha}^..HEAD`],
    ).split("\n").filter(Boolean);

    return revisions.map((sha) => ({
      sha,
      message: git(root, ["show", "-s", "--format=%B", sha]),
    }));
  } catch {
    throw new Error(
      `BY-001 bootstrap ${bootstrapSha} is unavailable from HEAD; fetch full first-parent history`,
    );
  }
}

export function main(argv: readonly string[]): number {
  const asJson = argv.includes("--json");
  try {
    const validation = validateControlledHistory(readControlledHistory());
    const ok = validation.errors.length === 0;

    if (asJson) console.log(JSON.stringify({ ok, ...validation }, null, 2));
    else {
      for (const error of validation.errors) console.error(`check:history: ${error}`);
      if (ok) {
        console.log(
          `check:history: ${validation.controlledCommits} controlled first-parent commits are sequential and valid`,
        );
      }
    }

    return ok ? 0 : 1;
  } catch (error) {
    if (asJson) console.log(JSON.stringify({ ok: false, error: (error as Error).message }, null, 2));
    else console.error(`check:history: ${(error as Error).message}`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
