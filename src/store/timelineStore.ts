import { create } from 'zustand';
import { cloneKeyframe, EMPTY_TIMELINE, type KeyframeInterpolation, type TransformKeyframe } from '@/lib/animation';
import { createId, type SceneObject } from './types';

type TimelineStore = {
  fps: number;
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  playheadFrame: number;
  isPlaying: boolean;
  autoKey: boolean;
  loopPlayback: boolean;
  defaultInterpolation: KeyframeInterpolation;
  selectedKeyframeIds: string[];
  keyframes: TransformKeyframe[];
  setPlayheadFrame: (frame: number) => void;
  setFps: (fps: number) => void;
  setDurationFrames: (durationFrames: number) => void;
  setFrameRange: (startFrame: number, endFrame: number) => void;
  setPlaying: (playing: boolean) => void;
  togglePlayback: () => void;
  setAutoKey: (enabled: boolean) => void;
  setLoopPlayback: (enabled: boolean) => void;
  setDefaultInterpolation: (interpolation: KeyframeInterpolation) => void;
  addTransformKeyframe: (object: SceneObject, frame?: number) => void;
  selectKeyframe: (id: string, additive?: boolean) => void;
  selectObjectKeyframes: (objectId: string) => void;
  clearKeyframeSelection: () => void;
  removeKeyframe: (id: string) => void;
  removeSelectedKeyframes: () => void;
  removeCurrentFrameKeyframes: (objectId?: string | null) => void;
  clearObjectKeyframes: (objectId: string) => void;
  clearAllKeyframes: () => void;
  moveSelectedKeyframes: (deltaFrames: number) => void;
  duplicateSelectedKeyframes: (deltaFrames?: number) => void;
  setSelectedInterpolation: (interpolation: KeyframeInterpolation) => void;
};

const clampFrame = (frame: number, durationFrames: number) =>
  Math.round(Math.max(0, Math.min(durationFrames, Number.isFinite(frame) ? frame : 0)));

const sortKeyframes = (keyframes: TransformKeyframe[]) =>
  keyframes.map(cloneKeyframe).sort((a, b) => a.frame - b.frame || a.objectId.localeCompare(b.objectId));

