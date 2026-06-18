import { create } from 'zustand';
import { useEditorStore } from './editorStore';
import { useMaterialStore } from './materialStore';
import { useSceneStore } from './sceneStore';
import { cloneLayer, cloneMaterial, cloneReferenceImage, cloneSceneObject, type EditorMaterial, type Layer, type ReferenceImage, type SceneObject } from './types';

type HistorySnapshot = {
  objects: SceneObject[];
  layers: Layer[];
  referenceImages: ReferenceImage[];
  materials: Record<string, EditorMaterial>;
  selectedObjectIds: string[];
};

type HistoryState = {
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
};

const cloneMaterials = (materials: Record<string, EditorMaterial>) =>
  Object.fromEntries(Object.entries(materials).map(([key, value]) => [key, cloneMaterial(value)]));

const captureSnapshot = (): HistorySnapshot => ({
  objects: useSceneStore.getState().objects.map(cloneSceneObject),
  layers: useSceneStore.getState().layers.map(cloneLayer),
  referenceImages: useSceneStore.getState().referenceImages.map(cloneReferenceImage),
  materials: cloneMaterials(useMaterialStore.getState().materials),
  selectedObjectIds: [...useEditorStore.getState().selectedObjectIds],
});

const restoreSnapshot = (snapshot: HistorySnapshot) => {
  useSceneStore.getState().setObjects(snapshot.objects);
  useSceneStore.getState().setLayers(snapshot.layers);
  useSceneStore.getState().setReferenceImages(snapshot.referenceImages);
  useMaterialStore.getState().setMaterials(snapshot.materials);
  const editor = useEditorStore.getState();
  editor.clearSelectedObjects();
  snapshot.selectedObjectIds.forEach((id) => editor.toggleSelectedObject(id));
};

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],

  pushSnapshot: () => {
    const snapshot = captureSnapshot();
    set((state) => ({
      undoStack: [...state.undoStack, snapshot].slice(-60),
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack, redoStack } = get();
    const previous = undoStack.at(-1);
    if (!previous) return;

    const current = captureSnapshot();
    restoreSnapshot(previous);
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, current],
    });
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    const next = redoStack.at(-1);
    if (!next) return;

    const current = captureSnapshot();
    restoreSnapshot(next);
    set({
      undoStack: [...undoStack, current],
      redoStack: redoStack.slice(0, -1),
    });
  },

  clear: () => set({ undoStack: [], redoStack: [] }),
}));
