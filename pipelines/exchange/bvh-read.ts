import { POSE_INTERVALS } from "../../src/clips/types.ts";
import type { BonePose, Clip, Easing, Pose } from "../../src/clips/types.ts";
import { hierarchyOrder } from "../../src/rig/contract.ts";
import { sampleClip } from "../../src/rig/sample.ts";
import type { Rig, RigBone } from "../../src/rig/types.ts";
import type { Bvh, BvhNode } from "../motion/bvh-parse.ts";
import { posesFromChannels, roundPosition } from "../motion/reduce.ts";
import type { Channels, Precision } from "../motion/reduce.ts";

/**
 * Reading an edited BVH back onto SVGLab's rig.
 *
 * The rig is the contract: same bones, parents and rest offsets, or the file describes a
 * different skeleton. A uniform scale is allowed and divided back out. Everything the 2D rig
 * cannot hold is measured and returned so the caller reports what was discarded.
 */

type Vector3 = readonly [number, number, number];

const dot = (a: Vector3, b: Vector3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vector3, b: Vector3): Vector3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (vector: Vector3): number => Math.hypot(...vector);
const scaled = (vector: Vector3, factor: number): Vector3 => (
  vector.map((value) => value * factor) as [number, number, number]
);
const AXES = [
  ["Xrotation", [1, 0, 0]],
  ["Yrotation", [0, 1, 0]],
  ["Zrotation", [0, 0, 1]],
] as const satisfies readonly (readonly [string, Vector3])[];

export interface MeasuredFrame {
  readonly scale: number;
  readonly x: Vector3;
  readonly y: Vector3;
  readonly depth: Vector3;
  readonly rotationChannel: string;
  readonly rotationSign: number;
}

/**
 * Measure which way this file draws the rig from its own offsets.
 *
 * SVGLab writes y-up while Blender exports z-up. Bones that move along one authored axis
 * alone reveal both drawing axes; their cross product is the depth this rig cannot use.
 */
function measureFrame(ordered: readonly RigBone[], nodes: ReadonlyMap<string, BvhNode>): MeasuredFrame {
  const samples: { x: Vector3[]; y: Vector3[] } = { x: [], y: [] };
  for (const bone of ordered.slice(1)) {
    const offset = nodes.get(bone.name)!.offset;
    if (Math.abs(bone.offset[0]) > 0.001 && Math.abs(bone.offset[1]) < 0.001) {
      samples.x.push(scaled(offset, 1 / bone.offset[0]));
    }
    if (Math.abs(bone.offset[1]) > 0.001 && Math.abs(bone.offset[0]) < 0.001) {
      samples.y.push(scaled(offset, 1 / bone.offset[1]));
    }
  }
  if (samples.x.length === 0 || samples.y.length === 0) {
    throw new Error("cannot tell which way this file draws the rig: no bone moves along one axis alone");
  }

  const average = (rows: readonly Vector3[]): Vector3 => [0, 1, 2].map((axis) => (
    rows.reduce((sum, row) => sum + row[axis], 0) / rows.length
  )) as [number, number, number];
  const xScaled = average(samples.x);
  const yScaled = average(samples.y);
  const scale = (length(xScaled) + length(yScaled)) / 2;
  if (!Number.isFinite(scale) || scale <= 0.0001) throw new Error("BVH offsets are not a copy of this rig");

  const xAxis = scaled(xScaled, 1 / length(xScaled));
  const yAxis = scaled(yScaled, 1 / length(yScaled));
  if (Math.abs(dot(xAxis, yAxis)) > 0.02) throw new Error("this file's rig axes are not square to each other");
  if (Math.abs(length(xScaled) - length(yScaled)) > 0.02 * scale) {
    throw new Error("this file scales the rig unevenly; the proportions are the contract");
  }

  const depth = cross(xAxis, yAxis);
  const [rotationChannel, axis] = [...AXES]
    .sort((a, b) => Math.abs(dot(depth, b[1])) - Math.abs(dot(depth, a[1])))[0];
  const rotationSign = Math.sign(dot(depth, axis));

  for (const bone of ordered.slice(1)) {
    const offset = nodes.get(bone.name)!.offset;
    const expected = [0, 1, 2].map((index) => (
      (xAxis[index] * bone.offset[0] + yAxis[index] * bone.offset[1]) * scale
    )) as [number, number, number];
    const drift = length(offset.map((value, index) => value - expected[index]) as [number, number, number]);
    if (drift > 0.01 * Math.max(1, scale)) {
      throw new Error(`'${bone.name}' rest offset is ${offset.map((value) => value.toFixed(3)).join(", ")} but this rig authors ${expected.map((value) => value.toFixed(3)).join(", ")}`);
    }
  }

  return { scale, x: xAxis, y: yAxis, depth, rotationChannel, rotationSign };
}