const normalizeSelection = (selectedKeyframeIds: string[], keyframes: TransformKeyframe[]) => {
  const ids = new Set(keyframes.map((keyframe) => keyframe.id));
  return selectedKeyframeIds.filter((id) => ids.has(id));
};

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  ...EMPTY_TIMELINE,
  isPlaying: false,
  autoKey: false,
  loopPlayback: true,
  defaultInterpolation: 'linear',
  selectedKeyframeIds: [],
  keyframes: [],

  setPlayheadFrame: (frame) =>
    set((state) => ({
      playheadFrame: clampFrame(frame, state.durationFrames),
    })),

  setFps: (fps) =>
    set({
      fps: Math.max(1, Math.min(120, Math.round(Number.isFinite(fps) ? fps : EMPTY_TIMELINE.fps))),
    }),

  setDurationFrames: (durationFrames) =>
    set((state) => {
      const nextDuration = Math.max(1, Math.min(24000, Math.round(Number.isFinite(durationFrames) ? durationFrames : state.durationFrames)));
      const startFrame = Math.min(state.startFrame, nextDuration - 1);
      const endFrame = Math.max(startFrame + 1, Math.min(state.endFrame, nextDuration));

      return {
        durationFrames: nextDuration,
        startFrame,
        endFrame,
        playheadFrame: clampFrame(state.playheadFrame, nextDuration),
        keyframes: sortKeyframes(state.keyframes.map((keyframe) => ({ ...keyframe, frame: clampFrame(keyframe.frame, nextDuration) }))),
      };
    }),

  setFrameRange: (startFrame, endFrame) =>
    set((state) => {
      const start = clampFrame(startFrame, state.durationFrames);
      const end = clampFrame(endFrame, state.durationFrames);
      const nextStart = Math.min(start, Math.max(0, end - 1));
      const nextEnd = Math.max(nextStart + 1, end);

      return {
        startFrame: nextStart,
        endFrame: nextEnd,
        playheadFrame: Math.max(nextStart, Math.min(nextEnd, state.playheadFrame)),
      };
    }),

  setPlaying: (isPlaying) => set({ isPlaying }),

  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setAutoKey: (autoKey) => set({ autoKey }),

  setLoopPlayback: (loopPlayback) => set({ loopPlayback }),

  setDefaultInterpolation: (defaultInterpolation) => set({ defaultInterpolation }),

  addTransformKeyframe: (object, frame = get().playheadFrame) =>
    set((state) => {
      const keyframeFrame = Math.round(clampFrame(frame, state.durationFrames));
      const existing = state.keyframes.find((keyframe) => keyframe.objectId === object.uuid && keyframe.frame === keyframeFrame);
      const nextKeyframe: TransformKeyframe = {
        id: existing?.id ?? createId(),
        objectId: object.uuid,
        frame: keyframeFrame,
        position: [...object.position],
        rotation: [...object.rotation],
        scale: [...object.scale],
        interpolation: existing?.interpolation ?? state.defaultInterpolation,
      };
      const keyframes = sortKeyframes([
        ...state.keyframes.filter((keyframe) => !(keyframe.objectId === object.uuid && keyframe.frame === keyframeFrame)),
        nextKeyframe,
      ]);

      return {
        keyframes,
        selectedKeyframeIds: [nextKeyframe.id],
      };
    }),

  selectKeyframe: (id, additive = false) =>
    set((state) => {
      if (!additive) return { selectedKeyframeIds: [id] };
      const selected = state.selectedKeyframeIds.includes(id)
        ? state.selectedKeyframeIds.filter((item) => item !== id)
        : [...state.selectedKeyframeIds, id];
      return { selectedKeyframeIds: selected };
    }),

  selectObjectKeyframes: (objectId) =>
    set((state) => ({
      selectedKeyframeIds: state.keyframes.filter((keyframe) => keyframe.objectId === objectId).map((keyframe) => keyframe.id),
    })),

  clearKeyframeSelection: () => set({ selectedKeyframeIds: [] }),

  removeKeyframe: (id) =>
    set((state) => {
      const keyframes = state.keyframes.filter((keyframe) => keyframe.id !== id).map(cloneKeyframe);
      return {
        keyframes,
        selectedKeyframeIds: normalizeSelection(state.selectedKeyframeIds, keyframes),
      };
    }),

  removeSelectedKeyframes: () =>
    set((state) => {
      const selected = new Set(state.selectedKeyframeIds);
      const keyframes = state.keyframes.filter((keyframe) => !selected.has(keyframe.id)).map(cloneKeyframe);
      return { keyframes, selectedKeyframeIds: [] };
    }),

  removeCurrentFrameKeyframes: (objectId = null) =>
    set((state) => {
      const frame = Math.round(state.playheadFrame);
      const keyframes = state.keyframes
        .filter((keyframe) => keyframe.frame !== frame || (objectId ? keyframe.objectId !== objectId : false))
        .map(cloneKeyframe);

      return {
        keyframes,
        selectedKeyframeIds: normalizeSelection(state.selectedKeyframeIds, keyframes),
      };
    }),

  clearObjectKeyframes: (objectId) =>
    set((state) => {
      const keyframes = state.keyframes.filter((keyframe) => keyframe.objectId !== objectId).map(cloneKeyframe);
      return {
        keyframes,
        selectedKeyframeIds: normalizeSelection(state.selectedKeyframeIds, keyframes),
      };
    }),

  clearAllKeyframes: () => set({ keyframes: [], selectedKeyframeIds: [], isPlaying: false }),

  moveSelectedKeyframes: (deltaFrames) =>
    set((state) => {
      const selected = new Set(state.selectedKeyframeIds);
      const keyframes = sortKeyframes(
        state.keyframes.map((keyframe) =>
          selected.has(keyframe.id)
            ? { ...keyframe, frame: clampFrame(keyframe.frame + deltaFrames, state.durationFrames) }
            : keyframe,
        ),
      );

      return {
        keyframes,
        selectedKeyframeIds: normalizeSelection(state.selectedKeyframeIds, keyframes),
      };
    }),

  duplicateSelectedKeyframes: (deltaFrames = 10) =>
    set((state) => {
      const selected = new Set(state.selectedKeyframeIds);
      const duplicates = state.keyframes
        .filter((keyframe) => selected.has(keyframe.id))
        .map((keyframe) => ({
          ...cloneKeyframe(keyframe),
          id: createId(),
          frame: clampFrame(keyframe.frame + deltaFrames, state.durationFrames),
        }));

      return {
        keyframes: sortKeyframes([...state.keyframes, ...duplicates]),
        selectedKeyframeIds: duplicates.map((keyframe) => keyframe.id),
      };
    }),

  setSelectedInterpolation: (interpolation) =>
    set((state) => {
      const selected = new Set(state.selectedKeyframeIds);
      return {
        defaultInterpolation: interpolation,
        keyframes: sortKeyframes(
          state.keyframes.map((keyframe) => (selected.has(keyframe.id) ? { ...keyframe, interpolation } : keyframe)),
        ),
      };
    }),
}));
