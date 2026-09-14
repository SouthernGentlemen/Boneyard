#!/usr/bin/env node
/**
 * Write the two discovery indexes a consumer cannot derive without reading every manifest.
 *
 *   node pipelines/bundle.ts          # rebuild figures/index.json and cosmetics/index.json
 *   node pipelines/bundle.ts --check  # fail when either is stale
 *   node pipelines/bundle.ts --json   # machine-readable summary
 *
 * These are tracked generated files for the same reason the clip catalog is: a lab that wants
 * to know what figures and wardrobe pieces exist should read one file, not walk the tree and
 * re-implement the rules for what counts. Nothing here is consumer-shaped — no bundler output,
 * no framework, no copy of the art. The asset directories are the bundle.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isFigureManifestFile, validateFigure } from "../src/figure/manifest.ts";
import { buildWardrobeIndex } from "./wardrobe/index.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const FIGURE_INDEX = join("figures", "index.json");
export const COSMETIC_INDEX = join("cosmetics", "index.json");

export interface FigureIndexEntry {
  readonly id: string;
  readonly name: string;
  readonly path: string;
}

export function buildFigureIndex(root: string): { readonly contract: 1; readonly figures: readonly FigureIndexEntry[] } {
  const directory = join(root, "figures");
  const figures = readdirSync(directory)
    .filter(isFigureManifestFile)
    .sort()
    .map((file) => {
      const path = `figures/${file}`;
      const manifest = validateFigure(JSON.parse(readFileSync(join(directory, file), "utf8")) as unknown, path);
      return { id: basename(file, ".json"), name: manifest.name, path };
    });
  return { contract: 1, figures };
}

export function bundleOutputs(root = ROOT): Readonly<Record<string, string>> {
  return {
    [FIGURE_INDEX]: `${JSON.stringify(buildFigureIndex(root), null, 2)}\n`,
    [COSMETIC_INDEX]: `${JSON.stringify(buildWardrobeIndex(root), null, 2)}\n`,
  };
}

export function writeBundle(root = ROOT, check = false): readonly { path: string; changed: boolean; bytes: number }[] {
  return Object.entries(bundleOutputs(root)).map(([reference, contents]) => {
    const path = join(root, reference);
    const previous = existsSync(path) ? readFileSync(path, "utf8") : "";
    if (!check && previous !== contents) writeFileSync(path, contents);
    return { path: reference, changed: previous !== contents, bytes: Buffer.byteLength(contents) };
  });
}

export function main(argv: readonly string[]): number {
  const asJson = argv.includes("--json");
  const check = argv.includes("--check");
  const unknown = argv.filter((argument) => argument !== "--json" && argument !== "--check");
  try {
    if (unknown.length > 0) throw new Error(`unknown option ${unknown[0]}`);
    const outputs = writeBundle(ROOT, check);
    const stale = outputs.filter((output) => output.changed);
    const ok = !check || stale.length === 0;
    const report = { ok, checked: check, outputs, stale: stale.map((output) => output.path) };
    if (asJson) console.log(JSON.stringify(report, null, 2));
    else if (!ok) for (const output of stale) console.error(`${output.path} is stale — run npm run build:bundle`);
    else console.log(`${check ? "checked" : "built"} ${outputs.length} indexes; ${outputs.reduce((sum, output) => sum + output.bytes, 0)} bytes`);
    return ok ? 0 : 1;
  } catch (error) {
    const message = (error as Error).message;
    if (asJson) console.log(JSON.stringify({ ok: false, error: message }, null, 2));
    else console.error(`bundle: ${message}`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
