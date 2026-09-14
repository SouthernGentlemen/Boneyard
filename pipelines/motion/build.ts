#!/usr/bin/env node
/**
 * Build the shipped clip catalog and the derived study artifacts.
 *
 *   node pipelines/motion/build.ts          # rebuild catalog/clips.json and studies
 *   node pipelines/motion/build.ts --check  # verify the catalog; still rebuild studies
 *   node pipelines/motion/build.ts --json   # machine-readable summary
 *
 * The catalog is tracked generated data, not a consumer-shaped bundle: a lab reads this JSON
 * and decides for itself whether to fetch it, bake it into typed source, or both. Studies always
 * go to `out/`, including during a check. They are deterministic working material, not tracked
 * source, and a Blender project may already be pointed at that directory.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { AUTHORED_DIR, CATALOG_OUTPUT, buildCatalog } from "./catalog.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function catalogSource(catalog: ReturnType<typeof buildCatalog>): string {
  const manifest = catalog.manifest;
  const derived = Object.entries(catalog.origins).filter(([, from]) => from !== null);
  const document = {
    contract: 1 as const,
    generatedBy: "pipelines/motion/build.ts",
    note: "Do not edit by hand. bnr* clips are adaptations of Bandai-Namco-Research-Motiondataset-1"
      + ` at revision ${manifest.sourceRevision} (${manifest.sourceUrl}), selected, trimmed, projected`
      + " to 2D, retargeted to the eleven-bone rig, resampled to 60 Hz and reduced to sparse linear"
      + ` keyframes. lab* clips are originals authored here. Licence and attribution: see LICENSE.md.${
        derived.length === 0 ? "" : ` Adaptations from ${AUTHORED_DIR}: ${derived.map(([key, from]) => `${key} (from ${from})`).join(", ")}.`}`,
    clips: { ...catalog.bandaiNamco, ...catalog.authored },
    origins: catalog.origins,
    lanes: Object.fromEntries([
      ...Object.keys(catalog.bandaiNamco).map((key) => [key, "shipped"] as const),
      ...Object.keys(catalog.authored).map((key) => [key, "authored"] as const),
    ]),
  };
  // One line per clip: the header stays readable and a changed clip is one changed line, while
  // the file keeps the compact weight of the generated source it replaces.
  const body = (entries: Readonly<Record<string, unknown>>): string =>
    Object.entries(entries).map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`).join(",\n");
  return `{
  "contract": ${document.contract},
  "generatedBy": ${JSON.stringify(document.generatedBy)},
  "note": ${JSON.stringify(document.note)},
  "clips": {
${body(document.clips)}
  },
  "origins": ${JSON.stringify(document.origins)},
  "lanes": ${JSON.stringify(document.lanes)}
}
`;
}

export interface StudyArtifact {
  readonly generatedBy: "pipelines/motion/build.ts";
  readonly clip: ReturnType<typeof buildCatalog>["studies"][string];
}

function studySource(clip: ReturnType<typeof buildCatalog>["studies"][string]): string {
  const artifact: StudyArtifact = { generatedBy: "pipelines/motion/build.ts", clip };
  return `${JSON.stringify(artifact)}\n`;
}

export function writeMotionCatalog(catalog: ReturnType<typeof buildCatalog>, root = ROOT, writeGenerated = true): {
  readonly outputs: readonly string[];
  readonly studyFiles: readonly string[];
} {
  const outputs: ReadonlyArray<readonly [string, string]> = [[CATALOG_OUTPUT, catalogSource(catalog)]];
  for (const [relativePath, contents] of writeGenerated ? outputs : []) {
    const path = join(root, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    if (!existsSync(path) || readFileSync(path, "utf8") !== contents) writeFileSync(path, contents);
  }
  const studyFiles: string[] = [];
  for (const [key, clip] of Object.entries(catalog.studies)) {
    const path = join(root, "out", `${key}.json`);
    const contents = studySource(clip);
    mkdirSync(dirname(path), { recursive: true });
    if (!existsSync(path) || readFileSync(path, "utf8") !== contents) writeFileSync(path, contents);
    studyFiles.push(relative(root, path));
  }
  return { outputs: outputs.map(([path]) => path), studyFiles };
}

export function main(argv: readonly string[]): number {
  const check = argv.includes("--check");
  const asJson = argv.includes("--json");
  try {
    const catalog = buildCatalog(ROOT);
    const outputs: ReadonlyArray<readonly [string, string]> = [[CATALOG_OUTPUT, catalogSource(catalog)]];
    const stale: string[] = [];
    for (const [relativePath, contents] of outputs) {
      const path = join(ROOT, relativePath);
      if (check) {
        if (!existsSync(path) || readFileSync(path, "utf8") !== contents) stale.push(relativePath);
      }
    }
    const written = writeMotionCatalog(catalog, ROOT, !check);
    const studyFiles = [...written.studyFiles];

    const report = {
      ok: stale.length === 0,
      checked: check,
      shipped: Object.keys(catalog.bandaiNamco).length,
      authored: Object.keys(catalog.authored).length,
      studies: Object.keys(catalog.studies).length,
      catalogBytes: Buffer.byteLength(outputs[0][1]),
      outputs: outputs.map(([path]) => path),
      studyFiles,
      stale,
    };
    if (asJson) console.log(JSON.stringify(report, null, 2));
    else if (stale.length > 0) {
      for (const path of stale) console.error(`${path} is stale — run npm run build:motions`);
    } else {
      console.log(`${check ? "checked" : "built"} ${report.shipped} shipped, ${report.authored} authored, `
        + `${report.studies} study clips; catalog ${report.catalogBytes} bytes`);
    }
    return stale.length > 0 ? 1 : 0;
  } catch (error) {
    if (asJson) console.log(JSON.stringify({ ok: false, error: (error as Error).message }, null, 2));
    else console.error(`build:motions: ${(error as Error).message}`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
