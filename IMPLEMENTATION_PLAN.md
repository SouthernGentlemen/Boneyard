# Active implementation plan

This is Boneyard's current/future process-adoption queue under WG-ARCH-001 §27. `BY-001` is the first prospective controlled change; old unnumbered commits remain immutable history. On `do needful`, re-fetch `main`, open PRs and exact-head CI; finish a current green authoritative PR first, then take only the first task. Do not bypass a blocked first task without owner direction. Each delivering PR removes its block and updates later scope. Delete this plan in its last delivery; Git/GitHub retain completed work.

Boneyard is a private asset/data library, not a browser application or hosted service. `npm run dev`, a Worker, production deployment and a browser runtime are genuinely N/A. The published-source process still requires policy, controlled changes, CI, canonical `check`, settings verification, source attribution and immutable release semantics if a release is ever published. Preserve the deterministic generated-asset `--check` modes, footprint/cruft guards, Blender evidence and exact consumer-facing data paths. GitHub's private ruleset API currently returns a plan/tier 403; that is a provider blocker, not an exemption. Each task has one narrow outcome.

## Open tasks

### BY-002 — [DOCS] Define the one-task controlled work queue

- Dependency: BY-001 merged on `main`.
- Why: `AGENTS.md` has excellent asset contracts but no permanent change IDs, `do needful`, active queue or exact-head PR/CI/merge handoff.
- Scope: Define prospective BY branch/title/body, first-open/blocked selection, same-delivery task purge, queue exhaustion and one-turn handoff without changing the library's product scope.
- Non-goals: No asset, rig, pipeline or package behavior change.
- Acceptance: A fresh agent can execute one BY task and stop with the next prompt; completed tasks do not remain in the plan.
- Validation: `npm run verify`; `git diff --check`.
- Authorities: `AGENTS.md`, WG-ARCH-001 §27.

### BY-003 — [DOCS] Add contributor and capability guidance

- Dependency: BY-002 merged.
- Why: No root `CONTRIBUTING.md` explains the controlled process or why `dev` and hosted deploy are N/A while `build`/`verify` are meaningful.
- Scope: Add concise branch/PR, command, generated-output, attribution and release-capability guidance; keep `LICENSE.md` as the explicit license/index authority.
- Non-goals: No npm or source change.
- Acceptance: A contributor knows how to validate a data-library change without inventing a server or production environment.
- Validation: Review package scripts and links; `npm run verify`; `git diff --check`.
- Authorities: `CONTRIBUTING.md`, `README.md`, `LICENSE.md`.

### BY-004 — [SEC] Establish private vulnerability reporting

- Dependency: BY-003 merged.
- Why: Root `SECURITY.md` is missing despite distributed asset provenance and executable pipelines.
- Scope: Add a private reporting route and rules for credentials, source assets, restricted media and generated/export artifacts; preserve the attribution model.
- Non-goals: No license rewrite, hosted endpoint or certification claim.
- Acceptance: A reporter and contributor have an explicit security/data boundary.
- Validation: Policy/link review; `npm run verify`; `git diff --check`.
- Authorities: `SECURITY.md`, `LICENSE.md`, `.gitignore`.

### BY-005 — [TEST] Validate prospective BY change history

- Dependency: BY-004 merged.
- Why: Future changes have no machine-checked permanent identity, while earlier unnumbered history must remain untouched.
- Scope: Validate BY-001 onward for sequential unique IDs, controlled title/type and required body fields; add focused valid/invalid cases.
- Non-goals: No old-commit rewrite or forced merge policy.
- Acceptance: New malformed or duplicate IDs fail without treating old history as fabricated controlled records.
- Validation: Focused history tests; `npm run verify`; `git diff --check`.
- Authorities: `AGENTS.md`, new validator.

### BY-006 — [BUILD] Expose full asset acceptance as `npm run check`

- Dependency: BY-005 merged.
- Why: `verify`, not `check`, currently owns deterministic rig/part/motion/bundle checks, exchange, wardrobe, footprint, cruft, Blender, typecheck and tests.
- Scope: Make `check` the canonical credential-free gate with that existing coverage plus prospective history; retain `verify` temporarily as an alias without executing gates twice.
- Non-goals: No new browser runtime, source regeneration or weakened guard.
- Acceptance: One `check` validates all applicable library outputs and leaves tracked generated files unchanged.
- Validation: `npm run check`; `npm run verify`; `git diff --check`.
- Authorities: `package.json`, `CONTRIBUTING.md`.

### BY-007 — [BUILD] Pin the Node/npm toolchain for repeatable pipelines

- Dependency: BY-006 merged.
- Why: The package has no `.node-version`, `packageManager` or engine policy even though native TypeScript pipeline behavior depends on Node.
- Scope: Pin a compatible tested Node/npm pair and locked-install policy; document the version without forcing the architecture reference stack's unrelated browser/Worker dependencies.
- Non-goals: No dependency upgrade or generated asset change unless the new pinned toolchain proves it necessary.
- Acceptance: Local/CI setup resolves the same supported toolchain and `npm ci` uses the committed lockfile.
- Validation: `npm ci` with pinned versions; `npm run check`; `git diff --check`.
- Authorities: `package.json`, package lock, `.node-version`, `.npmrc`.

### BY-008 — [BUILD] Run canonical acceptance in PR and `main` CI

- Dependency: BY-007 merged.
- Why: The library has no CI even though FightLab consumes its exact commit and digest.
- Scope: Add PR/main workflow using the pinned toolchain, `npm ci`, `npm run check` and bounded failure output; keep Blender tooling explicit rather than silently skipping a required assertion.
- Non-goals: No publishing or deploy workflow.
- Acceptance: Both exact-head PR and accepted `main` run the same library gate.
- Validation: `npm run check`; workflow review; exact-head CI; `git diff --check`.
- Authorities: `.github/workflows/ci.yml`, `package.json`.

### BY-009 — [TEST] Commit pure expected repository settings

- Dependency: BY-008 merged.
- Why: No settings-as-code record defines protected `main`, required CI or immutable release tags if publication begins.
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
