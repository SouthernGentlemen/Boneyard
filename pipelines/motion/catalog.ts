import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";

import { hierarchyOrder, validateRig } from "../../src/rig/contract.ts";
import type { Clip, Easing } from "../../src/clips/types.ts";
import type { Rig } from "../../src/rig/types.ts";
export {
  AUTHORED_CLIP_FIELDS, AUTHORED_KEY_PATTERN_SOURCE, EASINGS, POSE_PROPERTIES,
  validateAuthoredClip,
} from "../../src/clips/authored.ts";
export type { AuthoredClip } from "../../src/clips/authored.ts";
import { validateAuthoredClip } from "../../src/clips/authored.ts";
import type { AuthoredClip } from "../../src/clips/authored.ts";
import { parseBvh } from "./bvh-parse.ts";
import { retargetClip } from "./retarget.ts";
import type { RetargetDefinition } from "./retarget.ts";

export const MANIFEST_PATH = join("motions", "bandai-namco-motiondataset-1.json");
export const AUTHORED_DIR = join("motions", "authored");
export const CATALOG_OUTPUT = join("catalog", "clips.json");

export type ClipLane = "shipped" | "study";

export interface ManifestClip extends Omit<RetargetDefinition, "targetFps" | "targetLegLength" | "frontSourceSide"
  | "angleTolerance" | "positionTolerance" | "rotationPrecision" | "positionPrecision" | "maxLoopSeamDegrees"> {
  readonly source: string;
  readonly content: number;
  readonly style: number;
  readonly lane: ClipLane;
}

export interface MotionManifest {
  readonly sourceUrl: string;
  readonly sourceRevision: string;
  readonly sourceRoot: string;
  readonly sourceFps: number;
  readonly labels: {
    readonly content: Readonly<Record<string, string>>;
    readonly style: Readonly<Record<string, string>>;
  };
  readonly defaults: Pick<RetargetDefinition, "targetFps" | "targetLegLength" | "frontSourceSide"
    | "angleTolerance" | "positionTolerance" | "rotationPrecision" | "positionPrecision" | "maxLoopSeamDegrees">;
  readonly clips: readonly ManifestClip[];
}


export interface MotionCatalog {
  readonly manifest: MotionManifest;
  readonly rig: Rig;
  readonly bandaiNamco: Readonly<Record<string, Clip>>;
  readonly studies: Readonly<Record<string, Clip>>;
  readonly authored: Readonly<Record<string, Clip>>;
  readonly origins: Readonly<Record<string, string | null>>;
  readonly clips: Readonly<Record<string, Clip>>;
}

/**
 * Two lanes, one catalog.
 *
 * Manifest clips are derived from the pinned Bandai Namco source on every build and must not
 * be edited. Authored clips come back from an external tool through `import:motions` and are
 * source in their own right. An authored clip may carry a manifest clip's key, which is how a
 * hand-tweaked version replaces what the lab plays while the manifest keeps the untouched
 * original for comparison.
 */
export function buildCatalog(root: string): MotionCatalog {
  const manifest = JSON.parse(readFileSync(join(root, MANIFEST_PATH), "utf8")) as MotionManifest;
  const validatedRig = validateRig(JSON.parse(readFileSync(join(root, "rigs", "fighter.rig.json"), "utf8")));
  // The contract need not store bones in traversal order. BVH does, so every motion consumer
  // sees the parent-before-child order the old authored-document reader returned.
  const rig: Rig = { ...validatedRig, bones: [...hierarchyOrder(validatedRig)] };
  const bandaiNamco: Record<string, Clip> = {};
  const studies: Record<string, Clip> = {};
  const derivedClips: Record<string, Clip> = {};

  for (const definition of manifest.clips) {
    const sourcePath = join(root, manifest.sourceRoot, definition.source);
    const sourceLabels = /^dataset-\d+_(.+)_([^_]+)_\d+$/.exec(basename(definition.source, ".bvh"));
    const contentLabel = manifest.labels.content[String(definition.content)];
    const styleLabel = manifest.labels.style[String(definition.style)];
    if (!sourceLabels || sourceLabels[1] !== contentLabel || sourceLabels[2] !== styleLabel) {
      throw new Error(`${definition.key}: manifest labels do not match source '${definition.source}'`);
    }
    const bvh = parseBvh(readFileSync(sourcePath, "utf8"), definition.source);
    if (Math.abs(bvh.frameTime - 1 / manifest.sourceFps) > 0.000001) {
      throw new Error(`${definition.key}: expected ${manifest.sourceFps} FPS, found ${1 / bvh.frameTime}`);
    }
    if (definition.lane !== "shipped" && definition.lane !== "study") {
      throw new Error(`${definition.key}: lane must be shipped or study`);
    }
    if (definition.key in derivedClips) throw new Error(`${definition.key}: duplicate manifest clip key`);
    const clip = retargetClip(bvh, { ...manifest.defaults, ...definition });
    derivedClips[definition.key] = clip;
    (definition.lane === "shipped" ? bandaiNamco : studies)[definition.key] = clip;
  }

  const authored: Record<string, Clip> = {};
  const origins: Record<string, string | null> = {};
  const directory = join(root, AUTHORED_DIR);
  const files = existsSync(directory) ? readdirSync(directory).filter((name) => name.endsWith(".json")).sort() : [];
  for (const file of files) {
    const entry = validateAuthoredClip(JSON.parse(readFileSync(join(directory, file), "utf8")), {
      file,
      rig,
      bandaiNamco: derivedClips,
    });
    authored[entry.key] = {
      name: entry.key,
      loop: entry.loop,
      duration: entry.duration,
      easing: entry.easing,
      note: entry.note,
      poses: entry.poses,
    };
    origins[entry.key] = entry.derivedFrom;
  }

  return { manifest, rig, bandaiNamco, studies, authored, origins, clips: { ...bandaiNamco, ...authored } };
}

/**
 * Everything an authored clip has to say for itself before it ships.
 *
 * The key carries provenance: a `bnr` clip is still an adaptation of Bandai Namco material
 * and names the clip it came from, and a `lab` clip is authored here and claims no origin.
 * Nothing else in the lab can tell the difference once a clip is playing, so the file has to.
 */

