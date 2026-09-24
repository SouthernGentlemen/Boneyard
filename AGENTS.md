# Working in Boneyard

Boneyard is the rig, the art and the motion. A PNG sprite sheet becomes one fitted SVG per body
part; a figure manifest selects parts and cosmetics; motion capture and hand edits become sparse
keyframes on that rig; and a small set of pure functions says what all of it means. Every lab
that draws these characters consumes this repository rather than keeping its own copy.

This file is the contract. It describes the repository as it exists. When code and this file
disagree, one of them is a bug — say which.

When `IMPLEMENTATION_PLAN.md` exists, it is the active current/future queue and its first open task has priority over new asset work unless the owner explicitly changes priority. When the plan is absent, controlled implementation pauses for a fresh repository/provider audit and a new prospective queue; completed tasks belong in Git/GitHub.

## Controlled work

Prospective controlled changes use permanent IDs `BY-NNN`, starting with `BY-001`. Do not
retrofit IDs onto older history. An active task owns exactly one controlled branch and delivery:

- branch: `by-NNN-kebab-case-summary`;
- controlled commit and PR title: `[BY-NNN] [TYPE] Imperative summary`, using the task's declared
  type and ID;
- controlled commit body: identify `Task: BY-NNN`, summarize the narrow scope, and record the
  validation actually run;
- PR body: identify the task and scope, record validation, describe the provider state or actions
  truthfully, and name the next-task handoff. Never claim a CI check, protection, release,
  deployment or other provider capability that was not observed.

Controlled `TYPE` is one of `BUILD`, `DOCS`, `FIX`, `OPS`, `REFACTOR`, `SEC` or `TEST`.
`BY-001` is the sole bootstrap exception to the permanent body-field rule. `BY-002` and later
controlled commits require exactly one non-empty `Task:`, `Scope:` and `Validation:` field, and
`Task:` must repeat the title ID.

`do needful` means re-fetch authoritative `main`, open PRs and current provider state before
editing. If an active implementation plan exists, finish a current authoritative PR for its first
open task rather than duplicating it, otherwise take only that first task. If it is blocked, report
the exact blocker and stop; do not skip ahead without owner direction. When no active plan exists,
enter fresh planning mode: audit current repository and provider drift and publish a new prospective
queue before implementation. Unrelated PRs are not substitutes for the queue task.

One task is one delivery: branch from current `main`, implement only that task, run its required
local validation, make one controlled branch commit, inspect the exact PR head and provider
rules/checks that actually exist, then squash the exact green/current head. Confirm one controlled
commit on `main`, post-merge CI and completed-branch cleanup. Merge commits and rebase merges are
not controlled delivery methods.
The delivering change removes its own task from `IMPLEMENTATION_PLAN.md`; completed task text does
not survive as a plan-history log.

When the final queued task is delivered, delete `IMPLEMENTATION_PLAN.md` in that same delivery
instead of leaving an exhausted placeholder. The next `do needful` then enters fresh planning
mode: re-audit current repository and provider state and publish a new prospective queue before
implementation work resumes.

End every controlled-work turn after that one delivery. Return a complete kickoff prompt for the
new first open task, or a fresh-planning kickoff when the queue is exhausted. Do not begin the
next task in the same turn.

Boneyard remains an asset/data library throughout this process. Controlled-work parity does not
invent `npm run dev`, a browser application, a server, a Worker or a production deployment.

## What lives here, and why the line is where it is

**A pipeline lives here if it reads or writes the asset directories.** That is the whole rule.
It is why the sprite tracer, the wardrobe build, the motion build and the BVH exchange are here
alongside the files they produce: a generated file that its generator cannot reach is a file
nobody can verify.

**In scope**: `rigs/`, `characters/`, `cosmetics/`, `figures/`, `motions/`, `catalog/`, the
pipelines that generate them, the guards that check them, and the pure modules in `src/` that
interpret them.

**Out of scope**: anything that decides how the data is *presented or played*. No DOM, no
renderer, no combat, no server, no bundler, no framework. A consumer's bundle weight, its move
timing, its depth choices at runtime and its UI are its own business. Boneyard has no `dist/`
because it does not build a bundle: the asset directories are the bundle.

## Contracts

Each one is testable, and something in `check` tests it.

