#!/usr/bin/env node
/**
 * check:footprint — the byte ratchet for every part, cosmetic, figure and generated catalog.
 *
 *   node pipelines/guards/footprint.ts          # fail if anything grew
 *   node pipelines/guards/footprint.ts --write  # accept today's measurements as the baseline
 *   node pipelines/guards/footprint.ts --json   # machine-readable report
 *
 * The baseline is evidence, not a budget. Shrinking passes; growth is accepted only by
 * committing a newly written baseline, where the increase is visible in review.
 *
 * This measures the assets. What a lab's own bundle weighs is that lab's ratchet, against its
 * own baseline: Boneyard has no shell to weigh and never should.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { inspectPart, isFigureManifestFile, validateFigure } from "../../src/figure/manifest.ts";
import type { FigureManifest } from "../../src/figure/manifest.ts";
import { validateRig } from "../../src/rig/contract.ts";
import type { Rig } from "../../src/rig/types.ts";
import { validateAuthoredFigure } from "../render/manifest.ts";
import { COSMETIC_INDEX, FIGURE_INDEX } from "../bundle.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const FIGURES = join(ROOT, "figures");
const CHARACTERS = join(ROOT, "characters");
const COSMETICS = join(ROOT, "cosmetics");
const CATALOG = join(ROOT, "catalog");
const RIGS = join(ROOT, "rigs");
const BASELINE = join(RIGS, "footprint.baseline.json");

export interface Size {
  readonly raw: number;
  readonly gzip: number;
}

export interface FootprintMeasurements {
  readonly contract: 1;
  readonly parts: Readonly<Record<string, Size>>;
  readonly cosmetics?: Readonly<Record<string, Size>>;
  readonly figures: Readonly<Record<string, Size>>;
  readonly catalogs?: Readonly<Record<string, Size>>;
}

export interface Growth {
  readonly kind: "new" | "raw" | "gzip" | "missing";
  readonly path: string;
  readonly previous?: number;
  readonly current?: number;
}

const portable = (path: string): string => relative(ROOT, path).split(sep).join("/");

function bytes(path: string): Size {
  const data = readFileSync(path);
  return { raw: data.byteLength, gzip: gzipSync(data, { level: 9 }).byteLength };
}

function jsonFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).filter((name) => name.endsWith(".json")).sort()
    .map((name) => join(directory, name));
}


function svgFiles(directory: string): string[] {
  const files: string[] = [];
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => (
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  ))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...svgFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".svg")) files.push(path);
  }
  return files;
}

function rigFor(id: string): Rig {
  const path = join(RIGS, `${id}.rig.json`);
  if (!existsSync(path)) throw new Error(`figure names unknown rig '${id}'; expected rigs/${id}.rig.json`);
  return validateRig(JSON.parse(readFileSync(path, "utf8")));
}

export function readFigure(path: string): FigureManifest {
  const figurePath = resolve(ROOT, path);
  const raw = JSON.parse(readFileSync(figurePath, "utf8")) as unknown;
  const base = validateFigure(raw, portable(figurePath));
  const rig = rigFor(base.rig);
  const figure = validateAuthoredFigure(raw, portable(figurePath), rig);
  const boneForSlot = new Map(rig.bones.map((bone) => [bone.slot, bone.name]));
  for (const [slot, reference] of Object.entries(figure.parts)) {
    if (typeof reference !== "string" || !reference.endsWith(`/${slot}.svg`)) {
      throw new Error(`${portable(figurePath)} slot '${slot}' has invalid part reference '${String(reference)}'`);
    }
    const partPath = resolve(ROOT, reference);
    if (!partPath.startsWith(`${ROOT}${sep}`) || !existsSync(partPath)) {
      throw new Error(`${portable(figurePath)} slot '${slot}' cannot read '${reference}'`);
    }
    const source = readFileSync(partPath, "utf8");
    inspectPart(source, boneForSlot.get(slot)!, reference);
  }
  return figure;
}

/** Measure generated files individually, then a figure as the sum of the parts it asks the renderer to fetch. */
export function measureFootprint(): FootprintMeasurements {
  const parts = Object.fromEntries(svgFiles(CHARACTERS).map((path) => [portable(path), bytes(path)]));
  const cosmetics = Object.fromEntries(svgFiles(COSMETICS).map((path) => [portable(path), bytes(path)]));
  const catalogs = Object.fromEntries([...jsonFiles(CATALOG), join(ROOT, FIGURE_INDEX), join(ROOT, COSMETIC_INDEX)]
    .filter(existsSync).map((path) => [portable(path), bytes(path)]));
  const figures: Record<string, Size> = {};
  for (const path of jsonFiles(FIGURES).filter((path) => isFigureManifestFile(portable(path).split("/").pop()!))) {
    const figure = readFigure(path);
    let raw = 0;
    let gzip = 0;
    for (const reference of Object.values(figure.parts)) {
      const size = bytes(resolve(ROOT, reference));
      raw += size.raw;
      gzip += size.gzip;
    }
    for (const reference of figure.cosmetics) {
      const size = bytes(resolve(ROOT, reference));
      raw += size.raw;
      gzip += size.gzip;
    }
    figures[portable(path)] = { raw, gzip };
  }
  return { contract: 1, parts, cosmetics, figures, catalogs };
}

