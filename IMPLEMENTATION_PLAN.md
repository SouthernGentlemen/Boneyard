# Active implementation plan

This is Boneyard's current/future process-convergence queue under WG-ARCH-001 §27. Controlled work remains one narrow task per branch/PR/merge. On `do needful`, re-fetch authoritative `main`, open PRs, exact-head CI, repository settings, rulesets, tags and releases before editing. Finish a current authoritative PR for the first open task rather than duplicating it. Each delivering PR removes its own block and updates later scope from fresh evidence. Delete this plan in its final delivery; Git/GitHub retain completed work.

Boneyard is an asset/data library, not a browser application or hosted service. A Worker, runtime server and production deployment remain genuinely N/A. Process parity here means the same npm/toolchain discipline, controlled merge policy, GitHub CLI/provider controls, immutable tag identity and GitHub Release authority used by the active repositories, while preserving Boneyard's deterministic generated-asset checks, Blender acceptance, provenance rules and downstream data-library contract.

## Open tasks

### BY-011 — [BUILD] Align Node and npm with the shared baseline

- Dependency: none; first open task.
- Why: Boneyard is pinned to Node 24.21.0 and npm 11.19.0 while the active normalized repositories have moved to the Node 26/npm 11 line. Cross-repo convergence requires one declared organization baseline rather than a Boneyard-specific runtime.
- Scope: Re-fetch the current organization baseline authority and update `.node-version`, `packageManager`, `engines`, `.npmrc`, CI and documentation together so local and provider execution resolve the same exact pair. Do not independently invent a patch version if the shared baseline has changed again.
- Non-goals: No application runtime, dependency upgrade wave, release, provider mutation or deployment.
- Acceptance: `npm ci`, CI and local acceptance resolve the same organization-standard Node/npm pair and fail clearly on a mismatched runtime.
- Validation: Toolchain-focused tests as needed; `npm ci`; `npm run check`; `git diff --check`.
- Authorities: organization baseline repository, `.node-version`, `package.json`, `.npmrc`, `.github/workflows/ci.yml`.

### BY-012 — [TEST] Align committed repository-settings expectations

- Dependency: BY-011.
- Why: BY-009 committed deterministic settings expectations around the then-current merge toggles and conditional tag policy. The organization target is now a shared single-commit merge and release/tag policy.
- Scope: Update the credential-free repository-settings model and pure cases to describe the converged provider policy: protected `main`, required exact-head `verify`, squash-only merging, branch cleanup after merge, least-privilege workflow permissions, and immutable release-tag rules. Preserve the no-deployment capability boundary.
- Non-goals: No live provider mutation or GitHub Release publication.
- Acceptance: Pure tests distinguish the desired settings from each meaningful drift case without credentials or network access.
- Validation: Repository-settings cases inside canonical `npm run check`; `git diff --check`.
- Authorities: `config/github-repository-settings.json`, repository-settings tests, shared organization baseline.

### BY-013 — [BUILD] Expose the common GitHub settings CLI

- Dependency: BY-012.
- Why: Normalized repositories expose explicit credential-free tests plus read-only verification and deliberate apply commands instead of embedding provider behavior in ad hoc instructions.
- Scope: Add the Boneyard equivalents of the shared `test:github-settings`, `verify:github-settings` and `apply:github-settings` command surface, reusing the committed settings authority and keeping verification read-only. Apply must be explicit, deterministic and safe to rerun.
- Non-goals: Do not silently mutate GitHub from `npm run check`; no release or deployment work.
- Acceptance: Pure cases run without credentials; verify reports normalized live drift; apply changes only declared settings and can be followed by a clean verify.
- Validation: CLI-focused tests; canonical `npm run check`; credential-free execution paths; `git diff --check`.
- Authorities: `package.json`, repository-settings authority, shared provider CLI pattern.

### BY-014 — [OPS] Apply and verify the live repository policy

- Dependency: BY-013.
- Why: Current authoritative provider state reports `main` unprotected, no repository rulesets, and all three merge methods enabled. Repository-local expectations are not proof of live enforcement.
- Scope: Re-fetch provider state, apply the committed settings through the explicit CLI/provider path, and verify the result live. Require protected `main`, exact-head `verify`, squash-only merge behavior, automatic completed-branch cleanup where supported, and immutable release-tag protection. Record any exact provider permission or tier blocker instead of claiming success.
- Non-goals: No bypass, visibility change, paid-plan purchase, release publication or deployment.
- Acceptance: Live provider evidence matches the committed authority. If the provider makes a required setting unavailable, do not mark the task complete.
- Validation: Exact provider reads before/after apply; `npm run verify:github-settings`; canonical `npm run check`; exact-head CI.
- Authorities: GitHub live repository/ruleset state and committed settings authority.

### BY-015 — [BUILD] Define immutable release identity

- Dependency: BY-014.
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