**C1 — The rig is data.** `rigs/<name>.rig.json` is the single source of truth: a `contract`
version a loader refuses to guess at; bones as `{ name, parent, offset: [x, y], tip, slot,
artHeight }` in SVG units with y down, pivots at bone heads, tails declared so every build
produces a byte-identical armature, roll zero; paint order; per-profile depth layers; the
SVG↔Blender axis mapping; and the BVH channel layout. Bone names are ASCII, hyphen-separated,
unique, and at most 63 characters, because that is Blender's limit and a name must never change
crossing the boundary. Art references bones by id and carries no skeleton of its own.

It also carries the four things that make every piece interchangeable — **anchors** (named
points on a bone, in rig units, which a cosmetic binds to instead of a pixel offset in the sheet
it was drawn on), **depth slots** (`under`, `part`, `over`, `outer`, ordered inside each bone's
group), **sockets** (the overlap a part must provide at each joint and the width step allowed
there), and **cosmetic kinds** (a named bundle of defaults a piece overrides what it needs of,
listing in `fitted` the figures it actually suits).

**A figure is a manifest, not a document.** `figures/<name>.json` names which part fills each
slot, which cosmetics are worn and which rig it targets. The art it names may come from any
number of sheets.

**C2 — One tick domain, one sampler, one pose count.** Integer ticks at 60 Hz. Source at 30 fps
is resampled. `src/rig/sample.ts` is the only interpolator, and it imports nothing but its own
types so a browser, a pipeline and a second lab all run the same code. There is never a second
implementation held together by a parity test — that rule is the reason this repository exists.

**Every clip holds exactly thirteen poses**, at evenly spaced phases from pose 0 to pose 12.
The poses say what the motion is; `duration` says how long it takes, and the two are independent.
That is what makes production consistent: authoring a clip is always the same job, pose `i` of
one clip is comparable to pose `i` of another, and retiming is a change to one number rather
than a re-key. Twelve intervals is the classic full-animation rate — a one-second cycle is twelve
drawings a second — and divides by two, three, four and six, so a move reads in halves, thirds
and quarters. Sixteen would put poses less than a tick apart on anything under a third of a
second; eight leaves a one-second cycle too thin for breakdowns.

Phases are deliberately not ticks. Binding poses to whole ticks would force every duration to a
multiple of twelve, and a fighting game needs to be able to say sixteen ticks. The cost is
measured and real: a contact tick that does not land on a pose is interpolated, which reads the
strike's captured -84.8° as -83.1°. The fix for that is a duration that puts the contact on a
pose, not a larger pose count.

**C3 — Generated output versus authored source.** Generated files carry a header saying so,
rebuild byte-identically, contain no timestamps or machine paths, and have a `--check` mode that
fails when stale. `catalog/clips.json`, `figures/index.json`, `cosmetics/index.json`, the traced
part and cosmetic SVGs and the two authored schemas are generated and tracked.
`motions/authored/<key>.json` is tracked source and the only place a hand edit survives.

There is a third category: **derived and not shipped.** A study clip rebuilds deterministically
and is written to `out/` on every build, where a Blender project is pointed at it, but it is not
in the catalog C5 measures. The reason that split existed has largely gone: the two studies were
59,523 bytes as sparse per-tick keyframes and are 8,770 at a normalised pose count, because a
clip's weight no longer scales with how long it is.

**C4 — The exchange is measured, not assumed.** Export bakes **one BVH frame per pose** through
the runtime sampler, so a file carries exactly what the catalog holds and an untouched round trip
is identity rather than nearly-identity. One frame per *tick* was right when keys sat on ticks;
once poses moved to phases a 60 Hz bake sampled across the corners and reading it back cut them,
measured at 5.06° on the twenty-tick strike. The clip's length is not lost with the tick grid:
BVH's own `Frame Time` carries it, as the seconds one pose interval takes, and an animator gets
thirteen real keys to grab instead of sixty-one baked samples.

A frame time that differs from 1/60 is therefore no longer an error — it is how a file states
its tempo. What is still checked, because it is the mistake that actually happens, is that the
header implies a whole number of 60 Hz ticks; a scene left at 24 FPS does not.

Import measures what it is given: the drawing's axes come out of the file's own offsets, the
planar rotation from whichever channel turns about the depth those axes imply, and a uniform
scale is divided back out. Anything the rig cannot hold — out-of-plane rotation, depth
translation, horizontal root travel — is measured, attributed to the bones it came from, and
reported against the bone's own rest offset. There is no Douglas–Peucker reduction any more:
with the phases fixed there is nothing to select, so a read is a resample. Rotation stores to one
decimal and position to two, because one rounding rule cannot express two tolerances.

