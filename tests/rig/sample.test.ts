import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { sampleClip } from "../../src/rig/sample.ts";
import { POSE_COUNT, POSE_INTERVALS } from "../../src/clips/types.ts";
import type { Clip, Pose } from "../../src/clips/types.ts";

/** A ramp from -20 to 100 across the twelve intervals, so every pose has a known value. */
const poses: Pose[] = Array.from({ length: POSE_COUNT }, (_unused, index) => ({
  torso: { rotation: index },
  "arm-front": { rotation: -20 + index * 10 },
}));

const PROBE: Clip = {
  name: "labSampleProbe", loop: false, duration: 24, easing: "linear",
  note: "Fixture for the sampler.",
  poses,
};

describe("the one sampler", () => {
  it("lands exactly on a pose when a tick lands exactly on its phase", () => {
    // duration 24 over 12 intervals is two ticks per pose, so every even tick is a pose.
    for (let index = 0; index <= POSE_INTERVALS; index += 1) {
      expect(sampleClip(PROBE, index * 2).torso.rotation, `pose ${index}`).toBeCloseTo(index, 10);
    }
  });

  it("interpolates between the two poses a phase falls between", () => {
    expect(sampleClip(PROBE, 1).torso.rotation).toBeCloseTo(0.5, 10);
    expect(sampleClip(PROBE, 3)["arm-front"].rotation).toBeCloseTo(-5, 10);
  });

  it("does not require the duration to be a multiple of the pose count", () => {
    // The whole point of storing phase rather than ticks: a sixteen-tick move is legal, and its
    // poses simply land between ticks.
    const odd: Clip = { ...PROBE, duration: 16 };
    expect(sampleClip(odd, 0).torso.rotation).toBeCloseTo(0, 10);
    expect(sampleClip(odd, 8).torso.rotation).toBeCloseTo(6, 10);
    expect(sampleClip(odd, 16).torso.rotation).toBeCloseTo(12, 10);
    expect(sampleClip(odd, 5).torso.rotation).toBeCloseTo(3.75, 10);
  });

  it("clamps a one-shot clip and wraps a looping one", () => {
    expect(sampleClip(PROBE, -3).torso.rotation).toBeCloseTo(0, 10);
    expect(sampleClip(PROBE, 99).torso.rotation).toBeCloseTo(12, 10);
    const looping: Clip = { ...PROBE, loop: true, poses: [...poses.slice(0, POSE_INTERVALS), poses[0]] };
    expect(sampleClip(looping, 24).torso.rotation).toBeCloseTo(sampleClip(looping, 0).torso.rotation!, 10);
    expect(sampleClip(looping, 26).torso.rotation).toBeCloseTo(sampleClip(looping, 2).torso.rotation!, 10);
  });

  it("eases inside a pose interval only when the clip asks for it", () => {
    const eased: Clip = { ...PROBE, easing: "smoothstep" };
    // Tick 1 is halfway between pose 0 and pose 1; smoothstep of 0.5 is 0.5, so the midpoint is
    // unmoved and the quarter point is where the curve shows.
    expect(sampleClip(eased, 1).torso.rotation).toBeCloseTo(0.5, 10);
    expect(sampleClip(eased, 0.5).torso.rotation).toBeCloseTo(0.15625, 10);
    expect(sampleClip(PROBE, 0.5).torso.rotation).toBeCloseTo(0.25, 10);
    // Several call sites build clip-shaped objects with no easing field; a missing curve is not a curve.
    const bare = { duration: 24, loop: false, poses } as unknown as Clip;
    expect(sampleClip(bare, 0.5).torso.rotation).toBeCloseTo(0.25, 10);
  });

  it("holds a property only one of the two poses authors, rather than easing out of zero", () => {
    const partial: Clip = {
      ...PROBE,
      poses: poses.map((pose, index) => (index >= 6 ? { ...pose, pelvis: { y: 4 } } : pose)),
    };
    // pelvis.y appears from pose 6. Between pose 5 and 6 it is held at its authored value rather
    // than swung up from an implied zero, which would invent motion nobody wrote.
    expect(sampleClip(partial, 11).pelvis.y).toBe(4);
    expect(sampleClip(partial, 12).pelvis.y).toBe(4);
    expect(sampleClip(partial, 0).pelvis).toBeUndefined();
  });

  it("is reachable from a pipeline under plain node, with no build step in the way", () => {
    // C2 held by construction rather than asserted by a parity test: there is one function, and
    // this is the property that lets a pipeline bake an export through the code the page draws
    // with. If node ever stops running the TypeScript directly, this fails here and not in M3.
    const ticks = [0, 2, 5, 8, 10];
    const sampler = resolve("src/rig/sample.ts");
    const script = `import { sampleClip } from ${JSON.stringify(sampler)};
      const clip = ${JSON.stringify(PROBE)};
      console.log(JSON.stringify(${JSON.stringify(ticks)}.map((t) => sampleClip(clip, t)["arm-front"].rotation)));`;
    const fromPipeline = JSON.parse(
      execFileSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" })) as number[];
    expect(fromPipeline).toEqual(ticks.map((tick) => sampleClip(PROBE, tick)["arm-front"].rotation));
  });
});
