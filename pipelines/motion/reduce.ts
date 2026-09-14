import { POSE_COUNT, POSE_INTERVALS } from "../../src/clips/types.ts";
import type { BonePose, Pose } from "../../src/clips/types.ts";
import { sampleClip } from "../../src/rig/sample.ts";

/**
 * Clip arithmetic shared by every motion pipeline.
 *
 * The sampler itself is not here. `src/rig/sample.ts` is what the lab plays, so a pipeline
 * that writes a clip out for an external tool interpolates through that exact function rather
 * than a copy of it — node runs the TypeScript directly. The copy that used to live here was
 * linear-only and silently disagreed with the runtime by 8.6 degrees on a smoothstep clip,
 * which is the failure a parity test is supposed to prevent and cannot.
 *
 * What used to live here as well was Douglas-Peucker reduction, which chose *which* frames to
 * keep. Under a normalised pose count there is nothing to choose: the phases are fixed, so
 * producing a clip is resampling, not selecting. The tolerances that drove the reduction now
 * only decide how many decimals a value is stored to.
 */
export { sampleClip };

// `|| 0` is not redundant: rounding a small negative lands on -0, which is not +0 under
// Object.is, so a loop seam copied from pose 0 would compare unequal to pose 0.
export const roundRotation = (value: number, places = 1): number => (
  Math.round(value * 10 ** places) / 10 ** places || 0
);

export const roundPosition = (value: number, places = 2): number => (
  Math.round(value * 10 ** places) / 10 ** places || 0
);

export const PROPERTIES = ["x", "y", "rotation"] as const satisfies readonly (keyof BonePose)[];

export interface Precision {
  readonly rotationPrecision: number;
  readonly positionPrecision: number;
}

const round = (property: keyof BonePose, value: number, precision: Precision): number => (
  property === "rotation"
    ? roundRotation(value, precision.rotationPrecision)
    : roundPosition(value, precision.positionPrecision)
);

/**
 * One dense channel read at a fractional index, linearly.
 *
 * A pose's phase rarely lands on a whole source sample, and rounding to the nearest one would
 * quantise the whole clip to the source's frame rate. Reading between them keeps the timing the
 * capture actually had.
 */
export function sampleChannel(values: readonly number[], position: number): number {
  if (values.length === 0) return 0;
  const clamped = Math.max(0, Math.min(values.length - 1, position));
  const lower = Math.floor(clamped);
  const upper = Math.min(values.length - 1, lower + 1);
  return values[lower] + (values[upper] - values[lower]) * (clamped - lower);
}

export type Channels = Readonly<Record<string, Partial<Record<keyof BonePose, readonly number[]>>>>;

/**
 * Dense per-sample channels become the fixed pose count.
 *
 * `channels` is `{ [bone]: { [property]: number[] } }` with one value per source sample, in
 * order. Every channel present is written at every pose: under a normalised count a pose is the
 * whole state of the figure at that phase, and a channel that appears in some poses and not
 * others would make pose `i` mean something different from clip to clip.
 */
export function posesFromChannels(channels: Channels, precision: Precision): Pose[] {
  return Array.from({ length: POSE_COUNT }, (_unused, index) => {
    const pose: Pose = {};
    for (const [bone, properties] of Object.entries(channels)) {
      const value: BonePose = {};
      for (const [propertyName, values] of Object.entries(properties)) {
        if (!values || values.length === 0) continue;
        const property = propertyName as keyof BonePose;
        const position = (index / POSE_INTERVALS) * (values.length - 1);
        value[property] = round(property, sampleChannel(values, position), precision);
      }
      if (Object.keys(value).length > 0) pose[bone] = value;
    }
    return pose;
  });
}

/** The same resampling, from poses rather than channels — what an already-built clip needs. */
export function posesFromDense(dense: readonly Pose[], precision: Precision): Pose[] {
  const channels: Record<string, Partial<Record<keyof BonePose, number[]>>> = {};
  for (const pose of dense) {
    for (const [bone, value] of Object.entries(pose)) {
      const target = channels[bone] ?? (channels[bone] = {});
      for (const property of PROPERTIES) {
        if (value[property] === undefined) continue;
        (target[property] ?? (target[property] = [])).push(value[property]!);
      }
    }
  }
  return posesFromChannels(channels, precision);
}
