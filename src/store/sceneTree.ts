import * as THREE from 'three';
import {
  cloneSceneObject,
  createId,
  type MaterialApplicationScope,
  type ObjectSelectionMode,
  type SceneObject,
  type SceneObjectKind,
  type SceneObjectType,
  type SceneTransform,
  type Vec3,
} from './types';

export type SceneTreeNode = {
  object: SceneObject;
  children: SceneTreeNode[];
  depth: number;
};

export type SceneDuplicateResult = {
  rootId: string;
  objects: SceneObject[];
  idMap: Map<string, string>;
  materialIdMap: Map<string, string>;
};

const TYPE_BY_KIND: Record<SceneObjectKind, SceneObjectType> = {
  group: 'Group',
  object3d: 'Object3D',
  mesh: 'Mesh',
  model: 'Mesh',
  primitive: 'Mesh',
  effect: 'Object3D',
  svg: 'Mesh',
  text: 'Mesh',
  light: 'Light',
  camera: 'Camera',
};

export const inferObjectType = (kind: SceneObjectKind, explicitType?: SceneObjectType): SceneObjectType =>
  explicitType ?? TYPE_BY_KIND[kind] ?? 'Object3D';

export const cloneVec3 = (value: Vec3): Vec3 => [value[0], value[1], value[2]];

export const makeTransform = (position: Vec3, rotation: Vec3, scale: Vec3): SceneTransform => ({
  position: cloneVec3(position),
  rotation: cloneVec3(rotation),
  scale: cloneVec3(scale),
});

export const normalizeSceneObject = (object: SceneObject): SceneObject => {
  const uuid = object.uuid ?? object.id ?? createId();
  const parentId = object.parentId ?? object.parent ?? null;
  const transform = object.transform ?? {
    position: object.position ?? [0, 0, 0],
    rotation: object.rotation ?? [0, 0, 0],
    scale: object.scale ?? [1, 1, 1],
  };
  const position = object.position ?? transform.position;
  const rotation = object.rotation ?? transform.rotation;
  const scale = object.scale ?? transform.scale;
  const materialId = object.materialId ?? `material-${uuid}`;

  return {
    ...object,
    id: object.id ?? uuid,
    uuid,
    type: inferObjectType(object.kind, object.type),
    position: cloneVec3(position),
    rotation: cloneVec3(rotation),
    scale: cloneVec3(scale),
    transform: makeTransform(position, rotation, scale),
    visible: object.visible ?? true,
    locked: object.locked ?? false,
    parent: parentId,
    parentId,
    children: [...(object.children ?? [])],
    materialId,
    materialIds: object.materialIds ? [...object.materialIds] : [materialId],
    metadata: { ...(object.metadata ?? {}) },
  };
};

export const normalizeSceneObjects = (objects: SceneObject[]): SceneObject[] => {
  const byId = new Map<string, SceneObject>();

  objects.forEach((object) => {
    const normalized = normalizeSceneObject(object);
    byId.set(normalized.uuid, { ...normalized, children: [] });
  });

  const normalizedObjects = [...byId.values()].map((object) => {
    const parentId = object.parentId && byId.has(object.parentId) && object.parentId !== object.uuid ? object.parentId : null;
    return { ...object, parent: parentId, parentId, children: [] };
  });

  const childrenByParent = new Map<string, string[]>();
  normalizedObjects.forEach((object) => {
    if (!object.parentId) return;
    const children = childrenByParent.get(object.parentId) ?? [];
    children.push(object.uuid);
    childrenByParent.set(object.parentId, children);
  });

  return normalizedObjects.map((object) => ({
    ...object,
    children: childrenByParent.get(object.uuid) ?? [],
  }));
};

export const getObjectById = (objects: SceneObject[], objectId: string | null | undefined) =>
  objectId ? objects.find((object) => object.uuid === objectId) ?? null : null;

export const getObjectChildren = (objects: SceneObject[], objectId: string | null) =>
  objects.filter((object) => object.parentId === objectId || object.parent === objectId);

