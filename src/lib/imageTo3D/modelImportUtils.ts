'use client';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildSceneObjectsFromGltf, type ImportedMaterialDraft } from '@/lib/gltfImport';
import type { SceneObjectInput } from '@/store/types';
import {
  type GeneratedModelMetadata,
  type GeneratedModelStats,
  type ImageTo3DResult,
  type ImportGeneratedModelOptions,
  type ImportedGeneratedModel,
} from './types';

const sharedLoader = new GLTFLoader();

const computeGltfStats = async (source: string): Promise<GeneratedModelStats> => {
  const gltf = await sharedLoader.loadAsync(source);
  let polycount = 0;
  let meshCount = 0;
  let textureCount = 0;
  const materialSet = new Set<THREE.Material>();

  gltf.scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    meshCount += 1;
    const geometry = node.geometry as THREE.BufferGeometry | undefined;
    if (geometry) {
      if (geometry.index) polycount += geometry.index.count / 3;
      else if (geometry.attributes.position) polycount += geometry.attributes.position.count / 3;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((m) => {
      if (!m) return;
      materialSet.add(m);
      const std = m as THREE.MeshStandardMaterial;
      if (std.map) textureCount += 1;
    });
  });

  return {
    polycount: Math.round(polycount),
    meshCount,
    textureCount,
    materialCount: materialSet.size,
    hasTextures: textureCount > 0,
  };
};

const displayNameFor = (result: ImageTo3DResult, options: ImportGeneratedModelOptions) => {
  if (options.renameAutomatically) {
    return result.displayName || 'Generated Model';
  }
  return options.fallbackName || result.displayName || 'Generated Model';
};

export const importGeneratedModel = async (
  result: ImageTo3DResult,
  options: ImportGeneratedModelOptions = {},
): Promise<ImportedGeneratedModel> => {
  const blob = new Blob([result.glb], { type: 'model/gltf-binary' });
  const source = URL.createObjectURL(blob);

  const baseName = displayNameFor(result, options);

  let imported;
  try {
    imported = await buildSceneObjectsFromGltf({ source, name: baseName, sourceType: 'upload' });
  } catch (error) {
    URL.revokeObjectURL(source);
    throw error;
  }

  let stats = result.metadata.stats;
  if (!stats || stats.polycount === 0) {
    try {
      stats = await computeGltfStats(source);
    } catch {
      /* mantem stats do provider */
    }
  }

  const rootIndex = imported.objects.findIndex((obj) => obj.id === imported.rootId);
  const desiredPosition = options.desiredPosition ?? [0, 0, 0];

  const patchedObjects: SceneObjectInput[] = imported.objects.map((obj, index) => {
    if (index === rootIndex) {
      return {
        ...obj,
        position: desiredPosition,
        metadata: {
          ...(obj.metadata ?? {}),
          imageTo3D: {
            origin: 'Image to 3D',
            providerId: result.metadata.providerId,
            modelType: result.metadata.modelType,
            style: result.metadata.style,
            quality: result.metadata.quality,
            createdAt: result.metadata.createdAt,
            stats,
            imageSlots: result.metadata.imageSlots,
            providerName: result.metadata.providerName,
            providerNotes: result.metadata.providerNotes,
          },
          generatedDisplayName: result.displayName,
          generatedAt: result.metadata.createdAt,
          sourceSlotCount: result.metadata.imageSlots.length,
        },
      };
    }
    return obj;
  });

  const generatedMetadata: GeneratedModelMetadata = {
    imageTo3D: {
      ...result.metadata,
      stats,
    },
    generatedDisplayName: result.displayName,
    generatedAt: result.metadata.createdAt,
    sourceSlotCount: result.metadata.imageSlots.length,
  };

  return {
    rootId: imported.rootId,
    objects: patchedObjects,
    materials: imported.materials as ImportedMaterialDraft[],
    metadata: generatedMetadata,
    stats,
  };
};

export const centerPivotOfObject = (objects: SceneObjectInput[], rootId: string) => {
  const root = objects.find((obj) => obj.id === rootId);
  if (!root) return objects;
  return objects.map((obj) =>
    obj.id === rootId ? { ...obj, position: [0, 0, 0] as [number, number, number] } : obj,
  );
};

export const normalizeScaleOfObject = (
  objects: SceneObjectInput[],
  rootId: string,
  targetHeight = 2,
) => {
  const root = objects.find((obj) => obj.id === rootId);
  if (!root) return objects;
  const scale = root.scale?.[1] ?? 1;
  if (!scale) return objects;
  const factor = targetHeight / (scale * 2);
  if (!Number.isFinite(factor) || factor <= 0) return objects;
  return objects.map((obj) =>
    obj.id === rootId
      ? {
          ...obj,
          scale: [factor, factor, factor] as [number, number, number],
        }
      : obj,
  );
};

export const recomputeStatsForRoot = async (
  source: string | undefined,
): Promise<GeneratedModelStats | null> => {
  if (!source) return null;
  try {
    return await computeGltfStats(source);
  } catch {
    return null;
  }
};

export const generateThumbnailFromObject = (
  object: THREE.Object3D,
  size = 128,
): string | null => {
  try {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const sizeVec = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z) || 1;
    const fitDist = (maxDim / 2) / Math.tan((Math.PI / 180) * 22.5);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(size, size, false);
    renderer.setPixelRatio(1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(center.x + fitDist * 0.6, center.y + fitDist * 0.4, center.z + fitDist);
    camera.lookAt(center);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(1, 2, 1.5);
    scene.add(ambient, dir);

    const clone = object.clone(true);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    scene.add(clone);

    renderer.render(scene, camera);
    const dataUrl = canvas.toDataURL('image/png');
    renderer.dispose();
    return dataUrl;
  } catch {
    return null;
  }
};

export const formatPolycount = (count: number) => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M tris`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k tris`;
  return `${count} tris`;
};

export const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
