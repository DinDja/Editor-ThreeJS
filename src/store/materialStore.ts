import { create } from 'zustand';
import { INITIAL_MATERIALS } from './initialScene';
import { cloneMaterial, createId, type EditorMaterial } from './types';

type MaterialState = {
  materials: Record<string, EditorMaterial>;
  createMaterialForObject: (objectId: string, materialId?: string, name?: string) => EditorMaterial;
  updateMaterial: (materialId: string, patch: Partial<Omit<EditorMaterial, 'uuid' | 'objectId'>>) => void;
  removeMaterial: (materialId: string) => void;
  removeMaterialsForObjects: (objectIds: string[]) => void;
  setMaterials: (materials: Record<string, EditorMaterial>) => void;
  resetMaterials: () => void;
};

const createDefaultMaterial = (objectId: string, materialId = `material-${objectId}`, name = 'Material'): EditorMaterial => ({
  uuid: materialId,
  objectId,
  name,
  color: '#f8fafc',
  metalness: 0,
  roughness: 0.55,
  emissive: '#000000',
  emissiveIntensity: 0,
  opacity: 1,
  textureUrl: null,
  textureName: null,
  normalMapUrl: null,
  roughnessMapUrl: null,
  displacementMapUrl: null,
  textureRepeatX: 1,
  textureRepeatY: 1,
  textureOffsetX: 0,
  textureOffsetY: 0,
  textureRotation: 0,
});

const cloneMaterials = (materials: Record<string, EditorMaterial>) =>
  Object.fromEntries(Object.entries(materials).map(([key, value]) => [key, cloneMaterial(value)]));

export const useMaterialStore = create<MaterialState>((set) => ({
  materials: cloneMaterials(INITIAL_MATERIALS),

  createMaterialForObject: (objectId, materialId = createId(), name = 'Material') => {
    const material = createDefaultMaterial(objectId, materialId, name);
    set((state) => ({ materials: { ...state.materials, [material.uuid]: material } }));
    return material;
  },

  updateMaterial: (materialId, patch) =>
    set((state) => {
      const current = state.materials[materialId];
      if (!current) return state;

      return {
        materials: {
          ...state.materials,
          [materialId]: { ...current, ...patch },
        },
      };
    }),

  removeMaterial: (materialId) =>
    set((state) => {
      const next = { ...state.materials };
      delete next[materialId];
      return { materials: next };
    }),

  removeMaterialsForObjects: (objectIds) =>
    set((state) => {
      const objectIdSet = new Set(objectIds);
      const next = Object.fromEntries(
        Object.entries(state.materials).filter(([, material]) => !objectIdSet.has(material.objectId)),
      );
      return { materials: next };
    }),

  setMaterials: (materials) => set({ materials: cloneMaterials(materials) }),

  resetMaterials: () => set({ materials: cloneMaterials(INITIAL_MATERIALS) }),
}));
