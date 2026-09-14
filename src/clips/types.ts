/**
 * A clip is a fixed number of poses and a duration, and those two things are independent.
 *
 * Every clip holds exactly `POSE_COUNT` poses at evenly spaced phases from the start of the clip
 * to its end. The poses say what the motion *is*; `duration` says how long it takes. Normalising
 * the count is what makes production consistent: authoring a clip is always the same job, pose
 * `i` of one clip is comparable to pose `i` of another, and retiming is a change to one number
 * rather than a re-key.
 *
 * Phases are deliberately not ticks. Binding poses to whole ticks would force every duration to
 * a multiple of `POSE_INTERVALS`, and a fighting game needs to be able to say sixteen ticks.
 * Combat keeps frame-exact integer ticks because hitbox windows are combat data; the animation
 * underneath it is a shape stretched across them.
 */

/** A pose value for one bone. Absent properties are unauthored, not zero. */
export interface BonePose {
  x?: number;
  y?: number;
  rotation?: number;
}

export type Pose = Record<string, BonePose>;

/**
 * Twelve intervals, thirteen poses.
 *
 * Twelve is the classic full-animation rate — a one-second cycle at twelve poses is twelve
 * drawings per second — and it divides by two, three, four and six, so a move reads in halves,
 * thirds and quarters: pose 0 start, 3 quarter, 6 midpoint, 9 three-quarter, 12 end. Sixteen
 * intervals would put poses less than a tick apart on anything under a third of a second, which
 * is authoring detail nothing can display; eight leaves a one-second cycle too thin for
 * breakdowns.
 */
export const POSE_INTERVALS = 12;
export const POSE_COUNT = POSE_INTERVALS + 1;

export type Easing = "linear" | "smoothstep";

export interface Clip {
  name: string;
  loop: boolean;
  /** Whole ticks at 60 Hz. Free of the pose count: any integer length is legal. */
  duration: number;
  easing: Easing;
  note: string;
  /** Exactly `POSE_COUNT` poses. A looping clip's last pose is its first. */
  poses: readonly Pose[];
}

/** The phase a pose sits at, in [0, 1]. Position in the array is the only thing that says when. */
export function posePhase(index: number): number {
  return index / POSE_INTERVALS;
}
