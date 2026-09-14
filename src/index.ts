/**
 * Everything a lab needs to read Boneyard's data, and nothing that assumes how it is drawn.
 *
 * No DOM, no filesystem, no bundler. A browser fetches the JSON and passes it here; a pipeline
 * reads it off disk and passes it here. That is what lets two labs interpolate a clip the same
 * way instead of holding two implementations together with a parity test.
 */

export { SUPPORTED_CONTRACT, validateRig, hasAnchor, anchorPoint, hierarchyOrder } from "./rig/contract.ts";
export { forwardKinematics, inBone } from "./rig/fk.ts";
export type { Placed } from "./rig/fk.ts";
export { depthProfileName } from "./rig/depth.ts";
export { sampleClip } from "./rig/sample.ts";
export type {
  Anchor, Bone, BvhLayout, CosmeticKind, DepthProfile, DepthProfiles, DepthSide, DepthSides,
  Exchange, Naming, Point, Rig, RigBone, RigContract, Sockets, Space, Wardrobe,
} from "./rig/types.ts";

export type { BonePose, Clip, Easing, Keyframe, Pose } from "./clips/types.ts";

export {
  COSMETIC_REFERENCE_PATTERN_SOURCE, FIGURE_CONTRACT, FIGURE_ID_PATTERN_SOURCE,
  PART_REFERENCE_PATTERN_SOURCE, cosmeticReference, figurePath, inspectPart, validateFigure,
} from "./figure/manifest.ts";
export type { FigureManifest } from "./figure/manifest.ts";

export {
  cosmeticFit, inspectCosmetic, placementTransform, resolveCosmetic, resolveCosmeticPlacements,
  validateWardrobeSet,
} from "./wardrobe/placement.ts";
export type {
  CosmeticAlign, CosmeticAsset, CosmeticFit, CosmeticPiece, CosmeticPlacement, WardrobeIndex,
  WardrobeIndexPiece, WardrobeIndexSet, WardrobeSet,
} from "./wardrobe/placement.ts";
