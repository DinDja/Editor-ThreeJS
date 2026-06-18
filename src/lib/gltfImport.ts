'use client';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createId, type EditorMaterial, type SceneObjectInput, type SceneObjectKind, type SceneObjectType, type Vec3 } from '@/store/types';

export type ImportedMaterialDraft = {
  objectId: string;
  materialId: string;
  name: string;
  patch: Partial<Omit<EditorMaterial, 'uuid' | 'objectId'>>;
};

export type ImportedGltfScene = {
  rootId: string;
  objects: SceneObjectInput[];
  materials: ImportedMaterialDraft[];
};

const loader = new GLTFLoader();

const vec3FromThree = (value: THREE.Vector3 | THREE.Euler): Vec3 => [value.x, value.y, value.z];

const safeHex = (color: THREE.Color | undefined, fallback: string) => (color ? `#${color.getHexString()}` : fallback);

const textureUrlFromMaterial = (texture: THREE.Texture | null | undefined) => {
  if (!texture) return null;
  const image = texture.image as { src?: string; currentSrc?: string } | undefined;
  const src = image?.currentSrc || image?.src;
  return typeof src === 'string' && src.length > 0 ? src : null;
};

const materialPatchFromThree = (material: THREE.Material | null | undefined): ImportedMaterialDraft['patch'] => {
  if (!material) return {};

  const candidate = material as THREE.MeshStandardMaterial & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    emissiveIntensity?: number;
    metalness?: number;
    roughness?: number;
    map?: THREE.Texture | null;
    normalMap?: THREE.Texture | null;
    roughnessMap?: THREE.Texture | null;
    displacementMap?: THREE.Texture | null;
  };

  const textureUrl = textureUrlFromMaterial(candidate.map);
  const normalMapUrl = textureUrlFromMaterial(candidate.normalMap);
  const roughnessMapUrl = textureUrlFromMaterial(candidate.roughnessMap);
  const displacementMapUrl = textureUrlFromMaterial(candidate.displacementMap);

  return {
    name: material.name || 'Material',
    color: safeHex(candidate.color, '#f8fafc'),
    metalness: typeof candidate.metalness === 'number' ? candidate.metalness : 0,
    roughness: typeof candidate.roughness === 'number' ? candidate.roughness : 0.55,
    emissive: safeHex(candidate.emissive, '#000000'),
    emissiveIntensity: typeof candidate.emissiveIntensity === 'number' ? candidate.emissiveIntensity : 0,
    opacity: typeof material.opacity === 'number' ? material.opacity : 1,
    textureUrl,
    textureName: textureUrl ? candidate.map?.name || material.name || 'Texture' : null,
    normalMapUrl,
    roughnessMapUrl,
    displacementMapUrl,
  };
};

const nodeKindAndType = (node: THREE.Object3D): { kind: SceneObjectKind; type: SceneObjectType } => {
  if (node instanceof THREE.Mesh) return { kind: 'mesh', type: 'Mesh' };
  if (node instanceof THREE.Light) return { kind: 'light', type: 'Light' };
  if (node instanceof THREE.Camera) return { kind: 'camera', type: 'Camera' };
  if (node.type === 'Group') return { kind: 'group', type: 'Group' };
  return { kind: 'object3d', type: 'Object3D' };
};

const materialListFromNode = (node: THREE.Object3D) => {
  if (!(node instanceof THREE.Mesh)) return [];
  return Array.isArray(node.material) ? node.material : [node.material];
};

export const buildSceneObjectsFromGltf = async ({
  source,
  name,
  sourceType,
  layerId,
}: {
  source: string;
  name: string;
  sourceType: 'public' | 'upload';
  layerId?: string;
}): Promise<ImportedGltfScene> => {
  const gltf = await loader.loadAsync(source);
  const rootId = createId();
  const objects: SceneObjectInput[] = [
    {
      id: rootId,
      uuid: rootId,
      name,
      kind: 'group',
      type: 'Group',
      source,
      sourceType,
      layerId,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: gltf.scene.visible,
      metadata: {
        importRootId: rootId,
        gltfSource: source,
        gltfNodeType: 'Scene',
      },
    },
  ];
  const materials: ImportedMaterialDraft[] = [
    {
      objectId: rootId,
      materialId: `material-${rootId}`,
      name: `Material ${name}`,
      patch: {},
    },
  ];

  const walk = (node: THREE.Object3D, parentId: string, path: number[]) => {
    const id = createId();
    const { kind, type } = nodeKindAndType(node);
    const sourceMaterials = materialListFromNode(node);
    const materialIds = sourceMaterials.length > 0
      ? sourceMaterials.map((_, index) => (index === 0 ? `material-${id}` : createId()))
      : [`material-${id}`];
    const nodeName = node.name?.trim() || `${type} ${objects.length}`;

    objects.push({
      id,
      uuid: id,
      name: nodeName,
      kind,
      type,
      source,
      sourceType,
      layerId,
      position: vec3FromThree(node.position),
      rotation: vec3FromThree(node.rotation),
      scale: vec3FromThree(node.scale),
      visible: node.visible,
      parentId,
      parent: parentId,
      materialId: materialIds[0],
      materialIds,
      metadata: {
        importRootId: rootId,
        gltfSource: source,
        gltfNodePath: path,
        gltfNodeType: node.type,
        sourceMaterialNames: sourceMaterials.map((material) => material?.name ?? ''),
      },
    });

    if (sourceMaterials.length > 0) {
      sourceMaterials.forEach((material, index) => {
        materials.push({
          objectId: id,
          materialId: materialIds[index],
          name: material?.name || `${nodeName} Material ${index + 1}`,
          patch: materialPatchFromThree(material),
        });
      });
    } else {
      materials.push({
        objectId: id,
        materialId: materialIds[0],
        name: `${nodeName} Material`,
        patch: {},
      });
    }

    node.children.forEach((child, index) => walk(child, id, [...path, index]));
  };

  gltf.scene.children.forEach((child, index) => walk(child, rootId, [index]));
  return { rootId, objects, materials };
};
