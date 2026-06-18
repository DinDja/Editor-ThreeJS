import { create } from 'zustand';
import { INITIAL_OBJECTS } from './initialScene';
import {
  cloneEditableMesh,
  cloneLayer,
  cloneReferenceImage,
  cloneSceneObject,
  createId,
  type Layer,
  type PrimitiveKind,
  type ReferenceImage,
  type SceneObject,
  type SceneObjectInput,
} from './types';

const DEFAULT_LAYER_ID = 'layer-default';

const DEFAULT_LAYERS: Layer[] = [
  { id: DEFAULT_LAYER_ID, name: 'Layer 1', visible: true, locked: false, color: '#34d399', order: 0 },
];

type SceneState = {
  objects: SceneObject[];
  layers: Layer[];
  referenceImages: ReferenceImage[];
  addObject: (input: SceneObjectInput) => SceneObject;
  addPrimitive: (primitive: PrimitiveKind) => SceneObject;
  updateObject: (uuid: string, patch: Partial<Omit<SceneObject, 'uuid'>>) => void;
  removeObject: (uuid: string) => void;
  setObjects: (objects: SceneObject[]) => void;
  resetScene: () => void;
  addLayer: (name?: string) => Layer;
  updateLayer: (id: string, patch: Partial<Omit<Layer, 'id'>>) => void;
  removeLayer: (id: string) => void;
  reorderLayers: (fromOrder: number, toOrder: number) => void;
  moveObjectsToLayer: (objectIds: string[], layerId: string) => void;
  setLayers: (layers: Layer[]) => void;
  addReferenceImage: (imageUrl: string, name?: string) => ReferenceImage;
  updateReferenceImage: (id: string, patch: Partial<Omit<ReferenceImage, 'id'>>) => void;
  removeReferenceImage: (id: string) => void;
  setReferenceImages: (images: ReferenceImage[]) => void;
};

const createSceneObject = (input: SceneObjectInput): SceneObject => {
  const uuid = input.uuid ?? createId();

  return {
    uuid,
    name: input.name,
    kind: input.kind,
    source: input.source,
    sourceType: input.sourceType,
    primitive: input.primitive,
    geometry: input.geometry ? { ...input.geometry } : undefined,
    editableMesh: input.editableMesh ? cloneEditableMesh(input.editableMesh) : undefined,
    effect: input.effect ? { ...input.effect } : undefined,
    behaviors: input.behaviors ? input.behaviors.map((b) => ({ ...b })) : undefined,
    position: input.position ?? [0, 0, 0],
    rotation: input.rotation ?? [0, 0, 0],
    scale: input.scale ?? [1, 1, 1],
    visible: input.visible ?? true,
    parent: input.parent ?? null,
    materialId: input.materialId ?? `material-${uuid}`,
    layerId: input.layerId ?? DEFAULT_LAYER_ID,
    createdAt: input.createdAt ?? Date.now(),
  };
};

const primitiveNames: Record<PrimitiveKind, string> = {
  box: 'Cubo',
  sphere: 'Esfera',
  cylinder: 'Cilindro',
  cone: 'Cone',
  torus: 'Toro',
  plane: 'Plano',
};

export const useSceneStore = create<SceneState>((set) => ({
  objects: INITIAL_OBJECTS.map(cloneSceneObject),
  layers: DEFAULT_LAYERS.map(cloneLayer),
  referenceImages: [],

  addObject: (input) => {
    const object = createSceneObject(input);
    set((state) => ({ objects: [...state.objects, object] }));
    return object;
  },

  addPrimitive: (primitive) => {
    const object = createSceneObject({
      name: primitiveNames[primitive],
      kind: 'primitive',
      primitive,
      layerId: DEFAULT_LAYER_ID,
      position: [0, primitive === 'plane' ? -0.01 : 0.5, 0],
      rotation: primitive === 'plane' ? [-Math.PI / 2, 0, 0] : [0, 0, 0],
    });
    set((s) => ({ objects: [...s.objects, object] }));
    return object;
  },

  updateObject: (uuid, patch) =>
    set((state) => ({
      objects: state.objects.map((object) => (object.uuid === uuid ? { ...object, ...patch } : object)),
    })),

  removeObject: (uuid) =>
    set((state) => ({
      objects: state.objects.filter((object) => object.uuid !== uuid && object.parent !== uuid),
    })),

  setObjects: (objects) => set({ objects: objects.map(cloneSceneObject) }),

  resetScene: () => set({ objects: INITIAL_OBJECTS.map(cloneSceneObject), layers: DEFAULT_LAYERS.map(cloneLayer) }),

  addLayer: (name) => {
    let created: Layer | null = null;
    set((state) => {
      const maxOrder = state.layers.reduce((max, l) => Math.max(max, l.order), -1);
      const layer: Layer = { id: createId(), name: name ?? `Layer ${state.layers.length + 1}`, visible: true, locked: false, color: '#a78bfa', order: maxOrder + 1 };
      created = layer;
      return { layers: [...state.layers, layer] };
    });
    return created!;
  },

  updateLayer: (id, patch) =>
    set((state) => ({
      layers: state.layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    })),

  removeLayer: (id) =>
    set((state) => {
      if (state.layers.length <= 1) return state;
      const remaining = state.layers.filter((l) => l.id !== id);
      const fallbackId = remaining[0]?.id ?? DEFAULT_LAYER_ID;
      return {
        layers: remaining,
        objects: state.objects.map((obj) => (obj.layerId === id ? { ...obj, layerId: fallbackId } : obj)),
      };
    }),

  reorderLayers: (fromOrder, toOrder) =>
    set((state) => {
      const sorted = [...state.layers].sort((a, b) => a.order - b.order);
      const moved = sorted.splice(fromOrder, 1)[0];
      if (!moved) return state;
      sorted.splice(toOrder, 0, moved);
      return { layers: sorted.map((l, i) => ({ ...l, order: i })) };
    }),

  moveObjectsToLayer: (objectIds, layerId) =>
    set((state) => ({
      objects: state.objects.map((obj) => (objectIds.includes(obj.uuid) ? { ...obj, layerId } : obj)),
    })),

  setLayers: (layers) => set({ layers: layers.map(cloneLayer) }),

  addReferenceImage: (imageUrl, name) => {
    let created: ReferenceImage | null = null;
    set((state) => {
      const ref: ReferenceImage = {
        id: createId(),
        name: name ?? 'Referencia',
        imageUrl,
        position: [0, 1.5, -2],
        rotation: [0, 0, 0],
        scale: [2, 2, 2],
        opacity: 0.6,
        visible: true,
      };
      created = ref;
      return { referenceImages: [...state.referenceImages, ref] };
    });
    return created!;
  },

  updateReferenceImage: (id, patch) =>
    set((state) => ({
      referenceImages: state.referenceImages.map((ref) =>
        ref.id === id ? { ...ref, ...patch } : ref,
      ),
    })),

  removeReferenceImage: (id) =>
    set((state) => ({
      referenceImages: state.referenceImages.filter((ref) => ref.id !== id),
    })),

  setReferenceImages: (images) => set({ referenceImages: images.map(cloneReferenceImage) }),
}));
