import type { Rig } from "./types.ts";

/**
 * Which depth profile a clip is drawn with.
 *
 * Pure rig-contract logic: a clip names a profile, or inherits the profile of the clip it was
 * derived from, or falls back to the contract's default. Renderers decide what to do with the
 * answer; this decides what the answer is, so a contact sheet and a live stage cannot disagree.
 */
export function depthProfileName(rig: Rig, clip: string, origin: string | null = clip): string {
  const profiles = rig.contract.depthProfiles;
  return profiles.byClip[clip] ?? (origin === null ? profiles.default : profiles.byClip[origin] ?? profiles.default);
}
