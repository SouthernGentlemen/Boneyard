import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { buildCatalog } from "../pipelines/motion/catalog.ts";

const ROOT = new URL("../", import.meta.url).pathname;
const PUBLIC_CLIPS = ["labIdle", "labWalk", "labStagger", "labStrike", "labOverhead", "labGuard", "labWave"] as const;

describe("FightLab public asset lane", () => {
  it("assembles only repository-authored fighter parts and no unlicensed wardrobe", () => {
    const figure = JSON.parse(readFileSync(new URL("../figures/runner.json", import.meta.url), "utf8"));
    expect(figure.rig).toBe("fighter");
    expect(figure.cosmetics).toEqual([]);
    for (const reference of Object.values(figure.parts)) {
      expect(reference).toMatch(/^characters\/fighter\/parts\/[a-z_]+\.svg$/);
    }
  });

  it("ships only independently authored motion from explicit source files", () => {
    const catalog = buildCatalog(ROOT);
    for (const name of PUBLIC_CLIPS) {
      const source = JSON.parse(readFileSync(new URL(`../motions/authored/${name}.json`, import.meta.url), "utf8"));
      expect(source.key).toBe(name);
      expect(source.derivedFrom).toBeNull();
      expect(catalog.authored[name]).toBeDefined();
      expect(catalog.origins[name]).toBeNull();
    }
  });
});
