import { create } from 'zustand';
import type { ActiveTool, MeshSelectionMode, SculptMode } from './types';

type EditorState = {
  selectedObjectId: string | null;
  activeTool: ActiveTool;
  meshSelectionMode: MeshSelectionMode;
  selectedVertexIndices: number[];
  selectedFaceIndex: number | null;
  sculptMode: SculptMode;
  sculptRadius: number;
  sculptStrength: number;
  showGrid: boolean;
  snapping: boolean;
  snapStep: number;
  setSelectedObject: (uuid: string | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setMeshSelectionMode: (mode: MeshSelectionMode) => void;
  setSelectedVertices: (indices: number[]) => void;
  toggleVertexSelection: (index: number, additive?: boolean) => void;
  setSelectedFace: (faceIndex: number | null, vertexIndices?: number[]) => void;
  clearMeshSelection: () => void;
  setSculptMode: (mode: SculptMode) => void;
  setSculptRadius: (radius: number) => void;
  setSculptStrength: (strength: number) => void;
  setShowGrid: (showGrid: boolean) => void;
  setSnapping: (snapping: boolean) => void;
  setSnapStep: (snapStep: number) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  selectedObjectId: null,
  activeTool: 'select',
  meshSelectionMode: 'vertex',
  selectedVertexIndices: [],
  selectedFaceIndex: null,
  sculptMode: 'push',
  sculptRadius: 0.45,
  sculptStrength: 0.18,
  showGrid: true,
  snapping: false,
  snapStep: 0.25,

  setSelectedObject: (selectedObjectId) =>
    set({
      selectedObjectId,
      selectedVertexIndices: [],
      selectedFaceIndex: null,
    }),
  setActiveTool: (activeTool) =>
    set(() =>
      activeTool === 'edit' || activeTool === 'sculpt'
        ? { activeTool }
        : {
            activeTool,
            selectedVertexIndices: [],
            selectedFaceIndex: null,
          },
    ),
  setMeshSelectionMode: (meshSelectionMode) =>
    set({
      meshSelectionMode,
      selectedVertexIndices: [],
      selectedFaceIndex: null,
    }),
  setSelectedVertices: (selectedVertexIndices) => set({ selectedVertexIndices, selectedFaceIndex: null }),
  toggleVertexSelection: (index, additive = false) =>
    set((state) => {
      if (!additive) {
        return { selectedVertexIndices: [index], selectedFaceIndex: null };
      }

      const exists = state.selectedVertexIndices.includes(index);
      return {
        selectedVertexIndices: exists
          ? state.selectedVertexIndices.filter((item) => item !== index)
          : [...state.selectedVertexIndices, index],
        selectedFaceIndex: null,
      };
    }),
  setSelectedFace: (selectedFaceIndex, selectedVertexIndices = []) => set({ selectedFaceIndex, selectedVertexIndices }),
  clearMeshSelection: () => set({ selectedVertexIndices: [], selectedFaceIndex: null }),
  setSculptMode: (sculptMode) => set({ sculptMode }),
  setSculptRadius: (sculptRadius) => set({ sculptRadius: Math.max(0.05, Math.min(5, sculptRadius)) }),
  setSculptStrength: (sculptStrength) => set({ sculptStrength: Math.max(0.01, Math.min(1, sculptStrength)) }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setSnapping: (snapping) => set({ snapping }),
  setSnapStep: (snapStep) => set({ snapStep }),
}));
