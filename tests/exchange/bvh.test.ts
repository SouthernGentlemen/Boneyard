import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type { Clip } from "../../src/clips/types.ts";
import { sampleClip } from "../../src/rig/sample.ts";
import { bvhToClip } from "../../pipelines/exchange/bvh-read.ts";
import { clipToBvh } from "../../pipelines/exchange/bvh-write.ts";
import { checkExchange } from "../../pipelines/guards/exchange.ts";
import { buildCatalog } from "../../pipelines/motion/catalog.ts";
import { parseBvh } from "../../pipelines/motion/bvh-parse.ts";
import { POSE_COUNT, POSE_INTERVALS } from "../../src/clips/types.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

describe("BVH exchange", () => {
  it("bakes the contract's hierarchy and one frame per pose", () => {
    const catalog = buildCatalog(ROOT);
    const clip = catalog.bandaiNamco.bnrStrikeNormal;
    const bvh = parseBvh(clipToBvh(clip, catalog.rig), clip.name);
    const layout = catalog.rig.contract.exchange.bvh;

    expect(bvh.nodes.map((node) => node.name)).toEqual(catalog.rig.bones.map((bone) => bone.name));
    // One frame per pose, and the header's frame time is how long a pose interval takes — which
    // is what carries the clip's length now that poses sit on phases rather than ticks.
    expect(bvh.frames).toHaveLength(POSE_COUNT);
    expect(bvh.frameTime).toBeCloseTo(clip.duration / (POSE_INTERVALS * layout.frameRate), 7);
    expect(bvh.channelCount).toBe(layout.rootChannels.length + (catalog.rig.bones.length - 1) * layout.jointChannels.length);

    for (let index = 0; index <= POSE_INTERVALS; index += 1) {
      const tick = (index / POSE_INTERVALS) * clip.duration;
      const pose = sampleClip(clip, tick);
      const values = bvh.frames[index];
      expect(values[layout.rootChannels.indexOf("Yposition")]).toBeCloseTo(
        layout.rootRestHeight - (pose.pelvis?.y ?? 0), 6,
      );
      catalog.rig.bones.forEach((bone, index) => {
        const channels = index === 0 ? layout.rootChannels : layout.jointChannels;
        const start = index === 0 ? 0 : layout.rootChannels.length + (index - 1) * layout.jointChannels.length;
        const rotation = values[start + channels.indexOf(layout.planarRotationChannel)];
        expect(rotation * layout.rotationSign, `${bone.name} tick ${tick}`).toBeCloseTo(
          pose[bone.name]?.rotation ?? 0, 5,
        );
      });
    }
  });

  it("reads an untouched export back inside the authored tolerances", () => {
    const catalog = buildCatalog(ROOT);
    const original = catalog.studies.bnrSlashStudyNormal;
    const returned = bvhToClip(parseBvh(clipToBvh(original, catalog.rig)), catalog.rig, {
      loop: original.loop,
      easing: original.easing,
      tolerances: catalog.manifest.defaults,
    });
    const clip: Clip = { ...original, poses: returned.poses };
    let worst = 0;
    for (let tick = 0; tick <= original.duration; tick += 1) {
      const before = sampleClip(original, tick);
      const after = sampleClip(clip, tick);
      for (const bone of Object.keys(before)) {
        worst = Math.max(worst, Math.abs((after[bone]?.rotation ?? 0) - (before[bone]?.rotation ?? 0)));
      }
    }
    expect(worst).toBeLessThanOrEqual(catalog.manifest.defaults.angleTolerance);
    expect(returned.dropped).toEqual({
      outOfPlaneDegrees: 0,
      depthUnits: 0,
      horizontalUnits: 0,
      bones: [],
      depthBones: [],
      horizontalBones: [],
    });
  });

  it("keeps every synthetic and validation regression case green", () => {
    const catalog = buildCatalog(ROOT);
    expect(checkExchange()).toMatchObject({
      ok: true,
      clips: Object.keys(catalog.clips).length + Object.keys(catalog.studies).length,
      failures: [],
    });
  });
});