export interface ReadOptions {
  readonly loop: boolean;
  readonly easing?: Easing;
  readonly tolerances: Precision;
}

export interface ReadClip {
  readonly duration: number;
  readonly poses: readonly Pose[];
  readonly scale: number;
  readonly dropped: {
    readonly outOfPlaneDegrees: number;
    readonly depthUnits: number;
    readonly horizontalUnits: number;
    /** Bones with out-of-plane rotation, retained for compatibility with the original report. */
    readonly bones: readonly string[];
    readonly depthBones: readonly string[];
    readonly horizontalBones: readonly string[];
  };
  readonly seamDegrees: number;
}

export function bvhToClip(bvh: Bvh, rig: Rig, options: ReadOptions): ReadClip {
  const ordered = hierarchyOrder(rig);
  const nodes = new Map(bvh.nodes.map((node) => [node.name, node]));

  for (const bone of ordered) {
    if (!nodes.has(bone.name)) throw new Error(`BVH has no '${bone.name}' joint; the skeleton is not this rig`);
  }
  const extra = bvh.nodes.filter((node) => !rig.byName.has(node.name));
  if (extra.length > 0) throw new Error(`BVH has joints this rig does not: ${extra.map((node) => node.name).join(", ")}`);
  for (const bone of ordered.slice(1)) {
    const node = nodes.get(bone.name)!;
    const parent = bvh.nodes[node.parent];
    if (parent?.name !== bone.parent) {
      throw new Error(`'${bone.name}' hangs off '${parent?.name ?? "nothing"}' but this rig parents it to '${bone.parent}'`);
    }
  }

  const layout = rig.contract.exchange.bvh;
  // A fixed 60 FPS used to be the only legal frame time, because a clip was one frame per tick.
  // Now this repository's own exports carry one frame per pose, so the header's frame time is
  // how long a pose interval takes and varies with the clip. What still has to hold is that the
  // file describes a whole number of 60 Hz ticks — which is what catches the real mistake, a
  // scene left at 24 or 30 FPS, without also rejecting a legitimate thirteen-frame export.
  if (!(bvh.frameTime > 0)) throw new Error("BVH has no positive frame time");
  const impliedTicks = (bvh.frames.length - 1) * bvh.frameTime * layout.frameRate;
  if (Math.abs(impliedTicks - Math.round(impliedTicks)) > 0.001) {
    throw new Error(`${bvh.frames.length} frames at ${(1 / bvh.frameTime).toFixed(3)} FPS is `
      + `${impliedTicks.toFixed(3)} ticks at ${layout.frameRate} Hz, which is not a whole tick count; `
      + `set the scene to ${layout.frameRate} FPS and export again`);
  }

  const measured = measureFrame(ordered, nodes);
  const { scale, x: xAxis, y: yAxis, depth, rotationChannel, rotationSign } = measured;
  const channelIndex = (node: BvhNode, channel: string): number => {
    const offset = node.channels.indexOf(channel);
    return offset < 0 ? -1 : node.channelStart + offset;
  };
  const channels: Record<string, Partial<Record<keyof BonePose, number[]>>> = {};
  const dropped = {
    outOfPlaneDegrees: 0,
    depthUnits: 0,
    horizontalUnits: 0,
    bones: new Set<string>(),
    depthBones: new Set<string>(),
    horizontalBones: new Set<string>(),
  };
  const frameCount = bvh.frames.length;

  for (const bone of ordered) {
    const node = nodes.get(bone.name)!;
    const planar = channelIndex(node, rotationChannel);
    if (planar < 0) throw new Error(`'${bone.name}' has no ${rotationChannel} channel`);
    const rotation = bvh.frames.map((values) => rotationSign * values[planar]);

    for (const channel of ["Xrotation", "Yrotation", "Zrotation"].filter((name) => name !== rotationChannel)) {
      const column = channelIndex(node, channel);
      if (column < 0) continue;
      for (const values of bvh.frames) {
        const value = Math.abs(values[column]);
        if (value > 0.001) dropped.bones.add(bone.name);
        dropped.outOfPlaneDegrees = Math.max(dropped.outOfPlaneDegrees, value);
      }
    }

    const properties: Partial<Record<keyof BonePose, number[]>> = { rotation };
    const position = ["Xposition", "Yposition", "Zposition"].map((channel) => channelIndex(node, channel));
    if (bone.parent === null && position.some((column) => column >= 0)) {
      const vertical: number[] = [];
      for (const values of bvh.frames) {
        const point = position.map((column) => column < 0 ? 0 : values[column]) as [number, number, number];
        vertical.push(dot(point, yAxis) / scale - bone.offset[1]);
        const horizontal = Math.abs(dot(point, xAxis) / scale);
        const depthTravel = Math.abs(dot(point, depth) / scale);
        if (horizontal > 0.001) dropped.horizontalBones.add(bone.name);
        if (depthTravel > 0.001) dropped.depthBones.add(bone.name);
        dropped.horizontalUnits = Math.max(dropped.horizontalUnits, horizontal);
        dropped.depthUnits = Math.max(dropped.depthUnits, depthTravel);
      }
      properties.y = vertical;
    } else if (position.some((column) => column >= 0)) {
      // Blender writes position channels on every joint and initializes them at OFFSET. The
      // only discarded work is travel away from that bone's own rest offset, never the raw
      // magnitude of the rest skeleton.
      const rest = node.offset;
      for (const values of bvh.frames) {
        const travel = position.map((column, axis) => (
          (column < 0 ? rest[axis] : values[column]) - rest[axis]
        )) as [number, number, number];
        const depthTravel = Math.hypot(...travel) / scale;
        if (depthTravel > 0.001) dropped.depthBones.add(bone.name);
        dropped.depthUnits = Math.max(dropped.depthUnits, depthTravel);
      }
    }
    channels[bone.name] = properties;
  }

  // Length comes from the file's own header rather than its frame count, because a clip is no
  // longer one frame per tick. `Frame Time` is seconds per frame either way, so this reads a
  // thirteen-frame export of a twenty-tick clip and a sixty-one-frame 60 Hz file from another
  // tool with the same arithmetic.
  const duration = Math.round((frameCount - 1) * bvh.frameTime * rig.contract.exchange.bvh.frameRate);
  if (duration <= 0) throw new Error("BVH has no animation to read");
  // The pose phases are fixed, so there is nothing to select: a read is a resample. The
  // tolerances now only decide how many decimals a value keeps.
  const poses: Pose[] = posesFromChannels(channels as Channels, options.tolerances);
  let seamDegrees = 0;
  const easing = options.easing ?? "linear";

  if (options.loop) {
    const read: Clip = { name: "import", duration, loop: false, easing, note: "import", poses };
    const first = sampleClip(read, 0);
    const last = sampleClip(read, duration);
    for (const bone of Object.keys(first)) {
      seamDegrees = Math.max(seamDegrees, Math.abs(
        (last[bone]?.rotation ?? 0) - (first[bone]?.rotation ?? 0),
      ));
    }
    // The seam is closed by construction rather than reported and left open: the last pose of a
    // looping clip *is* its first, and the validator refuses anything else.
    poses[POSE_INTERVALS] = structuredClone(poses[0]);
  }

  return {
    duration,
    poses,
    scale: roundPosition(scale, 3),
    dropped: {
      outOfPlaneDegrees: dropped.outOfPlaneDegrees,
      depthUnits: dropped.depthUnits,
      horizontalUnits: dropped.horizontalUnits,
      bones: [...dropped.bones].sort(),
      depthBones: [...dropped.depthBones].sort(),
      horizontalBones: [...dropped.horizontalBones].sort(),
    },
    seamDegrees,
  };
}
