import { create } from 'zustand';
import type { ActiveTool } from './types';

type EditorState = {
  selectedObjectId: string | null;
  activeTool: ActiveTool;
  showGrid: boolean;
  snapping: boolean;
  snapStep: number;
  setSelectedObject: (uuid: string | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setShowGrid: (showGrid: boolean) => void;
  setSnapping: (snapping: boolean) => void;
  setSnapStep: (snapStep: number) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  selectedObjectId: 'object-brain',
  activeTool: 'select',
  showGrid: true,
  snapping: false,
  snapStep: 0.25,

  setSelectedObject: (selectedObjectId) => set({ selectedObjectId }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setSnapping: (snapping) => set({ snapping }),
  setSnapStep: (snapStep) => set({ snapStep }),
}));