export const buildSceneTree = (objects: SceneObject[], rootParentId: string | null = null): SceneTreeNode[] => {
  const normalized = normalizeSceneObjects(objects);
  const byParent = new Map<string | null, SceneObject[]>();

  normalized.forEach((object) => {
    const parentId = object.parentId ?? null;
    const siblings = byParent.get(parentId) ?? [];
    siblings.push(object);
    byParent.set(parentId, siblings);
  });

  const build = (parentId: string | null, depth: number): SceneTreeNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.createdAt - b.createdAt || a.name.localeCompare(b.name))
      .map((object) => ({
        object,
        children: build(object.uuid, depth + 1),
        depth,
      }));

  return build(rootParentId, 0);
};

export const traverseSceneTree = (nodes: SceneTreeNode[], visitor: (node: SceneTreeNode) => void) => {
  nodes.forEach((node) => {
    visitor(node);
    traverseSceneTree(node.children, visitor);
  });
};

export const getDescendantIds = (objects: SceneObject[], objectId: string): string[] => {
  const byParent = new Map<string, string[]>();
  objects.forEach((object) => {
    const parentId = object.parentId ?? object.parent;
    if (!parentId) return;
    const children = byParent.get(parentId) ?? [];
    children.push(object.uuid);
    byParent.set(parentId, children);
  });

  const result: string[] = [];
  const visit = (id: string) => {
    for (const childId of byParent.get(id) ?? []) {
      result.push(childId);
      visit(childId);
    }
  };

  visit(objectId);
  return result;
};

export const getSubtreeIds = (objects: SceneObject[], objectId: string) => [objectId, ...getDescendantIds(objects, objectId)];

export const removeSubtree = (objects: SceneObject[], objectId: string) => {
  const removeIds = new Set(getSubtreeIds(objects, objectId));
  return normalizeSceneObjects(objects.filter((object) => !removeIds.has(object.uuid)));
};

export const canObjectHaveMaterial = (object: SceneObject) =>
  object.type === 'Mesh' || ['model', 'primitive', 'svg', 'text', 'mesh'].includes(object.kind);

export const canObjectHaveChildren = (object: SceneObject) =>
  object.type === 'Group' || object.type === 'Object3D' || object.type === 'Mesh';

export const getMaterialTargetObjects = (
  objects: SceneObject[],
  objectId: string,
  scope: MaterialApplicationScope,
) => {
  const selected = getObjectById(objects, objectId);
  if (!selected) return [];

  if (scope === 'self') return canObjectHaveMaterial(selected) ? [selected] : [];

  const descendantIds = getDescendantIds(objects, objectId);
  const ids = scope === 'children' ? descendantIds : [objectId, ...descendantIds];
  return ids
    .map((id) => getObjectById(objects, id))
    .filter((object): object is SceneObject => Boolean(object && canObjectHaveMaterial(object)));
};

export const getSelectionTargetId = (
  objects: SceneObject[],
  clickedId: string,
  mode: ObjectSelectionMode,
) => {
  const clicked = getObjectById(objects, clickedId);
  if (!clicked) return null;

  if (mode === 'subelement') return clicked.uuid;

  if (mode === 'mesh') {
    return clicked.type === 'Mesh' || clicked.editableMesh ? clicked.uuid : null;
  }

  const importRootId = typeof clicked.metadata.importRootId === 'string' ? clicked.metadata.importRootId : null;
  if (importRootId && getObjectById(objects, importRootId)) return importRootId;

  let current = clicked;
  while (current.parentId) {
    const parent = getObjectById(objects, current.parentId);
    if (!parent) break;
    current = parent;
  }

  return current.uuid;
};

const getMaterialIds = (object: SceneObject) => {
  const ids = object.materialIds?.length ? object.materialIds : [object.materialId];
  return Array.from(new Set(ids.filter(Boolean)));
};

