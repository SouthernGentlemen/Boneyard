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

## Run the pipelines

```bash
npm install
npm run build                            # parts, cosmetics, catalog and indexes
npm run render:figure -- --figure yuliya # an assembled review sheet in out/render/
npm run render:clip -- --clip labWave    # a motion contact sheet
npm run check                            # canonical full acceptance: every gate, typecheck and tests
```

## Guides

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
