import type { CosmeticPiece, WardrobeSet as RuntimeWardrobeSet } from "../../src/wardrobe/placement.ts";
import { validateWardrobeSet as validateRuntimeWardrobeSet } from "../../src/wardrobe/placement.ts";
import type { TraceOptions } from "../sprite/trace.ts";

export type { CosmeticAlign, CosmeticPiece } from "../../src/wardrobe/placement.ts";

export interface CosmeticTraceProfile {
  readonly default?: TraceOptions;
  readonly byPiece?: Readonly<Record<string, TraceOptions>>;
}

export interface WardrobeSet extends RuntimeWardrobeSet {
  readonly trace?: CosmeticTraceProfile;
  readonly pieces: Readonly<Record<string, CosmeticPiece>>;
}

export function validateWardrobeSet(value: unknown, id = "wardrobe"): WardrobeSet {
  return validateRuntimeWardrobeSet(value, id) as WardrobeSet;
}
