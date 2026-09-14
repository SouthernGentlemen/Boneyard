/**
 * Where the data is, for a consumer that reads it off disk rather than fetching it.
 *
 * Node only. A browser never needs this: it fetches whatever its own server chose to serve, and
 * a lab's build step is the thing that decides which of these directories it copies or proxies.
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The installed package root, whether that is node_modules or a linked working tree. */
export const BONEYARD_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The directories a lab may serve. Everything else here is source for the pipelines. */
export const ASSET_DIRECTORIES = ["rigs", "characters", "cosmetics", "figures", "catalog"] as const;

export const rigPath = (id: string): string => join(BONEYARD_ROOT, "rigs", `${id}.rig.json`);
export const figurePath = (id: string): string => join(BONEYARD_ROOT, "figures", `${id}.json`);
export const catalogPath = (): string => join(BONEYARD_ROOT, "catalog", "clips.json");
export const figureIndexPath = (): string => join(BONEYARD_ROOT, "figures", "index.json");
export const cosmeticIndexPath = (): string => join(BONEYARD_ROOT, "cosmetics", "index.json");
export const assetPath = (reference: string): string => join(BONEYARD_ROOT, reference);
