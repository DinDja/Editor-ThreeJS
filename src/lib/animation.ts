import type { Vec3 } from '@/store/types';

export type KeyframeInterpolation = 'hold' | 'linear' | 'ease';

export type TransformKeyframe = {
  id: string;
  objectId: string;
  frame: number;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  interpolation: KeyframeInterpolation;
};

export type TimelineState = {
  fps: number;
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  playheadFrame: number;
  keyframes: TransformKeyframe[];
};

export const EMPTY_TIMELINE: TimelineState = {
  fps: 30,
  startFrame: 0,
  endFrame: 180,
  durationFrames: 180,
  playheadFrame: 0,
  keyframes: [],
};

export const frameToSeconds = (frame: number, fps = EMPTY_TIMELINE.fps) => frame / fps;

export const secondsToFrame = (seconds: number, fps = EMPTY_TIMELINE.fps) => Math.round(seconds * fps);

const cloneVec3 = (value: Vec3): Vec3 => [value[0], value[1], value[2]];

const lerpVec3 = (from: Vec3, to: Vec3, alpha: number): Vec3 => [
  from[0] + (to[0] - from[0]) * alpha,
  from[1] + (to[1] - from[1]) * alpha,
  from[2] + (to[2] - from[2]) * alpha,
];

const applyInterpolation = (alpha: number, interpolation: KeyframeInterpolation) => {
  if (interpolation === 'hold') return 0;
  if (interpolation === 'ease') return alpha * alpha * (3 - 2 * alpha);
  return alpha;
};

export const cloneKeyframe = (keyframe: TransformKeyframe): TransformKeyframe => ({
  ...keyframe,
  position: cloneVec3(keyframe.position),
  rotation: cloneVec3(keyframe.rotation),
  scale: cloneVec3(keyframe.scale),
  interpolation: keyframe.interpolation ?? 'linear',
});

export const sampleObjectTransform = (keyframes: TransformKeyframe[], objectId: string, frame: number) => {
  const objectKeyframes = keyframes
    .filter((keyframe) => keyframe.objectId === objectId)
    .sort((a, b) => a.frame - b.frame);

  if (objectKeyframes.length === 0) return null;

  const first = objectKeyframes[0];
  const last = objectKeyframes[objectKeyframes.length - 1];

  if (frame <= first.frame) {
    return {
      position: cloneVec3(first.position),
      rotation: cloneVec3(first.rotation),
      scale: cloneVec3(first.scale),
    };
  }

  if (frame >= last.frame) {
    return {
      position: cloneVec3(last.position),
      rotation: cloneVec3(last.rotation),
      scale: cloneVec3(last.scale),
    };
  }

  const nextIndex = objectKeyframes.findIndex((keyframe) => keyframe.frame >= frame);
  const next = objectKeyframes[nextIndex];
  const previous = objectKeyframes[nextIndex - 1] ?? next;
  const span = Math.max(1, next.frame - previous.frame);
  const alpha = applyInterpolation(Math.max(0, Math.min(1, (frame - previous.frame) / span)), previous.interpolation);

  return {
    position: lerpVec3(previous.position, next.position, alpha),
    rotation: lerpVec3(previous.rotation, next.rotation, alpha),
    scale: lerpVec3(previous.scale, next.scale, alpha),
  };
};
