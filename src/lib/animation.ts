import type { Vec3 } from '@/store/types';

export type TransformKeyframe = {
  id: string;
  objectId: string;
  frame: number;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
};

export type TimelineState = {
  fps: number;
  durationFrames: number;
  playheadFrame: number;
  keyframes: TransformKeyframe[];
};

export const EMPTY_TIMELINE: TimelineState = {
  fps: 30,
  durationFrames: 180,
  playheadFrame: 0,
  keyframes: [],
};

export const frameToSeconds = (frame: number, fps = EMPTY_TIMELINE.fps) => frame / fps;

export const secondsToFrame = (seconds: number, fps = EMPTY_TIMELINE.fps) => Math.round(seconds * fps);
