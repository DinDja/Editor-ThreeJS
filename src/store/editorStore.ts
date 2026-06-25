import { create } from 'zustand';
import type { ActiveTool, MeshEditMode, MeshSelectionMode, MobilePanel, ObjectSelectionMode, PointerType, SculptFalloff, SculptMode, Vec3, ViewportDisplayMode } from './types';

export type MeshSelectMode = 'click' | 'box' | 'lasso';

export type MeshSnapTarget = 'off' | 'vertex' | 'edge' | 'face';

type EditorState = {
  selectedObjectIds: string[];
  activeTool: ActiveTool;
  objectSelectionMode: ObjectSelectionMode;
  viewportDisplayMode: ViewportDisplayMode;
  meshSelectionMode: MeshSelectionMode;
  meshSelectMode: MeshSelectMode;
  meshEditMode: MeshEditMode;
  meshSnapEnabled: boolean;
  meshSnapTarget: MeshSnapTarget;
  selectedVertexIndices: number[];
  selectedEdgeVertexIndices: [number, number] | null;
  selectedEdgeIndices: number[];
  selectedFaceIndex: number | null;
  selectedFaceIndices: number[];
  drawPolygonPoints: Vec3[];
  knifePoints: Vec3[];
  hoverVertexIndex: number | null;
  hoverEdgeIndex: number | null;
  hoverFaceIndex: number | null;
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
  frameRequestCount: number;
  frameTargetObjectId: string | null;
  setSelectedObject: (uuid: string | null, additive?: boolean) => void;
  requestFrameObject: (objectId: string) => void;
  toggleSelectedObject: (uuid: string) => void;
  clearSelectedObjects: () => void;
  setSelectedReference: (id: string | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setObjectSelectionMode: (mode: ObjectSelectionMode) => void;
  setViewportDisplayMode: (mode: ViewportDisplayMode) => void;
  setMeshSelectionMode: (mode: MeshSelectionMode) => void;
  setMeshSelectMode: (mode: MeshSelectMode) => void;
  setMeshEditMode: (mode: MeshEditMode) => void;
  setMeshSnapEnabled: (enabled: boolean) => void;
  setMeshSnapTarget: (target: MeshSnapTarget) => void;
  setSelectedVertices: (indices: number[]) => void;
  toggleVertexSelection: (index: number, additive?: boolean) => void;
  setSelectedEdge: (edge: [number, number] | null) => void;
  setSelectedEdges: (indices: number[]) => void;
  toggleEdgeSelection: (index: number, additive?: boolean) => void;
  setSelectedFace: (faceIndex: number | null, vertexIndices?: number[]) => void;
  setSelectedFaces: (indices: number[]) => void;
  toggleFaceSelection: (index: number, additive?: boolean) => void;
  clearMeshSelection: () => void;
  setDrawPolygonPoints: (points: Vec3[]) => void;
  addDrawPolygonPoint: (point: Vec3) => void;
  clearDrawPolygon: () => void;
  setKnifePoints: (points: Vec3[]) => void;
  addKnifePoint: (point: Vec3) => void;
  clearKnife: () => void;
  setHoverVertex: (index: number | null) => void;
  setHoverEdge: (index: number | null) => void;
  setHoverFace: (index: number | null) => void;
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
  selectedObjectIds: [],
  activeTool: 'select',
  objectSelectionMode: 'subelement',
  viewportDisplayMode: 'textured',
  meshSelectionMode: 'vertex',
  meshSelectMode: 'click',
  meshEditMode: 'object',
  meshSnapEnabled: false,
  meshSnapTarget: 'vertex',
  selectedVertexIndices: [],
  selectedEdgeVertexIndices: null,
  selectedEdgeIndices: [],
  selectedFaceIndex: null,
  selectedFaceIndices: [],
  drawPolygonPoints: [],
  knifePoints: [],
  hoverVertexIndex: null,
  hoverEdgeIndex: null,
  hoverFaceIndex: null,
  sculptMode: 'push',
  sculptFalloff: 'smooth',
  sculptSymmetryX: false,
  sculptFrontFacesOnly: false,
  sculptAccumulate: true,
  sculptSpacing: 0.15,
  sculptRadius: 0.45,
  sculptStrength: 0.25,
  sculptBrushObjectId: null,
  sculptBrushCenter: null,
  sculptBrushNormal: null,
  sculptPressureStrength: false,
  sculptPressureRadius: false,
  sculptPenSmoothing: 0.35,
  sculptPointerType: 'mouse',
  showGrid: true,
  snapping: false,
  snapStep: 0.25,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  timelineCollapsed: false,
  leftPanelWidth: 300,
  rightPanelWidth: 380,
  activeMobilePanel: null,
  selectedReferenceId: null,
  frameRequestCount: 0,
  frameTargetObjectId: null,

  setSelectedObject: (uuid, additive = false) =>
    set((state) => {
      if (additive && uuid) {
        const exists = state.selectedObjectIds.includes(uuid);
        const next = exists
          ? state.selectedObjectIds.filter((id) => id !== uuid)
          : [...state.selectedObjectIds, uuid];
        return {
          selectedObjectIds: next,
          selectedReferenceId: null,
          selectedVertexIndices: [],
          selectedEdgeVertexIndices: null,
          selectedFaceIndex: null,
        };
      }
      return {
        selectedObjectIds: uuid ? [uuid] : [],
        selectedReferenceId: null,
        selectedVertexIndices: [],
        selectedEdgeVertexIndices: null,
        selectedFaceIndex: null,
      };
    }),
  toggleSelectedObject: (uuid) =>
    set((state) => {
      const exists = state.selectedObjectIds.includes(uuid);
      return {
        selectedObjectIds: exists
          ? state.selectedObjectIds.filter((id) => id !== uuid)
          : [...state.selectedObjectIds, uuid],
      };
    }),
  clearSelectedObjects: () =>
    set({
      selectedObjectIds: [],
      selectedVertexIndices: [],
      selectedEdgeVertexIndices: null,
      selectedFaceIndex: null,
    }),
  setSelectedReference: (selectedReferenceId) =>
    set({
      selectedReferenceId,
      selectedObjectIds: [],
      selectedVertexIndices: [],
      selectedEdgeVertexIndices: null,
      selectedFaceIndex: null,
    }),
  setActiveTool: (activeTool) =>
    set(() =>
      activeTool === 'edit' || activeTool === 'sculpt' || activeTool === 'drawPolygon' || activeTool === 'knife'
        ? { activeTool }
        : {
            activeTool,
            selectedObjectIds: [],
            selectedVertexIndices: [],
            selectedEdgeVertexIndices: null,
            selectedEdgeIndices: [],
            selectedFaceIndex: null,
            selectedFaceIndices: [],
            drawPolygonPoints: [],
            knifePoints: [],
            hoverVertexIndex: null,
            hoverEdgeIndex: null,
            hoverFaceIndex: null,
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
      selectedEdgeIndices: [],
      selectedFaceIndex: null,
      selectedFaceIndices: [],
    }),
  setMeshSelectMode: (meshSelectMode) => set({ meshSelectMode }),
  setMeshEditMode: (meshEditMode) => set({ meshEditMode }),
  setMeshSnapEnabled: (meshSnapEnabled) => set({ meshSnapEnabled }),
  setMeshSnapTarget: (meshSnapTarget) => set({ meshSnapTarget }),
  setSelectedVertices: (selectedVertexIndices) =>
    set({ selectedVertexIndices, selectedEdgeVertexIndices: null, selectedEdgeIndices: [], selectedFaceIndex: null, selectedFaceIndices: [] }),
  toggleVertexSelection: (index, additive = false) =>
    set((state) => {
      if (!additive) {
        return { selectedVertexIndices: [index], selectedEdgeVertexIndices: null, selectedEdgeIndices: [], selectedFaceIndex: null, selectedFaceIndices: [] };
      }

      const exists = state.selectedVertexIndices.includes(index);
      return {
        selectedVertexIndices: exists
          ? state.selectedVertexIndices.filter((item) => item !== index)
          : [...state.selectedVertexIndices, index],
        selectedEdgeVertexIndices: null,
        selectedEdgeIndices: [],
        selectedFaceIndex: null,
        selectedFaceIndices: [],
      };
    }),
  setSelectedEdge: (selectedEdgeVertexIndices) =>
    set({
      selectedEdgeVertexIndices,
      selectedVertexIndices: selectedEdgeVertexIndices ? [...selectedEdgeVertexIndices] : [],
      selectedEdgeIndices: [],
      selectedFaceIndex: null,
      selectedFaceIndices: [],
    }),
  setSelectedEdges: (selectedEdgeIndices) =>
    set({ selectedEdgeIndices, selectedEdgeVertexIndices: null, selectedFaceIndex: null, selectedFaceIndices: [] }),
  toggleEdgeSelection: (index, additive = false) =>
    set((state) => {
      if (!additive) return { selectedEdgeIndices: [index] };
      const exists = state.selectedEdgeIndices.includes(index);
      return {
        selectedEdgeIndices: exists
          ? state.selectedEdgeIndices.filter((item) => item !== index)
          : [...state.selectedEdgeIndices, index],
      };
    }),
  setSelectedFace: (selectedFaceIndex, selectedVertexIndices = []) =>
    set({
      selectedFaceIndex,
      selectedVertexIndices,
      selectedEdgeVertexIndices: null,
      selectedEdgeIndices: [],
      selectedFaceIndices: selectedFaceIndex !== null ? [selectedFaceIndex] : [],
    }),
  setSelectedFaces: (selectedFaceIndices) =>
    set({ selectedFaceIndices, selectedFaceIndex: selectedFaceIndices[0] ?? null, selectedEdgeVertexIndices: null, selectedEdgeIndices: [] }),
  toggleFaceSelection: (index, additive = false) =>
    set((state) => {
      if (!additive) return { selectedFaceIndices: [index], selectedFaceIndex: index };
      const exists = state.selectedFaceIndices.includes(index);
      const next = exists
        ? state.selectedFaceIndices.filter((item) => item !== index)
        : [...state.selectedFaceIndices, index];
      return { selectedFaceIndices: next, selectedFaceIndex: next[0] ?? null };
    }),
  clearMeshSelection: () => set({
    selectedVertexIndices: [],
    selectedEdgeVertexIndices: null,
    selectedEdgeIndices: [],
    selectedFaceIndex: null,
    selectedFaceIndices: [],
    hoverVertexIndex: null,
    hoverEdgeIndex: null,
    hoverFaceIndex: null,
  }),
  setDrawPolygonPoints: (drawPolygonPoints) => set({ drawPolygonPoints }),
  addDrawPolygonPoint: (point) => set((state) => ({ drawPolygonPoints: [...state.drawPolygonPoints, point] })),
  clearDrawPolygon: () => set({ drawPolygonPoints: [] }),
  setKnifePoints: (knifePoints) => set({ knifePoints }),
  addKnifePoint: (point) => set((state) => ({ knifePoints: [...state.knifePoints, point] })),
  clearKnife: () => set({ knifePoints: [] }),
  setHoverVertex: (hoverVertexIndex) => set({ hoverVertexIndex }),
  setHoverEdge: (hoverEdgeIndex) => set({ hoverEdgeIndex }),
  setHoverFace: (hoverFaceIndex) => set({ hoverFaceIndex }),
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
  setLeftPanelWidth: (leftPanelWidth) => set({ leftPanelWidth: Math.max(160, Math.min(480, leftPanelWidth)) }),
  setRightPanelWidth: (rightPanelWidth) => set({ rightPanelWidth: Math.max(200, Math.min(600, rightPanelWidth)) }),
  setActiveMobilePanel: (activeMobilePanel) => set({ activeMobilePanel }),
  requestFrameObject: (objectId) =>
    set((state) => ({
      frameRequestCount: state.frameRequestCount + 1,
      frameTargetObjectId: objectId,
    })),
}));
