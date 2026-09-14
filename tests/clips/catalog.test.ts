import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

import { buildCatalog, validateAuthoredClip } from "../../pipelines/motion/catalog.ts";
import { POSE_COUNT, POSE_INTERVALS } from "../../src/clips/types.ts";

const loop = {
  key: "labProbe",
  derivedFrom: null,
  loop: true,
  duration: 2,
  easing: "linear",
  note: "Authored validation probe.",
  poses: Array.from({ length: POSE_COUNT }, () => ({ torso: { rotation: 1 } })),
};

describe("authored clip lane", () => {
  it("validates provenance, bone names, the pose count and loop seams", () => {
    const catalog = buildCatalog(process.cwd());
    expect(validateAuthoredClip(loop, { rig: catalog.rig })).toEqual(loop);
    expect(() => validateAuthoredClip({ ...loop, key: "bnrProbe", derivedFrom: null }))
      .toThrow("a bnr* clip must name the clip it was derived from");
    expect(() => validateAuthoredClip({
      ...loop,
      poses: Array.from({ length: POSE_COUNT }, () => ({ unknown: { rotation: 1 } })),
    }, { rig: catalog.rig })).toThrow("poses unknown bone 'unknown'");
    // The count is the format, so a clip that is one pose short is refused rather than padded.
    expect(() => validateAuthoredClip({ ...loop, poses: loop.poses.slice(1) }))
      .toThrow(`has ${POSE_COUNT - 1} poses; every clip has exactly ${POSE_COUNT}`);
    expect(() => validateAuthoredClip({
      ...loop,
      poses: loop.poses.map((pose, index) => (index === POSE_INTERVALS ? { torso: { rotation: 2 } } : pose)),
    })).toThrow("loop seam does not close");
  });

  it("lets authored source override a shipped key without replacing its derivation", () => {
    const root = mkdtempSync(join(tmpdir(), "svglab-m2-"));
    try {
      mkdirSync(join(root, "motions", "authored"), { recursive: true });
      copyFileSync("motions/bandai-namco-motiondataset-1.json", join(root, "motions", "bandai-namco-motiondataset-1.json"));
      symlinkSync(join(process.cwd(), "rigs"), join(root, "rigs"), "dir");
      symlinkSync(join(process.cwd(), "motions", "capture"), join(root, "motions", "capture"), "dir");
      writeFileSync(join(root, "motions", "authored", "bnrIdleNormal.json"), JSON.stringify({
        key: "bnrIdleNormal",
        derivedFrom: "bnrIdleNormal",
        loop: true,
        duration: 60,
        easing: "linear",
        note: "Authored override probe.",
        poses: Array.from({ length: POSE_COUNT }, () => ({ torso: { rotation: 1 } })),
      }));

      const catalog = buildCatalog(root);
      expect(catalog.bandaiNamco.bnrIdleNormal.note).not.toBe("Authored override probe.");
      expect(catalog.clips.bnrIdleNormal.note).toBe("Authored override probe.");
      expect(catalog.origins.bnrIdleNormal).toBe("bnrIdleNormal");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
