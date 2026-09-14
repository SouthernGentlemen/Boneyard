import { describe, expect, it } from "vitest";

import { posesFromChannels, posesFromDense, sampleChannel, sampleClip } from "../../pipelines/motion/reduce.ts";
import { POSE_COUNT, POSE_INTERVALS } from "../../src/clips/types.ts";
import type { Clip, Pose } from "../../src/clips/types.ts";

const PRECISION = { rotationPrecision: 1, positionPrecision: 2 } as const;

describe("resampling dense motion to the fixed pose count", () => {
  it("always produces exactly the pose count, however long the source is", () => {
    for (const length of [2, 13, 47, 400]) {
      const values = Array.from({ length }, (_unused, index) => index);
      expect(posesFromChannels({ torso: { rotation: values } }, PRECISION)).toHaveLength(POSE_COUNT);
    }
  });

  it("puts the first and last source samples on the first and last poses", () => {
    const values = [5, 6, 7, 8, 9, 10, 99];
    const poses = posesFromChannels({ torso: { rotation: values } }, PRECISION);
    expect(poses[0].torso.rotation).toBe(5);
    expect(poses[POSE_INTERVALS].torso.rotation).toBe(99);
  });

  it("reads between source samples rather than snapping to the nearest", () => {
    // Snapping would quantise the whole clip to the source's frame rate, throwing away the
    // timing the capture actually had.
    expect(sampleChannel([0, 10], 0.25)).toBeCloseTo(2.5, 10);
    expect(sampleChannel([0, 10, 20], 1.5)).toBeCloseTo(15, 10);
    expect(sampleChannel([7], 3)).toBe(7);
    expect(sampleChannel([], 0)).toBe(0);
  });

  it("holds a linear ramp exactly, because even spacing of an even ramp is the ramp", () => {
    const values = Array.from({ length: 121 }, (_unused, index) => index);
    const poses = posesFromChannels({ torso: { rotation: values } }, PRECISION);
    poses.forEach((pose, index) => expect(pose.torso.rotation).toBeCloseTo(index * 10, 10));
  });

  it("rounds rotation and position with separate measured precision", () => {
    const poses = posesFromChannels({
      pelvis: { y: [0.126, 1.236] },
      torso: { rotation: [0.126, 12.36] },
    }, PRECISION);
    expect(poses[0]).toEqual({ pelvis: { y: 0.13 }, torso: { rotation: 0.1 } });
    expect(poses[POSE_INTERVALS]).toEqual({ pelvis: { y: 1.24 }, torso: { rotation: 12.4 } });
  });

  it("writes every channel at every pose, so pose i means the same thing in every clip", () => {
    const poses = posesFromChannels({
      pelvis: { y: [0, 1] },
      torso: { rotation: [0, 90] },
    }, PRECISION);
    for (const pose of poses) {
      expect(Object.keys(pose).sort()).toEqual(["pelvis", "torso"]);
      expect(pose.pelvis.y).toEqual(expect.any(Number));
      expect(pose.torso.rotation).toEqual(expect.any(Number));
    }
  });

  it("resamples an already-dense pose list the same way", () => {
    const dense: Pose[] = Array.from({ length: 25 }, (_unused, index) => ({ torso: { rotation: index * 4 } }));
    const poses = posesFromDense(dense, PRECISION);
    expect(poses).toHaveLength(POSE_COUNT);
    expect(poses[0].torso.rotation).toBe(0);
    expect(poses[POSE_INTERVALS].torso.rotation).toBe(96);
  });

  it("re-exports the one runtime sampler instead of carrying a linear copy", () => {
    const eased: Clip = {
      name: "labEasingProbe",
      loop: false,
      duration: 12,
      easing: "smoothstep",
      note: "Easing parity probe.",
      poses: Array.from({ length: POSE_COUNT }, (_unused, index) => ({ torso: { rotation: index * 7.5 } })),
    };
    // Half a tick into the first interval: smoothstep(0.5) of a 7.5 degree step.
    expect(sampleClip(eased, 0.5).torso.rotation).toBeCloseTo(3.75, 10);
    expect(sampleClip(eased, 0.25).torso.rotation).toBeCloseTo(1.171875, 6);
  });
});
