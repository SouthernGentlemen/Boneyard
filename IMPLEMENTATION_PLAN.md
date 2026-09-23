# Active implementation plan

This is Boneyard's current/future process-convergence queue under WG-ARCH-001 §27. Controlled work remains one narrow task per branch/PR/merge. On `do needful`, re-fetch authoritative `main`, open PRs, exact-head CI, repository settings, rulesets, tags and releases before editing. Finish a current authoritative PR for the first open task rather than duplicating it. Each delivering PR removes its own block and updates later scope from fresh evidence. Delete this plan in its final delivery; Git/GitHub retain completed work.

Boneyard is an asset/data library, not a browser application or hosted service. A Worker, runtime server and production deployment remain genuinely N/A. Process parity here means the same npm/toolchain discipline, controlled merge policy, GitHub CLI/provider controls, immutable tag identity and GitHub Release authority used by the active repositories, while preserving Boneyard's deterministic generated-asset checks, Blender acceptance, provenance rules and downstream data-library contract.

## Open tasks

### BY-015 — [BUILD] Define immutable release identity

- Dependency: BY-013.
- Why: Boneyard currently has no GitHub Release line, but downstream consumers need a deterministic way to identify an immutable reviewed asset/data revision without publishing to npm.
- Scope: Define one release identity contract tying `package.json` version, annotated semantic tag `vX.Y.Z`, exact tagged commit and repository content together. Keep `private: true`; GitHub Releases are the distribution authority, not the npm registry.
- Non-goals: No npm publication, deployment, asset rewriting or consumer upgrade in this task.
- Acceptance: A release candidate can be proven locally from immutable repository inputs and fails on tag/version/commit mismatch.
- Validation: Release-identity cases; canonical `npm run check`; `git diff --check`.
- Authorities: `package.json`, Git annotated tags, release identity scripts/tests.

### BY-016 — [TEST] Guard annotated tag and package identity

- Dependency: BY-015.
- Why: The release contract needs deterministic failure cases before provider publication depends on it.
- Scope: Add pure disposable-repository cases proving lightweight tags fail, mismatched semantic versions fail, tags pointing at the wrong commit fail, and the correct annotated exact-head tag succeeds. Keep network and credentials out of canonical acceptance.
- Non-goals: No GitHub Release creation or provider mutation.
- Acceptance: Canonical `npm run check` exercises the full release-identity boundary with both positive and negative cases.
- Validation: Release identity test suite; `npm run check`; `git diff --check`.
- Authorities: release identity implementation and Git semantics.

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
