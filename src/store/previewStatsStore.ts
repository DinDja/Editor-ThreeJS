import { create } from 'zustand';

export type RendererStats = {
  drawCalls: number;
  geometries: number;
  textures: number;
  triangles: number;
  calls: number;
  fps: number;
  jsHeapUsedMB: number;
  jsHeapTotalMB: number;
  updatedAt: number;
};

const EMPTY_STATS: RendererStats = {
  drawCalls: 0,
  geometries: 0,
  textures: 0,
  triangles: 0,
  calls: 0,
  fps: 0,
  jsHeapUsedMB: 0,
  jsHeapTotalMB: 0,
  updatedAt: 0,
};

type PreviewStatsState = {
  stats: RendererStats;
  setStats: (stats: Partial<RendererStats>) => void;
  reset: () => void;
};

export const usePreviewStatsStore = create<PreviewStatsState>((set) => ({
  stats: EMPTY_STATS,
  setStats: (partial) =>
    set((state) => ({ stats: { ...state.stats, ...partial, updatedAt: performance.now() } })),
  reset: () => set({ stats: EMPTY_STATS }),
}));
