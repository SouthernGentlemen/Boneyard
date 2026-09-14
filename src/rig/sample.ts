import { POSE_INTERVALS } from "../clips/types.ts";
import type { BonePose, Clip, Pose } from "../clips/types.ts";

const PROPERTIES = ["x", "y", "rotation"] as const satisfies readonly (keyof BonePose)[];

/** Linear unless a clip explicitly asks for smoothstep; an absent easing is not a curve. */
function ease(progress: number, easing: Clip["easing"]): number {
  if (easing !== "smoothstep") return progress;
  return progress * progress * (3 - 2 * progress);
}

function clipFrame(clip: Clip, frame: number): number {
  if (clip.duration <= 0) return 0;
  if (clip.loop) return ((frame % clip.duration) + clip.duration) % clip.duration;
  return Math.max(0, Math.min(frame, clip.duration));
}

/**
 * The one sampler. A tick becomes a phase, a phase becomes a position between two poses.
 *
 * Because every clip holds the same number of poses at known phases, there is no search: the
 * pair to interpolate is arithmetic. That is the whole benefit of normalising the count, and it
 * is why this is now shorter than the sparse per-channel version it replaces.
 *
 * This module imports nothing but its own types, which is what lets a pipeline run it under
 * plain `node` and bake an export through the same code the page draws with. C2 says there is
 * never a second implementation held together by a parity test; keeping this free of the
 * catalog, the kernel and the DOM is what makes that possible rather than aspirational.
 */
export function sampleClip(clip: Clip, frame: number): Pose {
  const at = clipFrame(clip, frame);
  const position = clip.duration <= 0 ? 0 : (at / clip.duration) * POSE_INTERVALS;
  const lower = Math.max(0, Math.min(POSE_INTERVALS, Math.floor(position)));
  const upper = Math.min(POSE_INTERVALS, lower + 1);
  const progress = ease(Math.max(0, Math.min(1, position - lower)), clip.easing);

  const before = clip.poses[lower] ?? {};
  const after = clip.poses[upper] ?? before;
  const pose: Pose = {};

  for (const boneName of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const bone: BonePose = {};
    for (const property of PROPERTIES) {
      const from = before[boneName]?.[property];
      const to = after[boneName]?.[property];
      // A property neither pose authors stays unauthored. One that only one pose authors is
      // held rather than eased towards an implied zero, which would invent motion nobody wrote.
      if (from === undefined && to === undefined) continue;
      const start = from ?? to!;
      const end = to ?? from!;
      bone[property] = start + (end - start) * progress;
    }
    pose[boneName] = bone;
  }
  return pose;
}
