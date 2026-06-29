'use client';

import { create } from 'zustand';

export type PageBuilderZoom = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

type PageBuilderViewportState = {
  zoom: PageBuilderZoom;
  setScale: (scale: number, anchorX?: number, anchorY?: number) => void;
  setOffset: (offsetX: number, offsetY: number) => void;
  reset: () => void;
  fitToScreen: (canvasWidth: number, contentWidth: number, contentHeight: number) => void;
};

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const usePageBuilderViewportStore = create<PageBuilderViewportState>((set, get) => ({
  zoom: { scale: 1, offsetX: 0, offsetY: 0 },
  setScale: (scale, _anchorX, _anchorY) => set({
    zoom: { ...get().zoom, scale: clamp(scale, MIN_SCALE, MAX_SCALE) },
  }),
  setOffset: (offsetX, offsetY) => set({ zoom: { ...get().zoom, offsetX, offsetY } }),
  reset: () => set({ zoom: { scale: 1, offsetX: 0, offsetY: 0 } }),
  fitToScreen: (_canvasWidth, _contentWidth, contentHeight) => {
    // Simple fit: scale to show ~1200px content height with margin
    const targetScale = clamp(900 / Math.max(1, contentHeight), MIN_SCALE, MAX_SCALE);
    set({ zoom: { scale: targetScale, offsetX: 0, offsetY: 0 } });
  },
}));

export const PAGE_BUILDER_ZOOM_MIN = MIN_SCALE;
export const PAGE_BUILDER_ZOOM_MAX = MAX_SCALE;