export const duplicateSceneSubtree = (objects: SceneObject[], rootId: string, offset: Vec3 = [0.45, 0, 0]): SceneDuplicateResult | null => {
  const sourceIds = getSubtreeIds(objects, rootId);
  const sourceSet = new Set(sourceIds);
  const sourceObjects = objects.filter((object) => sourceSet.has(object.uuid));
  const root = sourceObjects.find((object) => object.uuid === rootId);
  if (!root) return null;

  const idMap = new Map<string, string>();
  const materialIdMap = new Map<string, string>();

  sourceObjects.forEach((object) => {
    idMap.set(object.uuid, createId());
  });

  const mapMaterialId = (oldMaterialId: string, ownerNewId: string, primary: boolean) => {
    const existing = materialIdMap.get(oldMaterialId);
    if (existing) return existing;
    const next = primary ? `material-${ownerNewId}` : createId();
    materialIdMap.set(oldMaterialId, next);
    return next;
  };

  const cloned = sourceObjects.map((object) => {
    const nextId = idMap.get(object.uuid)!;
    const parentId = object.uuid === rootId
      ? object.parentId
      : object.parentId
        ? idMap.get(object.parentId) ?? object.parentId
        : null;
    const primaryMaterialId = mapMaterialId(object.materialId, nextId, true);
    const materialIds = getMaterialIds(object).map((materialId, index) => mapMaterialId(materialId, nextId, index === 0));
    const next = cloneSceneObject({
      ...object,
      id: nextId,
      uuid: nextId,
      name: object.uuid === rootId ? `${object.name} Copy` : object.name,
      parent: parentId,
      parentId,
      materialId: primaryMaterialId,
      materialIds,
      metadata: {
        ...object.metadata,
        importRootId:
          object.metadata.importRootId && idMap.has(object.metadata.importRootId)
            ? idMap.get(object.metadata.importRootId)
            : object.metadata.importRootId,
        materialOverrides: object.metadata.materialOverrides
          ? Object.fromEntries(
              Object.entries(object.metadata.materialOverrides).map(([materialId, value]) => [
                materialIdMap.get(materialId) ?? materialId,
                value,
              ]),
            )
          : undefined,
      },
    });

    if (object.uuid === rootId) {
      next.position = [
        Number((next.position[0] + offset[0]).toFixed(5)),
        Number((next.position[1] + offset[1]).toFixed(5)),
        Number((next.position[2] + offset[2]).toFixed(5)),
      ];
      next.transform = makeTransform(next.position, next.rotation, next.scale);
    }

    return next;
  });

  return {
    rootId: idMap.get(rootId)!,
    objects: normalizeSceneObjects(cloned),
    idMap,
    materialIdMap,
  };
};

export const composeTransformMatrix = (transform: SceneTransform) => {
  const matrix = new THREE.Matrix4();
  matrix.compose(
    new THREE.Vector3(...transform.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...transform.rotation)),
    new THREE.Vector3(...transform.scale),
  );
  return matrix;
};

export const decomposeTransformMatrix = (matrix: THREE.Matrix4): SceneTransform => {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(position, quaternion, scale);
  const rotation = new THREE.Euler().setFromQuaternion(quaternion);
  return {
    position: [position.x, position.y, position.z],
    rotation: [rotation.x, rotation.y, rotation.z],
    scale: [scale.x, scale.y, scale.z],
  };
};

export const getWorldTransformMatrix = (objects: SceneObject[], objectId: string): THREE.Matrix4 => {
  const object = getObjectById(objects, objectId);
  if (!object) return new THREE.Matrix4();

  const local = composeTransformMatrix(object.transform ?? makeTransform(object.position, object.rotation, object.scale));
  if (!object.parentId) return local;

  return getWorldTransformMatrix(objects, object.parentId).multiply(local);
};

export const getLocalTransformForParent = (objects: SceneObject[], objectId: string, newParentId: string | null) => {
  const world = getWorldTransformMatrix(objects, objectId);
  if (!newParentId) return decomposeTransformMatrix(world);

  const parentWorld = getWorldTransformMatrix(objects, newParentId).invert();
  return decomposeTransformMatrix(parentWorld.multiply(world));
};
