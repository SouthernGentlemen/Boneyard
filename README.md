# Boneyard

The rig, the art and the motion — one source of truth, consumed by every lab that draws these
characters. Extracted from [SVGLab](https://github.com/SouthernGentlemen/SVGLab) so a second
tool can key a pose without a second copy of the skeleton.

**[`AGENTS.md`](AGENTS.md) is the contract** — what this repository is, what it is not, and the
seven contracts every path is held to. Read it first.

## What a consumer gets

| Surface | What it is |
| --- | --- |
| `rigs/fighter.rig.json` | Eleven bones, anchors, depth slots, sockets, cosmetic kinds, the Blender axis map and the BVH channel layout. |
| `characters/<id>/parts/*.svg` | One fitted SVG per rig slot, traced from that character's atlas. |
| `cosmetics/<set>/*.svg` + `set.json` | Wardrobe pieces bound to anchors in rig units, including the one-handed weapon. |
| `figures/*.json` + `index.json` | A figure is a manifest: which part fills each slot, which cosmetics are worn, which rig. |
| `catalog/clips.json` | Every clip, as sparse keyframes in the 60 Hz tick domain, with each clip's origin and lane. |
| `boneyard` (the package) | The pure functions that interpret all of it: rig validation, forward kinematics, the sampler, figure and wardrobe validation, cosmetic placement. |

```js
import { validateRig, forwardKinematics, sampleClip } from "boneyard";

const rig = validateRig(await fetch("/rigs/fighter.rig.json").then((r) => r.json()));
const joints = forwardKinematics(rig, sampleClip(clip, tick));
```

Two labs that both call `sampleClip` cannot disagree about what a keyframe means. That is the
whole reason the code ships with the data instead of being copied beside it.

## Releases and downstream updates

Boneyard is released as immutable annotated `vX.Y.Z` Git tags with matching GitHub Releases.
A downstream consumer pins the repository to one of those tags (for example with its Git dependency
or lockfile), validates that exact release in the consumer, and explicitly advances the pin when it
chooses to adopt a newer release. The GitHub Release is the discovery/distribution record for the
same immutable tag; Boneyard is not published to the npm registry and does not push updates into
consumer repositories.

## Run the pipelines

Use Node 26.9.0 with npm 11.19.1, as pinned by `.node-version` and `package.json`.

```bash
npm ci
npm run build                            # parts, cosmetics, catalog and indexes
npm run render:figure -- --figure yuliya # an assembled review sheet in out/render/
npm run render:clip -- --clip labWave    # a motion contact sheet
npm run check                            # canonical full acceptance: every gate, typecheck and tests
npm run test:github-settings             # credential-free GitHub policy cases
```

Pull requests targeting `main` and pushes to `main` run that same gate in GitHub Actions after
the pinned toolchain, locked `npm ci` install and required Blender setup.

`npm run verify:github-settings` reads live repository settings under `GH_ADMIN_TOKEN` or an
authorized `GH_TOKEN`. `npm run apply:github-settings` is the explicit admin/write path and
independently re-reads the committed settings contract after applying it.

## Guides

- [Active implementation plan](IMPLEMENTATION_PLAN.md) — current and future baseline work while the queue is open.
- [Security policy](SECURITY.md) — private vulnerability reporting and sensitive-data handling.
- [Contributing](CONTRIBUTING.md) — controlled BY changes, validation, generated outputs,
  attribution and the repository's real capability boundary.
- [Agent authoring loop](docs/AUTHORING.md) — write a clip or figure against the committed
  schemas, validate it, render a sheet and iterate.
- [Character atlases](docs/CHARACTER_ATLAS.md) — draw a body-part sheet and trace it into fitted,
  swappable SVG parts.
- [Motion import](docs/MOTION_IMPORT.md) — source provenance, planar retargeting, catalog lanes,
  and the measured Blender round trip.
- [Licence and attribution index](LICENSE.md) — read it before adding source material or
  distributing an adaptation.
