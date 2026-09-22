# Active implementation plan

This is Boneyard's current/future process-adoption queue under WG-ARCH-001 §27. `BY-001` is the first prospective controlled change; old unnumbered commits remain immutable history. On `do needful`, re-fetch `main`, open PRs and exact-head CI; finish a current green authoritative PR first, then take only the first task. Do not bypass a blocked first task without owner direction. Each delivering PR removes its block and updates later scope. Delete this plan in its last delivery; Git/GitHub retain completed work.

Boneyard is a private asset/data library, not a browser application or hosted service. `npm run dev`, a Worker, production deployment and a browser runtime are genuinely N/A. The published-source process still requires policy, controlled changes, CI, canonical `check`, settings verification, source attribution and immutable release semantics if a release is ever published. Preserve the deterministic generated-asset `--check` modes, footprint/cruft guards, Blender evidence and exact consumer-facing data paths. GitHub's private ruleset API currently returns a plan/tier 403; that is a provider blocker, not an exemption. Each task has one narrow outcome.

## Open tasks

### BY-009 — [TEST] Commit pure expected repository settings

- Dependency: none; first open task.
- Why: Canonical repository acceptance now runs on pull requests and `main`, but no settings-as-code record defines protected `main`, required CI or immutable release tags if publication begins.
- Scope: Add an expected settings record and pure comparison tests, with current no-release capability explicit; avoid claiming live rulesets from credential-free tests.
- Non-goals: No provider mutation or publication.
- Acceptance: Material expected-settings drift fails `check` while product N/A boundaries remain honest.
- Validation: Focused settings tests; `npm run check`; `git diff --check`.
- Authorities: `config/github-repository-settings.json`, new tests, WG-ARCH-001 §27.

### BY-010 — [OPS] Verify live protections or surface the tier blocker

- Dependency: BY-009 merged.
- Why: GitHub's private-repository ruleset API currently returns a plan/tier 403, so pure settings tests cannot prove provider protection.
- Scope: Add read-only live verification and actionable error handling; if the feature remains unavailable, leave the task open and request owner/provider action.
- Non-goals: No visibility change, paid upgrade, bypass or release. Delete this plan only after this task genuinely completes.
- Acceptance: Live protection matches the expected settings or the exact unresolved provider blocker is reported, never called N/A.
- Validation: Pure tests; `npm run check`; live verifier when authorized; `git diff --check`.
- Authorities: settings record, GitHub ruleset API, `SECURITY.md`.

## Recheck after this wave

Re-audit source/package exposure, license attribution, downstream pin integration and release need from fresh state. Do not create a production deployment for a data library.
