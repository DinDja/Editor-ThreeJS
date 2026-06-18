import { create } from 'zustand';
import type { EditableMesh, Vec3 } from './types';
import {
  type EdgeId,
  type FaceId,
  type PolygonMesh,
  type VertexId,
  addFace,
  addVertex,
  bridgeEdges,
  clonePolygonMesh,
  computeFaceNormal,
  createPolygonMesh,
  editableMeshToPolygonMesh,
  fillFace,
  flipFaceNormal,
  fromSnapshot,
  getEdgeLength,
  getFaceArea,
  getStats,
  insetFace,
  mergeVerticesByDistance,
  polygonMeshToEditableMesh,
  removeFace,
  removeVertex,
  toSnapshot,
  edgeLoopSelect,
  edgeRingSelect,
} from '@/lib/polygonMesh';

type PolygonMeshState = {
  activeObjectId: string | null;
  mesh: PolygonMesh | null;
  originalEditableMesh: EditableMesh | null;
  selectedVertexIds: VertexId[];
  selectedEdgeIds: EdgeId[];
  selectedFaceIds: FaceId[];
  hoverVertexId: VertexId | null;
  hoverEdgeId: EdgeId | null;
  hoverFaceId: FaceId | null;

  beginEdit: (objectId: string, editableMesh: EditableMesh) => void;
  cancelEdit: () => void;
  commitEdit: () => EditableMesh | null;

  addVertexAt: (position: Vec3) => VertexId | null;
  addFaceFromVertices: (vertexIds: VertexId[]) => FaceId | null;
  fillFromSelectedVertices: () => FaceId | null;
  bridgeSelectedEdges: () => FaceId[];
  insetSelectedFace: (amount: number) => FaceId[];
  flipSelectedFaceNormal: () => void;
  mergeByDistance: (threshold?: number) => number;
  removeSelectedVertices: () => void;
  removeSelectedFaces: () => void;

  selectVertex: (id: VertexId, additive?: boolean) => void;
  selectEdge: (id: EdgeId, additive?: boolean) => void;
  selectFace: (id: FaceId, additive?: boolean) => void;
  selectEdgeLoop: (edgeId: EdgeId) => void;
  selectEdgeRing: (edgeId: EdgeId) => void;
  clearSelection: () => void;
  setHoverVertex: (id: VertexId | null) => void;
  setHoverEdge: (id: EdgeId | null) => void;
  setHoverFace: (id: FaceId | null) => void;

  getEditableMesh: () => EditableMesh | null;
  getStats: () => ReturnType<typeof getStats> | null;
  getSelectedVertexPosition: () => Vec3 | null;
  getSelectedEdgeLength: () => number;
  getSelectedFaceArea: () => number;
  getSelectedFaceNormal: () => Vec3 | null;
};

