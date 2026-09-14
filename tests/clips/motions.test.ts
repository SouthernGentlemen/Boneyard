import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildCatalog } from "../../pipelines/motion/catalog.ts";
import { sampleClip } from "../../src/rig/sample.ts";
import { POSE_COUNT, POSE_INTERVALS } from "../../src/clips/types.ts";
import type { StudyArtifact } from "../../pipelines/motion/build.ts";

const SHIPPED = [
  "bnrIdleNormal",
  "bnrCrouchNormal",
  "bnrWalkNormal",
  "bnrRunNormal",
  "bnrDashNormal",
  "bnrStrikeNormal",
  "bnrSwordGuardNormal",
  "bnrSwordSlashNormal",
  "bnrSwordCutNormal",
] as const;

const STUDIES = ["bnrSlashStudyNormal", "bnrPunchStudyNormal"] as const;

describe("Bandai Namco motion catalog", () => {
  it("runs the strip-only pipeline under plain node and rebuilds byte-identically", () => {
    expect(() => execFileSync(process.execPath, ["pipelines/motion/build.ts", "--check"], {
      cwd: process.cwd(),
      stdio: "pipe",
    })).not.toThrow();
  }, 30_000);

  it("ships nine clips and writes both studies outside the catalog", () => {
    const catalog = buildCatalog(process.cwd());
    expect(Object.keys(catalog.bandaiNamco)).toEqual(SHIPPED);
    for (const key of STUDIES) {
      expect(key in catalog.bandaiNamco).toBe(false);
      const artifact = JSON.parse(readFileSync(`out/${key}.json`, "utf8")) as StudyArtifact;
      expect(artifact.generatedBy).toBe("pipelines/motion/build.ts");
      expect(artifact.clip.name).toBe(key);
    }
  });

  it("holds the measured study weight and channel precision", () => {
    const catalog = buildCatalog(process.cwd());
    // The two studies were 59,523 bytes as sparse per-tick keyframes — 97% of the old catalog
    // budget, which is why they were kept out of the shipped lane. At a normalised thirteen
    // poses they are 8,770, because a clip's weight no longer scales with how long it is.
    expect(Buffer.byteLength(JSON.stringify(catalog.studies))).toBe(8_770);
    expect(catalog.manifest.defaults.rotationPrecision).toBe(1);
    expect(catalog.manifest.defaults.positionPrecision).toBe(2);
    expect(catalog.manifest.labels.content["12"]).toBe("punch");
    expect(catalog.manifest.labels.content["14"]).toBe("slash");
    expect(catalog.manifest.labels.style["0"]).toBe("normal");
    for (const clip of [...Object.values(catalog.bandaiNamco), ...Object.values(catalog.studies)]) {
      for (const pose of clip.poses) {
        for (const value of Object.values(pose)) {
          if (value.rotation !== undefined) expect(Math.abs(Number(value.rotation.toFixed(1)) - value.rotation)).toBe(0);
          if (value.x !== undefined) expect(Math.abs(Number(value.x.toFixed(2)) - value.x)).toBe(0);
          if (value.y !== undefined) expect(Math.abs(Number(value.y.toFixed(2)) - value.y)).toBe(0);
        }
      }
    }
  });

  it("preserves source time in the 60 Hz tick domain", () => {
    const catalog = buildCatalog(process.cwd());
    expect(Object.fromEntries(Object.entries({ ...catalog.bandaiNamco, ...catalog.studies })
      .map(([key, clip]) => [key, clip.duration]))).toEqual({
      bnrIdleNormal: 60,
      bnrCrouchNormal: 18,
      bnrWalkNormal: 60,
      bnrRunNormal: 46,
      bnrDashNormal: 38,
      bnrStrikeNormal: 20,
      bnrSwordGuardNormal: 118,
      bnrSwordSlashNormal: 30,
      bnrSwordCutNormal: 124,
      bnrSlashStudyNormal: 802,
      bnrPunchStudyNormal: 446,
    });
  });

  it("loads the parent-before-child rig order and leaf tips from the contract", () => {
    const { rig } = buildCatalog(process.cwd());
    expect(rig.bones.map((bone) => bone.name)).toEqual([
      "pelvis", "leg-front", "shin-front", "leg-back", "shin-back", "torso",
      "arm-front", "forearm-front", "arm-back", "forearm-back", "head",
    ]);
    expect(rig.byName.get("pelvis")?.offset).toEqual([0, -42]);
    expect(rig.byName.get("shin-front")?.tip).toEqual([0, 21]);
  });

  it("asserts contact ticks inside their declared active windows", () => {
    const manifest = buildCatalog(process.cwd()).manifest;
    const strike = manifest.clips.find((clip) => clip.key === "bnrStrikeNormal")!;
    const slash = manifest.clips.find((clip) => clip.key === "bnrSwordSlashNormal")!;
    expect(strike.contactTargetFrame).toBe(6);
    expect(strike.activeWindow).toEqual([5, 7]);
    expect(slash.contactTargetFrame).toBe(15);
    expect(slash.activeWindow).toEqual([14, 17]);
    // The contact pose is read through the sampler now, because a clip no longer stores a key at
    // every tick it passes through. It is also no longer exact: tick 6 of a 20-tick clip is
    // phase 0.3, which falls between pose 3 and pose 4, so the captured -84.8° reads as -83.1°.
    // That 1.7° is the measured cost of normalising the count, and the fix is not more poses —
    // it is a duration that puts the contact tick on a pose, which a 24-tick move would.
    const clips = buildCatalog(process.cwd()).bandaiNamco;
    expect(sampleClip(clips.bnrStrikeNormal, strike.contactTargetFrame!)["arm-front"]?.rotation)
      .toBeCloseTo(-83.1, 1);
    expect(sampleClip(clips.bnrSwordSlashNormal, slash.contactTargetFrame!)["arm-front"]?.rotation)
      .toBeCloseTo(-51.2, 0);
  });

  it("holds the normalised pose count, closes every loop seam, and emits only finite values", () => {
    const catalog = buildCatalog(process.cwd());
    for (const [key, clip] of Object.entries({ ...catalog.bandaiNamco, ...catalog.studies, ...catalog.authored })) {
      // The count is the contract. A clip with a different number of poses is not a shorter
      // clip, it is a different format, and pose i stops meaning the same thing across clips.
      expect(clip.poses, key).toHaveLength(POSE_COUNT);
      if (clip.loop) expect(clip.poses[POSE_INTERVALS], key).toEqual(clip.poses[0]);
      for (const pose of clip.poses) {
        for (const value of Object.values(pose)) {
          for (const number of Object.values(value)) expect(Number.isFinite(number), key).toBe(true);
        }
      }
    }
  });

  it("retains attribution and noncommercial terms in the root licence index", () => {
    const license = readFileSync("LICENSE.md", "utf8");
    expect(license).toContain("74ead3ba1ae4696404e6086233779f60de8bf9ef");
    expect(license).toContain("Creative Commons Attribution-NonCommercial 4.0 International");
    expect(license).toContain("https://creativecommons.org/licenses/by-nc/4.0/legalcode");
    expect(license).toContain("motions/capture/bandai-namco-motiondataset-1/*.bvh");
    expect(license).toContain("characters/{barst,kiran,yuliya}/atlas.png");
    expect(license).toContain("cosmetics/royal-guard/atlas.png");
    expect(license).toContain("cosmetics/field-kit/atlas.png");
    expect(existsSync("third_party")).toBe(false);
  });
});
