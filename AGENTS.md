# Working in Boneyard

Boneyard is the rig, the art and the motion. A PNG sprite sheet becomes one fitted SVG per body
part; a figure manifest selects parts and cosmetics; motion capture and hand edits become sparse
keyframes on that rig; and a small set of pure functions says what all of it means. Every lab
that draws these characters consumes this repository rather than keeping its own copy.

This file is the contract. It describes the repository as it exists. When code and this file
disagree, one of them is a bug — say which.

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

Each one is testable, and something in `verify` tests it.

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

**C2 — One tick domain, one sampler.** Integer ticks at 60 Hz. Source at 30 fps is resampled.
`src/rig/sample.ts` is the only interpolator, and it imports nothing but its own types so a
browser, a pipeline and a second lab all run the same code. There is never a second
implementation held together by a parity test — that rule is the reason this repository exists.

**C3 — Generated output versus authored source.** Generated files carry a header saying so,
rebuild byte-identically, contain no timestamps or machine paths, and have a `--check` mode that
fails when stale. `catalog/clips.json`, `figures/index.json`, `cosmetics/index.json`, the traced
part and cosmetic SVGs and the two authored schemas are generated and tracked.
`motions/authored/<key>.json` is tracked source and the only place a hand edit survives.

There is a third category: **derived and not shipped.** A study clip rebuilds deterministically
and is written to `out/` on every build, where a Blender project is pointed at it, but it is not
in the catalog C5 measures.

**C4 — The exchange is measured, not assumed.** Export bakes one BVH frame per tick through the
runtime sampler, so a file plays what the catalog holds. Import measures what it is given: the
drawing's axes come out of the file's own offsets, the planar rotation from whichever channel
turns about the depth those axes imply, and a uniform scale is divided back out. An untouched
round trip changes nothing. Anything the rig cannot hold — out-of-plane rotation, depth
translation, horizontal root travel — is measured, attributed to the bones it came from, and
reported against the bone's own rest offset. Reduction is Douglas–Peucker per channel at 1° and
0.15 units; rotation stores to one decimal and position to two, because one rounding rule cannot
express two tolerances.

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

## Verify

```bash
npm run build    # regenerate parts, cosmetics, the catalog and the indexes
npm run verify   # every gate, typecheck, tests
```

Reset and teardown may delete `out/` only. Never authored source, never a `.blend` someone is
editing.