export const usePolygonMeshStore = create<PolygonMeshState>((set, get) => ({
  activeObjectId: null,
  mesh: null,
  originalEditableMesh: null,
  selectedVertexIds: [],
  selectedEdgeIds: [],
  selectedFaceIds: [],
  hoverVertexId: null,
  hoverEdgeId: null,
  hoverFaceId: null,

  beginEdit: (objectId, editableMesh) => {
    const mesh = editableMeshToPolygonMesh(editableMesh);
    set({
      activeObjectId: objectId,
      mesh,
      originalEditableMesh: editableMesh,
      selectedVertexIds: [],
      selectedEdgeIds: [],
      selectedFaceIds: [],
      hoverVertexId: null,
      hoverEdgeId: null,
      hoverFaceId: null,
    });
  },

  cancelEdit: () => {
    set({
      activeObjectId: null,
      mesh: null,
      originalEditableMesh: null,
      selectedVertexIds: [],
      selectedEdgeIds: [],
      selectedFaceIds: [],
      hoverVertexId: null,
      hoverEdgeId: null,
      hoverFaceId: null,
    });
  },

  commitEdit: () => {
    const { mesh } = get();
    if (!mesh) return null;
    return polygonMeshToEditableMesh(mesh);
  },

  addVertexAt: (position) => {
    const { mesh } = get();
    if (!mesh) return null;
    const id = addVertex(mesh, position);
    set({ mesh });
    return id;
  },

  addFaceFromVertices: (vertexIds) => {
    const { mesh } = get();
    if (!mesh) return null;
    const id = addFace(mesh, vertexIds);
    set({ mesh });
    return id;
  },

  fillFromSelectedVertices: () => {
    const { mesh, selectedVertexIds } = get();
    if (!mesh || selectedVertexIds.length < 3) return null;
    const id = fillFace(mesh, selectedVertexIds);
    set({ mesh });
    return id;
  },

  bridgeSelectedEdges: () => {
    const { mesh, selectedEdgeIds } = get();
    if (!mesh || selectedEdgeIds.length !== 2) return [];
    const ids = bridgeEdges(mesh, selectedEdgeIds[0], selectedEdgeIds[1]);
    set({ mesh });
    return ids;
  },

  insetSelectedFace: (amount) => {
    const { mesh, selectedFaceIds } = get();
    if (!mesh || selectedFaceIds.length === 0) return [];
    const result: FaceId[] = [];
    for (const faceId of selectedFaceIds) {
      result.push(...insetFace(mesh, faceId, amount));
    }
    set({ mesh });
    return result;
  },

  flipSelectedFaceNormal: () => {
    const { mesh, selectedFaceIds } = get();
    if (!mesh) return;
    for (const faceId of selectedFaceIds) flipFaceNormal(mesh, faceId);
    set({ mesh });
  },

  mergeByDistance: (threshold = 0.0001) => {
    const { mesh } = get();
    if (!mesh) return 0;
    const count = mergeVerticesByDistance(mesh, threshold);
    set({ mesh });
    return count;
  },

  removeSelectedVertices: () => {
    const { mesh, selectedVertexIds } = get();
    if (!mesh) return;
    for (const id of selectedVertexIds) removeVertex(mesh, id);
    set({ mesh, selectedVertexIds: [] });
  },

  removeSelectedFaces: () => {
    const { mesh, selectedFaceIds } = get();
    if (!mesh) return;
    for (const id of selectedFaceIds) removeFace(mesh, id);
    set({ mesh, selectedFaceIds: [] });
  },

  selectVertex: (id, additive = false) => {
    set((state) => ({
      selectedVertexIds: additive
        ? (state.selectedVertexIds.includes(id)
          ? state.selectedVertexIds.filter((v) => v !== id)
          : [...state.selectedVertexIds, id])
        : [id],
      selectedEdgeIds: [],
      selectedFaceIds: [],
    }));
  },

  selectEdge: (id, additive = false) => {
    set((state) => ({
      selectedEdgeIds: additive
        ? (state.selectedEdgeIds.includes(id)
          ? state.selectedEdgeIds.filter((e) => e !== id)
          : [...state.selectedEdgeIds, id])
        : [id],
      selectedVertexIds: [],
      selectedFaceIds: [],
    }));
  },

  selectFace: (id, additive = false) => {
    set((state) => ({
      selectedFaceIds: additive
        ? (state.selectedFaceIds.includes(id)
          ? state.selectedFaceIds.filter((f) => f !== id)
          : [...state.selectedFaceIds, id])
        : [id],
      selectedVertexIds: [],
      selectedEdgeIds: [],
    }));
  },

  selectEdgeLoop: (edgeId) => {
    const { mesh } = get();
    if (!mesh) return;
    const loop = edgeLoopSelect(mesh, edgeId);
    set({ selectedEdgeIds: loop, selectedVertexIds: [], selectedFaceIds: [] });
  },

  selectEdgeRing: (edgeId) => {
    const { mesh } = get();
    if (!mesh) return;
    const ring = edgeRingSelect(mesh, edgeId);
    set({ selectedEdgeIds: ring, selectedVertexIds: [], selectedFaceIds: [] });
  },

  clearSelection: () => {
    set({ selectedVertexIds: [], selectedEdgeIds: [], selectedFaceIds: [] });
  },

  setHoverVertex: (id) => set({ hoverVertexId: id }),
  setHoverEdge: (id) => set({ hoverEdgeId: id }),
  setHoverFace: (id) => set({ hoverFaceId: id }),

  getEditableMesh: () => {
    const { mesh } = get();
    return mesh ? polygonMeshToEditableMesh(mesh) : null;
  },

  getStats: () => {
    const { mesh } = get();
    return mesh ? getStats(mesh) : null;
  },

  getSelectedVertexPosition: () => {
    const { mesh, selectedVertexIds } = get();
    if (!mesh || selectedVertexIds.length === 0) return null;
    return mesh.vertices.get(selectedVertexIds[0])?.position ?? null;
  },

  getSelectedEdgeLength: () => {
    const { mesh, selectedEdgeIds } = get();
    if (!mesh || selectedEdgeIds.length === 0) return 0;
    return getEdgeLength(mesh, selectedEdgeIds[0]);
  },

  getSelectedFaceArea: () => {
    const { mesh, selectedFaceIds } = get();
    if (!mesh || selectedFaceIds.length === 0) return 0;
    return getFaceArea(mesh, selectedFaceIds[0]);
  },

  getSelectedFaceNormal: () => {
    const { mesh, selectedFaceIds } = get();
    if (!mesh || selectedFaceIds.length === 0) return null;
    return computeFaceNormal(mesh, selectedFaceIds[0]);
  },
}));

export const polygonMeshSnapshot = (state: PolygonMeshState) => {
  if (!state.mesh) return null;
  return toSnapshot(state.mesh);
};

export const restorePolygonMeshSnapshot = (
  snapshot: ReturnType<typeof polygonMeshSnapshot>,
) => {
  if (!snapshot) return;
  usePolygonMeshStore.setState({
    mesh: fromSnapshot(snapshot),
  });
};
