# Active implementation plan

This is Boneyard's current/future process-adoption queue under WG-ARCH-001 §27. `BY-001` is the first prospective controlled change; old unnumbered commits remain immutable history. On `do needful`, re-fetch `main`, open PRs and exact-head CI; finish a current green authoritative PR first, then take only the first task. Do not bypass a blocked first task without owner direction. Each delivering PR removes its block and updates later scope. Delete this plan in its last delivery; Git/GitHub retain completed work.

Boneyard is a private asset/data library, not a browser application or hosted service. `npm run dev`, a Worker, production deployment and a browser runtime are genuinely N/A. The published-source process still requires policy, controlled changes, CI, canonical `check`, settings verification, source attribution and immutable release semantics if a release is ever published. Preserve the deterministic generated-asset `--check` modes, footprint/cruft guards, Blender evidence and exact consumer-facing data paths. Provider protection evidence must be read live rather than inferred from credential-free tests. Each task has one narrow outcome.

## Open tasks

### BY-010 — [OPS] Verify live protections or surface the tier blocker

- Dependency: none; first open task.
- Why: `config/github-repository-settings.json` now defines the desired provider policy, including protected `main` with required `verify` CI, but credential-free comparison tests do not prove live GitHub state. The branch resource currently reports `main` unprotected, the dedicated protection endpoint remains inaccessible to the installed integration, and the repository-ruleset collection currently reads successfully but is empty.
- Scope: Add read-only live verification that normalizes current GitHub state against the committed expected settings and reports actionable drift or any exact provider permission/tier blocker encountered at execution time. Do not hard-code today's provider response as permanent truth.
- Non-goals: No visibility change, paid upgrade, provider mutation, protection bypass, release or publication. Delete this plan only after this task genuinely completes.
- Acceptance: Live provider evidence matches the committed expected settings, or the exact unresolved provider drift/blocker is reported truthfully and the task remains open.
- Validation: Pure tests; `npm run check`; read-only live verifier when authorized; `git diff --check`.
- Authorities: `config/github-repository-settings.json`, GitHub branch/protection/ruleset APIs, `SECURITY.md`.

## Recheck after this wave

Re-audit source/package exposure, license attribution, downstream pin integration and release need from fresh state. Do not create a production deployment for a data library.
