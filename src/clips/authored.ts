/**
 * What makes an authored clip valid, and nothing about where it came from.
 *
 * This is the gate `build:motions` runs, kept free of the filesystem so a browser can run it
 * too. An editor that validates with this cannot write a file the build will refuse, which is
 * a different and much better property than an editor that validates with rules resembling it.
 */

import { POSE_COUNT, POSE_INTERVALS } from "./types.ts";
import type { Easing, Pose } from "./types.ts";
import type { Rig } from "../rig/types.ts";

export const EASINGS = ["linear", "smoothstep"] as const;
export const AUTHORED_KEY_PATTERN_SOURCE = "^(bnr|lab)[A-Za-z0-9]+$";
export const POSE_PROPERTIES = ["x", "y", "rotation"] as const;
export const AUTHORED_CLIP_FIELDS = ["key", "derivedFrom", "loop", "duration", "easing", "note", "poses"] as const;

export interface AuthoredClip {
  readonly key: string;
  readonly derivedFrom: string | null;
  readonly loop: boolean;
  readonly duration: number;
  readonly easing: Easing;
  readonly note: string;
  readonly poses: readonly Pose[];
}

export function validateAuthoredClip(
  value: unknown,
  context: { file?: string; rig?: Rig; bandaiNamco?: Readonly<Record<string, unknown>> } = {},
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

  // The normalised count is the contract, so it is checked structurally rather than described.
  // A clip with a different number of poses is not a shorter clip; it is a different format.
  if (!Array.isArray(candidate.poses)) fail("has no poses");
  if (candidate.poses.length !== POSE_COUNT) {
    fail(`has ${candidate.poses.length} poses; every clip has exactly ${POSE_COUNT} `
      + `(${POSE_INTERVALS} intervals, pose 0 to pose ${POSE_INTERVALS})`);
  }

  candidate.poses.forEach((pose, index) => {
    if (typeof pose !== "object" || pose === null || Array.isArray(pose)) fail(`pose ${index} is not an object`);
    for (const [bone, value] of Object.entries(pose)) {
      if (context.rig && !context.rig.byName.has(bone)) fail(`pose ${index} poses unknown bone '${bone}'`);
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        fail(`pose ${index} has an invalid value for '${bone}'`);
      }
      for (const [property, number] of Object.entries(value as Record<string, unknown>)) {
        if (!(POSE_PROPERTIES as readonly string[]).includes(property)) {
          fail(`pose ${index} sets unknown property '${property}'`);
        }
        if (!Number.isFinite(number)) fail(`pose ${index} sets ${bone}.${property} to a non-finite value`);
      }
    }
  });

  if (candidate.loop
    && JSON.stringify(candidate.poses[POSE_INTERVALS]) !== JSON.stringify(candidate.poses[0])) {
    fail(`loop seam does not close: pose ${POSE_INTERVALS} must equal pose 0`);
  }
  return candidate as AuthoredClip;
}
