import { create } from 'zustand';
import type { ActiveTool, MeshSelectionMode, MobilePanel, ObjectSelectionMode, PointerType, SculptFalloff, SculptMode, Vec3, ViewportDisplayMode } from './types';

type EditorState = {
  selectedObjectId: string | null;
  activeTool: ActiveTool;
  objectSelectionMode: ObjectSelectionMode;
  viewportDisplayMode: ViewportDisplayMode;
  meshSelectionMode: MeshSelectionMode;
  selectedVertexIndices: number[];
  selectedEdgeVertexIndices: [number, number] | null;
  selectedFaceIndex: number | null;
  sculptMode: SculptMode;
  sculptFalloff: SculptFalloff;
  sculptSymmetryX: boolean;
  sculptFrontFacesOnly: boolean;
  sculptAccumulate: boolean;
  sculptSpacing: number;
  sculptRadius: number;
  sculptStrength: number;
  sculptBrushObjectId: string | null;
  sculptBrushCenter: Vec3 | null;
  sculptBrushNormal: Vec3 | null;
  sculptPressureStrength: boolean;
  sculptPressureRadius: boolean;
  sculptPenSmoothing: number;
  sculptPointerType: PointerType;
  showGrid: boolean;
  snapping: boolean;
  snapStep: number;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  timelineCollapsed: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  activeMobilePanel: MobilePanel | null;
  selectedReferenceId: string | null;
  setSelectedObject: (uuid: string | null) => void;
  setSelectedReference: (id: string | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setObjectSelectionMode: (mode: ObjectSelectionMode) => void;
  setViewportDisplayMode: (mode: ViewportDisplayMode) => void;
  setMeshSelectionMode: (mode: MeshSelectionMode) => void;
  setSelectedVertices: (indices: number[]) => void;
  toggleVertexSelection: (index: number, additive?: boolean) => void;
  setSelectedEdge: (edge: [number, number] | null) => void;
  setSelectedFace: (faceIndex: number | null, vertexIndices?: number[]) => void;
  clearMeshSelection: () => void;
  setSculptMode: (mode: SculptMode) => void;
  setSculptFalloff: (falloff: SculptFalloff) => void;
  setSculptSymmetryX: (enabled: boolean) => void;
  setSculptFrontFacesOnly: (enabled: boolean) => void;
  setSculptAccumulate: (enabled: boolean) => void;
  setSculptSpacing: (spacing: number) => void;
  setSculptRadius: (radius: number) => void;
  setSculptStrength: (strength: number) => void;
  setSculptBrushPreview: (objectId: string, center: Vec3, normal: Vec3) => void;
  clearSculptBrushPreview: () => void;
  setSculptPressureStrength: (enabled: boolean) => void;
  setSculptPressureRadius: (enabled: boolean) => void;
  setSculptPenSmoothing: (smoothing: number) => void;
  setSculptPointerType: (pointerType: PointerType) => void;
  setShowGrid: (showGrid: boolean) => void;
  setSnapping: (snapping: boolean) => void;
  setSnapStep: (snapStep: number) => void;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  setTimelineCollapsed: (collapsed: boolean) => void;
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setActiveMobilePanel: (panel: MobilePanel | null) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  selectedObjectId: null,
  activeTool: 'select',
  objectSelectionMode: 'subelement',
  viewportDisplayMode: 'textured',
  meshSelectionMode: 'vertex',
  selectedVertexIndices: [],
  selectedEdgeVertexIndices: null,
  selectedFaceIndex: null,
  sculptMode: 'push',
  sculptFalloff: 'smooth',
  sculptSymmetryX: false,
  sculptFrontFacesOnly: false,
  sculptAccumulate: true,
  sculptSpacing: 0.2,
  sculptRadius: 0.45,
  sculptStrength: 0.18,
  sculptBrushObjectId: null,
  sculptBrushCenter: null,
  sculptBrushNormal: null,
  sculptPressureStrength: true,
  sculptPressureRadius: false,
  sculptPenSmoothing: 0,
  sculptPointerType: 'mouse',
  showGrid: true,
  snapping: false,
  snapStep: 0.25,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  timelineCollapsed: false,
  leftPanelWidth: 280,
  rightPanelWidth: 360,
  activeMobilePanel: null,
  selectedReferenceId: null,

  setSelectedObject: (selectedObjectId) =>
    set({
      selectedObjectId,
      selectedReferenceId: null,
      selectedVertexIndices: [],
      selectedEdgeVertexIndices: null,
      selectedFaceIndex: null,
    }),
  setSelectedReference: (selectedReferenceId) =>
    set({
      selectedReferenceId,
      selectedObjectId: null,
      selectedVertexIndices: [],
      selectedEdgeVertexIndices: null,
      selectedFaceIndex: null,
    }),
  setActiveTool: (activeTool) =>
    set(() =>
      activeTool === 'edit' || activeTool === 'sculpt'
        ? { activeTool }
        : {
            activeTool,
            selectedVertexIndices: [],
            selectedEdgeVertexIndices: null,
            selectedFaceIndex: null,
            sculptBrushObjectId: null,
            sculptBrushCenter: null,
            sculptBrushNormal: null,
        },
    ),
  setObjectSelectionMode: (objectSelectionMode) => set({ objectSelectionMode }),
  setViewportDisplayMode: (viewportDisplayMode) => set({ viewportDisplayMode }),
  setMeshSelectionMode: (meshSelectionMode) =>
    set({
      meshSelectionMode,
      selectedVertexIndices: [],
      selectedEdgeVertexIndices: null,
      selectedFaceIndex: null,
    }),
  setSelectedVertices: (selectedVertexIndices) =>
    set({ selectedVertexIndices, selectedEdgeVertexIndices: null, selectedFaceIndex: null }),
  toggleVertexSelection: (index, additive = false) =>
    set((state) => {
      if (!additive) {
        return { selectedVertexIndices: [index], selectedEdgeVertexIndices: null, selectedFaceIndex: null };
      }

      const exists = state.selectedVertexIndices.includes(index);
      return {
        selectedVertexIndices: exists
          ? state.selectedVertexIndices.filter((item) => item !== index)
          : [...state.selectedVertexIndices, index],
        selectedEdgeVertexIndices: null,
        selectedFaceIndex: null,
      };
    }),
  setSelectedEdge: (selectedEdgeVertexIndices) =>
    set({
      selectedEdgeVertexIndices,
      selectedVertexIndices: selectedEdgeVertexIndices ? [...selectedEdgeVertexIndices] : [],
      selectedFaceIndex: null,
    }),
  setSelectedFace: (selectedFaceIndex, selectedVertexIndices = []) =>
    set({ selectedFaceIndex, selectedVertexIndices, selectedEdgeVertexIndices: null }),
  clearMeshSelection: () => set({ selectedVertexIndices: [], selectedEdgeVertexIndices: null, selectedFaceIndex: null }),
  setSculptMode: (sculptMode) => set({ sculptMode }),
  setSculptFalloff: (sculptFalloff) => set({ sculptFalloff }),
  setSculptSymmetryX: (sculptSymmetryX) => set({ sculptSymmetryX }),
  setSculptFrontFacesOnly: (sculptFrontFacesOnly) => set({ sculptFrontFacesOnly }),
  setSculptAccumulate: (sculptAccumulate) => set({ sculptAccumulate }),
  setSculptSpacing: (sculptSpacing) => set({ sculptSpacing: Math.max(0, Math.min(1, sculptSpacing)) }),
  setSculptRadius: (sculptRadius) => set({ sculptRadius: Math.max(0.05, Math.min(5, sculptRadius)) }),
  setSculptStrength: (sculptStrength) => set({ sculptStrength: Math.max(0.01, Math.min(1, sculptStrength)) }),
  setSculptBrushPreview: (sculptBrushObjectId, sculptBrushCenter, sculptBrushNormal) =>
    set({
      sculptBrushObjectId,
      sculptBrushCenter: [...sculptBrushCenter],
      sculptBrushNormal: [...sculptBrushNormal],
    }),
  clearSculptBrushPreview: () =>
    set({
      sculptBrushObjectId: null,
      sculptBrushCenter: null,
      sculptBrushNormal: null,
    }),
  setSculptPressureStrength: (sculptPressureStrength) => set({ sculptPressureStrength }),
  setSculptPressureRadius: (sculptPressureRadius) => set({ sculptPressureRadius }),
  setSculptPenSmoothing: (sculptPenSmoothing) => set({ sculptPenSmoothing: Math.max(0, Math.min(1, sculptPenSmoothing)) }),
  setSculptPointerType: (sculptPointerType) => set({ sculptPointerType }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setSnapping: (snapping) => set({ snapping }),
  setSnapStep: (snapStep) => set({ snapStep }),
  setLeftPanelCollapsed: (leftPanelCollapsed) => set({ leftPanelCollapsed }),
  setRightPanelCollapsed: (rightPanelCollapsed) => set({ rightPanelCollapsed }),
  setTimelineCollapsed: (timelineCollapsed) => set({ timelineCollapsed }),
  setLeftPanelWidth: (leftPanelWidth) => set({ leftPanelWidth: Math.max(180, Math.min(480, leftPanelWidth)) }),
  setRightPanelWidth: (rightPanelWidth) => set({ rightPanelWidth: Math.max(220, Math.min(600, rightPanelWidth)) }),
  setActiveMobilePanel: (activeMobilePanel) => set({ activeMobilePanel }),
}));
