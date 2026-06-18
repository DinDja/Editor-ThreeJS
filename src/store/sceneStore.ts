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
import {
  duplicateSceneSubtree,
  getDescendantIds,
  getLocalTransformForParent,
  getSubtreeIds,
  inferObjectType,
  makeTransform,
  normalizeSceneObjects,
  removeSubtree,
  type SceneDuplicateResult,
} from './sceneTree';

const DEFAULT_LAYER_ID = 'layer-default';

const DEFAULT_LAYERS: Layer[] = [
  { id: DEFAULT_LAYER_ID, name: 'Layer 1', visible: true, locked: false, color: '#34d399', order: 0 },
];

type SceneState = {
  objects: SceneObject[];
  layers: Layer[];
  referenceImages: ReferenceImage[];
  addObject: (input: SceneObjectInput) => SceneObject;
  addObjects: (inputs: SceneObjectInput[]) => SceneObject[];
  addPrimitive: (primitive: PrimitiveKind) => SceneObject;
  updateObject: (uuid: string, patch: Partial<Omit<SceneObject, 'uuid'>>) => void;
  removeObject: (uuid: string) => void;
  duplicateObject: (uuid: string) => SceneDuplicateResult | null;
  groupObjects: (objectIds: string[], name?: string) => SceneObject | null;
  ungroupObject: (uuid: string) => void;
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
  const uuid = input.uuid ?? input.id ?? createId();
  const parentId = input.parentId ?? input.parent ?? null;
  const position = input.transform?.position ?? input.position ?? [0, 0, 0];
  const rotation = input.transform?.rotation ?? input.rotation ?? [0, 0, 0];
  const scale = input.transform?.scale ?? input.scale ?? [1, 1, 1];
  const materialId = input.materialId ?? `material-${uuid}`;

  return {
    id: input.id ?? uuid,
    uuid,
    name: input.name,
    kind: input.kind,
    type: inferObjectType(input.kind, input.type),
    source: input.source,
    sourceType: input.sourceType,
    primitive: input.primitive,
    geometry: input.geometry ? { ...input.geometry } : undefined,
    editableMesh: input.editableMesh ? cloneEditableMesh(input.editableMesh) : undefined,
    effect: input.effect ? { ...input.effect } : undefined,
    textConfig: input.textConfig ? { ...input.textConfig } : undefined,
    svgConfig: input.svgConfig ? { ...input.svgConfig } : undefined,
    lightConfig: input.lightConfig ? { ...input.lightConfig } : undefined,
    behaviors: input.behaviors ? input.behaviors.map((b) => ({ ...b })) : undefined,
    scripts: input.scripts ? input.scripts.map((s) => ({ ...s })) : undefined,
    position: [...position],
    rotation: [...rotation],
    scale: [...scale],
    transform: makeTransform(position, rotation, scale),
    visible: input.visible ?? true,
    locked: input.locked ?? false,
    parent: parentId,
    parentId,
    children: input.children ? [...input.children] : [],
    materialId,
    materialIds: input.materialIds ? [...input.materialIds] : [materialId],
    layerId: input.layerId ?? DEFAULT_LAYER_ID,
    metadata: { ...(input.metadata ?? {}) },
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
  objects: normalizeSceneObjects(INITIAL_OBJECTS.map(cloneSceneObject)),
  layers: DEFAULT_LAYERS.map(cloneLayer),
  referenceImages: [],

  addObject: (input) => {
    const object = createSceneObject(input);
    let created = object;
    set((state) => {
      const nextObjects = normalizeSceneObjects([...state.objects, object]);
      created = nextObjects.find((item) => item.uuid === object.uuid) ?? object;
      return { objects: nextObjects };
    });
    return created;
  },

  addObjects: (inputs) => {
    const objects = inputs.map(createSceneObject);
    let created = objects;
    set((state) => {
      const nextObjects = normalizeSceneObjects([...state.objects, ...objects]);
      created = objects.map((object) => nextObjects.find((item) => item.uuid === object.uuid) ?? object);
      return { objects: nextObjects };
    });
    return created;
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
    let created = object;
    set((s) => {
      const nextObjects = normalizeSceneObjects([...s.objects, object]);
      created = nextObjects.find((item) => item.uuid === object.uuid) ?? object;
      return { objects: nextObjects };
    });
    return created;
  },

  updateObject: (uuid, patch) =>
    set((state) => ({
      objects: normalizeSceneObjects(
        state.objects.map((object) => {
          if (object.uuid !== uuid) return object;

          const parentId = patch.parentId ?? patch.parent ?? object.parentId ?? object.parent ?? null;
          const position = patch.transform?.position ?? patch.position ?? object.position;
          const rotation = patch.transform?.rotation ?? patch.rotation ?? object.rotation;
          const scale = patch.transform?.scale ?? patch.scale ?? object.scale;
          const materialId = patch.materialId ?? object.materialId;

          return {
            ...object,
            ...patch,
            position,
            rotation,
            scale,
            transform: makeTransform(position, rotation, scale),
            parent: parentId,
            parentId,
            materialId,
            materialIds: patch.materialIds ?? object.materialIds ?? [materialId],
            metadata: patch.metadata ? { ...object.metadata, ...patch.metadata } : object.metadata,
          };
        }),
      ),
    })),

  removeObject: (uuid) =>
    set((state) => ({
      objects: removeSubtree(state.objects, uuid),
    })),

  duplicateObject: (uuid) => {
    let result: SceneDuplicateResult | null = null;
    set((state) => {
      result = duplicateSceneSubtree(state.objects, uuid);
      if (!result) return state;
      return { objects: normalizeSceneObjects([...state.objects, ...result.objects]) };
    });
    return result;
  },

  groupObjects: (objectIds, name = 'Grupo') => {
    let group: SceneObject | null = null;
    set((state) => {
      const uniqueIds = Array.from(new Set(objectIds));
      const selected = uniqueIds
        .map((id) => state.objects.find((object) => object.uuid === id) ?? null)
        .filter((object): object is SceneObject => Boolean(object));

      if (selected.length === 0) return state;
      const parentIds = new Set(selected.map((object) => object.parentId ?? null));
      const parentId = parentIds.size === 1 ? selected[0].parentId ?? null : null;
      const layerId = selected[0].layerId;
      const createdAt = Date.now();
      const groupObject = createSceneObject({
        name,
        kind: 'group',
        type: 'Group',
        parentId,
        layerId,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        createdAt,
        metadata: { groupedObjectIds: uniqueIds },
      });

      group = groupObject;
      return {
        objects: normalizeSceneObjects([
          ...state.objects.map((object) =>
            uniqueIds.includes(object.uuid) ? { ...object, parent: groupObject.uuid, parentId: groupObject.uuid } : object,
          ),
          groupObject,
        ]),
      };
    });
    return group;
  },

  ungroupObject: (uuid) =>
    set((state) => {
      const group = state.objects.find((object) => object.uuid === uuid);
      if (!group) return state;
      const childIds = getDescendantIds(state.objects, uuid).filter((id) => {
        const object = state.objects.find((item) => item.uuid === id);
        return object?.parentId === uuid;
      });
      const nextParentId = group.parentId ?? null;

      return {
        objects: normalizeSceneObjects(
          state.objects
            .filter((object) => object.uuid !== uuid)
            .map((object) => {
              if (!childIds.includes(object.uuid)) return object;
              const transform = getLocalTransformForParent(state.objects, object.uuid, nextParentId);
              return {
                ...object,
                parent: nextParentId,
                parentId: nextParentId,
                position: transform.position,
                rotation: transform.rotation,
                scale: transform.scale,
                transform,
              };
            }),
        ),
      };
    }),

  setObjects: (objects) => set({ objects: normalizeSceneObjects(objects.map(cloneSceneObject)) }),

  resetScene: () => set({ objects: normalizeSceneObjects(INITIAL_OBJECTS.map(cloneSceneObject)), layers: DEFAULT_LAYERS.map(cloneLayer) }),

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
        objects: normalizeSceneObjects(state.objects.map((obj) => (obj.layerId === id ? { ...obj, layerId: fallbackId } : obj))),
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
      objects: normalizeSceneObjects(
        state.objects.map((obj) =>
          objectIds.includes(obj.uuid) || objectIds.some((id) => getSubtreeIds(state.objects, id).includes(obj.uuid))
            ? { ...obj, layerId }
            : obj,
        ),
      ),
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
