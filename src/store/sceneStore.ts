import { create } from 'zustand';
import { INITIAL_OBJECTS } from './initialScene';
import { cloneEditableMesh, cloneSceneObject, createId, type PrimitiveKind, type SceneObject, type SceneObjectInput } from './types';

type SceneState = {
  objects: SceneObject[];
  addObject: (input: SceneObjectInput) => SceneObject;
  addPrimitive: (primitive: PrimitiveKind) => SceneObject;
  updateObject: (uuid: string, patch: Partial<Omit<SceneObject, 'uuid'>>) => void;
  removeObject: (uuid: string) => void;
  setObjects: (objects: SceneObject[]) => void;
  resetScene: () => void;
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
      position: [0, primitive === 'plane' ? -0.01 : 0.5, 0],
      rotation: primitive === 'plane' ? [-Math.PI / 2, 0, 0] : [0, 0, 0],
    });
    set((state) => ({ objects: [...state.objects, object] }));
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

  resetScene: () => set({ objects: INITIAL_OBJECTS.map(cloneSceneObject) }),
}));