**C5 — The footprint is a ratchet, not a budget.** `check:footprint` records what every part,
cosmetic, figure and generated catalog weighs and fails when a number grows. Accepting growth
means committing the new baseline, which puts the increase in a diff where someone has to look
at it. A consuming lab's own bundle is that lab's ratchet, against its own baseline.

**C6 — Agent-drivable pipelines.** Every stage is a deterministic CLI with machine-readable
output, a `--check` mode, and a visual artefact to look at.

**C7 — Provenance survives every hop.** A `bnr*` clip is an adaptation of Bandai Namco material
under CC BY-NC 4.0 and names the manifest clip it came from; a `lab*` clip is original here and
sets `derivedFrom` to null. `LICENSE.md` is the attribution index and `check:cruft` fails when it
names a path that does not exist.

## Consuming this repository

A lab declares `"boneyard": "file:../Boneyard"`, imports the contract code from `boneyard`, and
serves or copies whichever of `rigs/ characters/ cosmetics/ figures/ catalog/` it needs.
`boneyard/paths` resolves those directories for a consumer that reads them off disk.

Nothing here knows the name of a consumer. If a change to this repository is motivated by one
lab's rendering problem, it is probably that lab's change.

## Acceptance

```bash
npm run build    # regenerate parts, cosmetics, the catalog and the indexes
npm run check    # canonical full acceptance: every gate, typecheck, tests
npm run audit:dependencies  # separate network-dependent high-severity advisory gate
```

`npm run verify` is a temporary compatibility alias for `npm run check`; it must not own or duplicate gates.

The repository toolchain is Node 26.9.0 with npm 11.19.1. `.node-version` is the Node authority,
`package.json` pins the package manager and exact engines, and `.npmrc` rejects unsupported
runtime versions. Use that pair before `npm ci` or any acceptance command.

Shared process normalization pins Boneyard's direct development tools exactly to `@types/node`
24.13.5, TypeScript 5.9.3 and Vitest 5.0.1. The TypeScript 5 / Node-types 24 lane is intentional:
FightLab consumes Boneyard source under that compiler/type contract, so Boneyard continues to test
the lowest supported direct-source consumer lane while newer siblings may use TypeScript 7 and
Node-types 26. Revisit that compatibility floor only with the source consumers together.

`CONTRIBUTING.md` is the byte-identical shared public-repository contribution contract. Boneyard-
specific asset, release and no-deploy rules live here rather than forking that shared file.

GitHub Actions checks out the exact pull-request head or accepted `main` revision with full history.
Pull requests run `git diff --check` against their base, the workflow resolves the committed
toolchain, installs with `npm ci`, runs the separate network-dependent `npm run audit:dependencies`
gate, requires real Blender, then invokes `npm run check` once. `npm run check` remains the canonical
repository-owned acceptance graph and does not absorb the advisory network dependency.

Repository/provider process authority is committed in `config/github-repository-settings.json`.
The supported delivery policy is squash-only with merged-branch cleanup. The active
`main-protection` ruleset requires a pull request, requires the exact `verify` status check and a
head current with `main`, blocks deletion and non-fast-forward updates, and has no bypass actors.
The active `release-tag-immutability` ruleset covers `refs/tags/v*`, blocks tag update and deletion,
and has no bypass actors. `check:history` keeps controlled first-parent BY history sequential and
requires the permanent title/body contract. `npm run test:github-settings` guards the committed
policy without credentials; `npm run verify:github-settings` separately compares the live provider
state when an administration-capable token is available, and `npm run apply:github-settings` is the
explicit write path.

Annotated semantic `vX.Y.Z` tags use `.github/workflows/release.yml` as the GitHub Release path.
The workflow checks out the exact tag with full history, verifies the annotated tag/package identity,
installs the locked dependencies, requires real Blender for canonical `npm run check`, and only then
publishes with `gh release create --verify-tag`. Existing releases are treated idempotently; a failed
create is accepted only when a release for that same tag can subsequently be observed. GitHub Releases
are the distribution authority; this does not publish the private package or create a deployment.

Downstream adoption is consumer-owned: pin an immutable annotated `vX.Y.Z` Git tag (or the matching
GitHub Release), validate that exact revision in the consumer, and explicitly advance the pin when a
new release is adopted. Boneyard does not publish to the npm registry, host a Worker/runtime server,
deploy GitHub Pages, run production deployment commands, or mutate consumer repositories as part of
release. Adding any such capability requires an explicit future architecture change that updates this
contract and its boundary tests first.

Reset and teardown may delete `out/` only. Never authored source, never a `.blend` someone is
editing.