function compareSection(
  section: "parts" | "cosmetics" | "figures" | "catalogs",
  actual: Readonly<Record<string, Size>>,
  baseline: Readonly<Record<string, Size>>,
): Growth[] {
  const growth: Growth[] = [];
  for (const path of Object.keys(actual).sort()) {
    const current = actual[path];
    const previous = baseline[path];
    if (!previous) {
      growth.push({ kind: "new", path: `${section}.${path}` });
      continue;
    }
    if (current.raw > previous.raw) growth.push({ kind: "raw", path: `${section}.${path}`, previous: previous.raw, current: current.raw });
    if (current.gzip > previous.gzip) growth.push({ kind: "gzip", path: `${section}.${path}`, previous: previous.gzip, current: current.gzip });
  }
  for (const path of Object.keys(baseline).sort()) {
    if (!actual[path]) growth.push({ kind: "missing", path: `${section}.${path}` });
  }
  return growth;
}

export function compareFootprint(
  actual: FootprintMeasurements,
  baseline: FootprintMeasurements,
): Growth[] {
  return [
    ...compareSection("parts", actual.parts, baseline.parts ?? {}),
    ...compareSection("cosmetics", actual.cosmetics ?? {}, baseline.cosmetics ?? {}),
    ...compareSection("figures", actual.figures, baseline.figures ?? {}),
    ...compareSection("catalogs", actual.catalogs ?? {}, baseline.catalogs ?? {}),
  ];
}

/** The absolute half of the contract stays a gate even while the numeric baseline moves. */
export function checkInvariants(): string[] {
  const failures: string[] = [];
  const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
  if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
    failures.push("package.json has runtime dependencies; the contract requires zero");
  }
  for (const path of [...svgFiles(CHARACTERS), ...svgFiles(COSMETICS)]) {
    const source = readFileSync(path, "utf8");
    if (/<image\b|data:image|\.png\b/i.test(source)) failures.push(`${portable(path)} contains raster art`);
  }
  return failures;
}

function readBaseline(): FootprintMeasurements {
  if (!existsSync(BASELINE)) {
    throw new Error("no rigs/footprint.baseline.json — run npm run check:footprint -- --write and review it");
  }
  const value = JSON.parse(readFileSync(BASELINE, "utf8")) as FootprintMeasurements;
  if (value.contract !== 1) throw new Error(`unsupported footprint baseline contract ${value.contract}`);
  return value;
}

export function main(argv: readonly string[]): number {
  const asJson = argv.includes("--json");
  const write = argv.includes("--write");
  try {
    const measurements = measureFootprint();
    const invariants = checkInvariants();
    if (write) {
      const previous = existsSync(BASELINE)
        ? JSON.parse(readFileSync(BASELINE, "utf8")) as Record<string, unknown>
        : {};
      writeFileSync(BASELINE, `${JSON.stringify({ ...previous, ...measurements }, null, 2)}\n`);
    }
    const growth = write ? [] : compareFootprint(measurements, readBaseline());
    const ok = invariants.length === 0 && growth.length === 0;

    if (asJson) {
      console.log(JSON.stringify({ ok, wrote: write, measurements, invariants, growth }, null, 2));
    } else {
      for (const [path, size] of Object.entries(measurements.figures)) {
        console.log(`${path.padEnd(24)} ${String(size.raw).padStart(7)} raw  ${String(size.gzip).padStart(6)} gzip`);
      }
      for (const [path, size] of Object.entries(measurements.catalogs ?? {})) {
        console.log(`${path.padEnd(46)} ${String(size.raw).padStart(7)} raw  ${String(size.gzip).padStart(6)} gzip`);
      }
      for (const failure of invariants) console.error(`check:footprint: ${failure}`);
      for (const item of growth) {
        if (item.kind === "new" || item.kind === "missing") {
          console.error(`check:footprint: ${item.path} is ${item.kind} in the baseline — run npm run check:footprint -- --write and review it`);
        } else {
          console.error(`check:footprint: ${item.path} ${item.kind} grew ${item.previous} -> ${item.current}; `
            + "accept only by writing and committing the new baseline");
        }
      }
      if (write) console.log(`check:footprint: wrote ${portable(BASELINE)}`);
      else if (ok) console.log(`check:footprint: ${Object.keys(measurements.parts).length} parts, `
        + `${Object.keys(measurements.cosmetics ?? {}).length} cosmetics, `
        + `${Object.keys(measurements.figures).length} figures and `
        + `${Object.keys(measurements.catalogs ?? {}).length} generated catalogs did not grow`);
    }
    return ok ? 0 : 1;
  } catch (error) {
    if (asJson) console.log(JSON.stringify({ ok: false, error: (error as Error).message }, null, 2));
    else console.error(`check:footprint: ${(error as Error).message}`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
