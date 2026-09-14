/**
 * What makes an authored clip valid, and nothing about where it came from.
 *
 * This is the gate `build:motions` runs, kept free of the filesystem so a browser can run it
 * too. An editor that validates with this cannot write a file the build will refuse, which is
 * a different and much better property than an editor that validates with rules resembling it.
 */

import type { Clip, Easing, Keyframe } from "./types.ts";
import type { Rig } from "../rig/types.ts";

export const EASINGS = ["linear", "smoothstep"] as const;
export const AUTHORED_KEY_PATTERN_SOURCE = "^(bnr|lab)[A-Za-z0-9]+$";
export const POSE_PROPERTIES = ["x", "y", "rotation"] as const;
export const AUTHORED_CLIP_FIELDS = ["key", "derivedFrom", "loop", "duration", "easing", "note", "keyframes"] as const;
export const KEYFRAME_FIELDS = ["frame", "bones"] as const;

export interface AuthoredClip {
  readonly key: string;
  readonly derivedFrom: string | null;
  readonly loop: boolean;
  readonly duration: number;
  readonly easing: Easing;
  readonly note: string;
  readonly keyframes: readonly Keyframe[];
}

export function validateAuthoredClip(
  value: unknown,
  context: { file?: string; rig?: Rig; bandaiNamco?: Readonly<Record<string, Clip>> } = {},
): AuthoredClip {
  const candidate = value as Partial<AuthoredClip> | null;
  const label = context.file ?? candidate?.key ?? "authored clip";
  function fail(message: string): never {
    throw new Error(`${label}: ${message}`);
  }

  if (!candidate || typeof candidate !== "object") fail("is not an object");
  const unknown = Object.keys(candidate).filter((field) => !(AUTHORED_CLIP_FIELDS as readonly string[]).includes(field));
  if (unknown.length > 0) fail(`has unknown fields: ${unknown.join(", ")}`);
  if (typeof candidate.key !== "string" || !new RegExp(AUTHORED_KEY_PATTERN_SOURCE).test(candidate.key)) {
    fail("key must be a bnr* adaptation or a lab* original");
  }
  if (context.file !== undefined && context.file !== `${candidate.key}.json`) {
    fail(`key '${candidate.key}' does not match the file name`);
  }

  const derived = candidate.key.startsWith("bnr");
  if (derived && (typeof candidate.derivedFrom !== "string" || candidate.derivedFrom === "")) {
    fail("a bnr* clip must name the clip it was derived from");
  }
  if (!derived && candidate.derivedFrom !== null) fail("a lab* clip must set derivedFrom to null");
  if (derived && context.bandaiNamco && !(candidate.derivedFrom! in context.bandaiNamco)) {
    fail(`derivedFrom '${candidate.derivedFrom}' is not a manifest clip`);
  }

  if (typeof candidate.loop !== "boolean") fail("loop must be a boolean");
  if (!Number.isInteger(candidate.duration) || candidate.duration! <= 0) {
    fail("duration must be a positive whole number of ticks");
  }
  if (!EASINGS.includes(candidate.easing as Easing)) fail(`easing must be one of ${EASINGS.join(", ")}`);
  if (typeof candidate.note !== "string" || candidate.note.trim() === "") fail("note must say what this clip is");
  if (!Array.isArray(candidate.keyframes) || candidate.keyframes.length === 0) fail("has no keyframes");

  let previous = -1;
  for (const keyframe of candidate.keyframes) {
    if (typeof keyframe !== "object" || keyframe === null || Array.isArray(keyframe)) fail("has a keyframe that is not an object");
    const unknownKeyframe = Object.keys(keyframe).filter((field) => !(KEYFRAME_FIELDS as readonly string[]).includes(field));
    if (unknownKeyframe.length > 0) fail(`keyframe has unknown fields: ${unknownKeyframe.join(", ")}`);
    if (!Number.isInteger(keyframe.frame)) fail("keyframe frames must be whole ticks");
    if (keyframe.frame <= previous) fail(`keyframe ${keyframe.frame} is out of order`);
    if (keyframe.frame < 0 || keyframe.frame > candidate.duration!) {
      fail(`keyframe ${keyframe.frame} is outside 0-${candidate.duration}`);
    }
    previous = keyframe.frame;
    if (!keyframe.bones || typeof keyframe.bones !== "object" || Array.isArray(keyframe.bones)) {
      fail(`keyframe ${keyframe.frame} has no bones`);
    }
    for (const [bone, pose] of Object.entries(keyframe.bones)) {
      if (context.rig && !context.rig.byName.has(bone)) fail(`keyframe ${keyframe.frame} poses unknown bone '${bone}'`);
      if (typeof pose !== "object" || pose === null || Array.isArray(pose)) fail(`keyframe ${keyframe.frame} has invalid pose for '${bone}'`);
      for (const [property, propertyValue] of Object.entries(pose as Record<string, unknown>)) {
        if (!(POSE_PROPERTIES as readonly string[]).includes(property)) {
          fail(`keyframe ${keyframe.frame} sets unknown property '${property}'`);
        }
        if (!Number.isFinite(propertyValue)) {
          fail(`keyframe ${keyframe.frame} sets ${bone}.${property} to a non-finite value`);
        }
      }
    }
  }

  if (candidate.keyframes[0].frame !== 0) fail("must start at tick 0");
  if (candidate.loop) {
    const last = candidate.keyframes.at(-1)!;
    if (last.frame !== candidate.duration) fail("a looping clip must key its closing tick");
    if (JSON.stringify(last.bones) !== JSON.stringify(candidate.keyframes[0].bones)) fail("loop seam does not close");
  }
  return candidate as AuthoredClip;
}
