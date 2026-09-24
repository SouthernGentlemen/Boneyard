# Active implementation plan

**Portfolio plan maintenance notice.** The owner may direct an additive update to this active queue while another task or pull request is in progress. Keep every existing open task and its order; a plan amendment neither implements nor retires it. After the shared policy setup, a routine amendment changes only this plan file. Before merging, re-fetch authoritative `main` and open pull requests, compare the current plan and exact head with the recorded base, and rebase/reconcile if either moved. Require current exact-head checks and mergeability so concurrent work is not overwritten. Any earlier “final task” or “no queue remains” wording applies to its original wave; it keeps this plan while appended tasks remain, and only the actual last task deletes it.

This is Boneyard's current/future process-convergence queue under WG-ARCH-001 §27. Controlled work remains one narrow task per branch/PR/merge. On `do needful`, re-fetch authoritative `main`, open PRs, exact-head CI, repository settings, rulesets, tags and releases before editing. Finish a current authoritative PR for the first open task rather than duplicating it. Each delivering PR removes its own block and updates later scope from fresh evidence. Delete this plan in its final delivery; Git/GitHub retain completed work.

Boneyard is an asset/data library, not a browser application or hosted service. A Worker, runtime server and production deployment remain genuinely N/A. Process parity here means the same npm/toolchain discipline, controlled merge policy, GitHub CLI/provider controls, immutable tag identity and GitHub Release authority used by the active repositories, while preserving Boneyard's deterministic generated-asset checks, Blender acceptance, provenance rules and downstream data-library contract.

## Open tasks

### BY-017 — [OPS] Publish GitHub Releases from verified tags

- Dependency: BY-016.
- Why: The organization release path is annotated tag -> exact identity verification -> canonical acceptance -> GitHub Release. Boneyard should use the same authority even though it does not deploy.
- Scope: Add the provider workflow/CLI path that accepts only a verified annotated `vX.Y.Z` tag, resolves the exact tagged revision, runs `npm ci` and canonical `npm run check`, verifies package/tag identity, then publishes with `gh release create --verify-tag`. Publication must be idempotent or fail safely if the release already exists.
- Non-goals: No npm registry publication, Cloudflare/Wrangler deployment or automatic version bump.
- Acceptance: A valid tag can produce exactly one GitHub Release only after all identity and acceptance gates pass; invalid tags cannot publish.
- Validation: Workflow structure tests; exact-head/tag CI evidence; GitHub Release provider evidence when exercised; `git diff --check`.
- Authorities: release workflow, GitHub CLI, annotated tag, package version.

### BY-018 — [TEST] Guard the non-deployable library boundary

- Dependency: BY-017.
- Why: Cross-repo parity must not accidentally turn Boneyard into a hosted service. Its post-release continuation is downstream consumer pinning, not production deployment.
- Scope: Codify and test that Boneyard has no production deploy command/workflow/runtime while documenting the supported downstream pin/update path against immutable Git tags/releases. Guard against introduction of a Worker, Pages deploy, production Wrangler command or npm publication without an explicit future architecture change.
- Non-goals: No consumer-repository modification in this task.
- Acceptance: Canonical acceptance proves release capability exists while deployment/publication capability remains intentionally absent.
- Validation: Boundary tests; documentation checks; `npm run check`; `git diff --check`.
- Authorities: `AGENTS.md`, `CONTRIBUTING.md`, `package.json`, workflows.

### BY-019 — [DOCS] Complete process-parity acceptance

- Dependency: BY-018.
- Why: The wave should end with one fresh comparison against the active organization baseline rather than leaving drift hidden in accumulated task assumptions.
- Scope: Re-audit npm/toolchain, canonical acceptance, controlled history, merge settings, provider CLI, branch/ruleset enforcement, tag identity, GitHub Release behavior and the explicit no-deploy boundary. Reconcile current-state docs only. Delete `IMPLEMENTATION_PLAN.md` in this delivery when all required evidence is green.
- Non-goals: No new feature or unrelated asset work.
- Acceptance: Fresh repository and provider evidence show Boneyard follows the shared process everywhere applicable, with deployment explicitly N/A, and no implementation queue remains.
- Validation: `npm ci`; `npm run check`; live settings verification; release/tag evidence; exact-head CI; `git diff --check`.
- Authorities: current repository state, provider state and organization baseline.

### BY-021 — [OPS] Normalize shared package, workflow, and npm command contracts

- Dependency: BY-019 delivered; portfolio planning policy BY-020 merged. Coordinate with the same normalization task in every public sibling repository.
- Why: Shared versioned tooling, workflow behavior, and npm command meanings have drifted across the public repositories.
- Scope: Inventory every public repository's direct and transitive shared npm packages, package manager, Node pin, lockfile, versioned vendor code, GitHub Action pins, workflow triggers/permissions/toolchain/install/check/advisory/identity/release/deploy steps, and npm scripts. Select one supported version for each shared vendor dependency or document a concrete compatibility exception. Align common scripts and YAML workflows to the same behavior for equivalent capabilities. Keep product-specific commands and explicit local-only/library/no-deploy boundaries. Reconcile AGENTS.md and the byte-identical CONTRIBUTING.md contract across the public set.
- Non-goals: Do not add unused packages, a hosted runtime to a local-only product, or production deployment merely for parity. Do not rewrite published history or unrelated product behavior.
- Acceptance: A fresh cross-repository matrix shows the same version for every shared versioned package/vendor tool where compatible, identical CONTRIBUTING.md bytes, equivalent workflow and npm-script semantics for applicable capabilities, and recorded exceptions with technical reasons. No workflow invokes a missing script; every package lock matches its manifest.
- Validation: Install each public repository with its pinned toolchain and `npm ci`; run `npm run check`, focused workflow/script contract tests, `git diff --check`, exact-head CI, and the separate network/provider gates where applicable. Re-fetch every target's base and this documentation commit before merging to preserve concurrent work.
