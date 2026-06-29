'use client';

import { create } from 'zustand';

export type CanvasBackground = 'plain' | 'dots' | 'grid-8' | 'grid-16';

type PageBuilderViewModeState = {
  background: CanvasBackground;
  xrayMode: boolean;
  showOnlySelection: boolean;
  showGridOverlay: boolean;
  setBackground: (background: CanvasBackground) => void;
  toggleXray: () => void;
  toggleShowOnlySelection: () => void;
  toggleGridOverlay: () => void;
};

export const usePageBuilderViewModeStore = create<PageBuilderViewModeState>((set) => ({
  background: 'plain',
  xrayMode: false,
  showOnlySelection: false,
  showGridOverlay: false,
  setBackground: (background) => set({ background }),
  toggleXray: () => set((state) => ({ xrayMode: !state.xrayMode })),
  toggleShowOnlySelection: () => set((state) => ({ showOnlySelection: !state.showOnlySelection })),
  toggleGridOverlay: () => set((state) => ({ showGridOverlay: !state.showGridOverlay })),
}));
