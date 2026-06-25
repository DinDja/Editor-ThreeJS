'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import MeshEditOverlay from './MeshEditOverlay';
import DrawPolygonOverlay from './DrawPolygonOverlay';
import KnifeOverlay from './KnifeOverlay';
import Draw3DOverlay from './Draw3DOverlay';
import TransformGizmo from './TransformGizmo';
import { installMeshBVH, mergePrimitiveGeometry } from '@/lib/geometryOps';
import { editableMeshFromBufferGeometry, editableMeshFromObject3D, editableMeshToBufferGeometry, grabMeshVertices, sculptMesh } from '@/lib/meshOps';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { useContextMenu } from '@/store/contextMenuStore';
import ContextMenu from './ContextMenu';
import type { EditableMesh, EditorMaterial, LightConfig, PointerType, ReferenceImage, SceneObject, ViewportDisplayMode, SvgConfig, Text3DConfig } from '@/store/types';
import { buildSceneTree, getSelectionTargetId, type SceneTreeNode } from '@/store/sceneTree';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { EffectAsset } from '@/lib/effects';
import { imageToExtrudedMesh } from '@/lib/imageTo3DMesh';
import { BehaviorEngine } from '@/lib/behaviors';
import { ScriptEngine } from '@/lib/scriptEngine';
import PhysicsRuntime, { PhysicsColliderDebug } from './PhysicsRuntime';
import { usePhysicsStore } from '@/store/physicsStore';

/* Track right-click drag to suppress context menu during orbit/pan */
let _rightClickDragged = false;

type Canvas3DProps = {
  sceneRootRef: MutableRefObject<THREE.Group | null>;
};

type ObjectRefRegistry = (uuid: string, object: THREE.Object3D | null) => void;

const EMPTY_TEXTURE_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/luz5SAAAAABJRU5ErkJggg==';

type MaterialTextureSet = {
  map: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  roughnessMap: THREE.Texture | null;
  displacementMap: THREE.Texture | null;
};

const EMPTY_TEXTURE_SET: MaterialTextureSet = {
  map: null,
  normalMap: null,
  roughnessMap: null,
  displacementMap: null,
};

const hasTextureSet = (textureSet: MaterialTextureSet) =>
  Boolean(textureSet.map || textureSet.normalMap || textureSet.roughnessMap || textureSet.displacementMap);

const materialTextureKey = (material: EditorMaterial) =>
  [
    material.textureUrl ?? 'no-diffuse',
    material.normalMapUrl ?? 'no-normal',
    material.roughnessMapUrl ?? 'no-roughness',
    material.displacementMapUrl ?? 'no-displacement',
    material.textureRepeatX,
    material.textureRepeatY,
    material.textureOffsetX,
    material.textureOffsetY,
    material.textureRotation,
  ].join('|');

const TEXTURE_SLOTS = [
  ['map', 'textureUrl', THREE.SRGBColorSpace],
  ['normalMap', 'normalMapUrl', THREE.NoColorSpace],
  ['roughnessMap', 'roughnessMapUrl', THREE.NoColorSpace],
  ['displacementMap', 'displacementMapUrl', THREE.NoColorSpace],
] as const satisfies ReadonlyArray<readonly [keyof MaterialTextureSet, keyof EditorMaterial, THREE.ColorSpace]>;

const configureTexture = (source: THREE.Texture, material: EditorMaterial, colorSpace: THREE.ColorSpace, gl: THREE.WebGLRenderer) => {
  const nextTexture = source.clone();
  nextTexture.image = source.image;
  nextTexture.colorSpace = colorSpace;
  nextTexture.wrapS = THREE.RepeatWrapping;
  nextTexture.wrapT = THREE.RepeatWrapping;
  nextTexture.repeat.set(material.textureRepeatX, material.textureRepeatY);
  nextTexture.offset.set(material.textureOffsetX, material.textureOffsetY);
  nextTexture.center.set(0.5, 0.5);
  nextTexture.rotation = material.textureRotation;
  nextTexture.matrixAutoUpdate = true;
  nextTexture.updateMatrix();
  nextTexture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
  nextTexture.needsUpdate = true;
  return nextTexture;
};

const useMaterialTextureSets = (materials: EditorMaterial[]) => {
  const gl = useThree((state) => state.gl);
  const requests = useMemo(
    () =>
      materials.flatMap((material) =>
        TEXTURE_SLOTS.map(([slot, urlKey, colorSpace]) => ({
          material,
          slot,
          url: material[urlKey] as string | null,
          colorSpace,
        })),
      ),
    [materials],
  );
  const requestUrls = useMemo(
    () => (requests.length > 0 ? requests.map((request) => request.url ?? EMPTY_TEXTURE_URL) : [EMPTY_TEXTURE_URL]),
    [requests],
  );
  const loadedTextures = useLoader(THREE.TextureLoader, requestUrls) as THREE.Texture[];

  const configuredTextures = useMemo(() => {
    const nextSets: Record<string, MaterialTextureSet> = {};

    requests.forEach((request, index) => {
      const nextSet = nextSets[request.material.uuid] ?? { ...EMPTY_TEXTURE_SET };
      nextSets[request.material.uuid] = nextSet;

      if (!request.url) return;
      nextSet[request.slot] = configureTexture(loadedTextures[index], request.material, request.colorSpace, gl);
    });

    return nextSets;
  }, [gl, loadedTextures, requests]);

  useEffect(
    () => () => {
      Object.values(configuredTextures).forEach((textureSet) => {
        Object.values(textureSet).forEach((texture) => texture?.dispose());
      });
    },
    [configuredTextures],
  );

  return configuredTextures;
};

const useMaterialTextures = (material: EditorMaterial) => {
  const materialList = useMemo(() => [material], [material]);
  const textureSets = useMaterialTextureSets(materialList);
  return textureSets[material.uuid] ?? EMPTY_TEXTURE_SET;
};

const getMaterialRenderColor = (editorMaterial: EditorMaterial, textureSet: MaterialTextureSet) =>
  textureSet.map ? '#ffffff' : editorMaterial.color;

const applyMaterialProps = (
  material: THREE.MeshStandardMaterial,
  editorMaterial: EditorMaterial,
  textureSet: MaterialTextureSet,
) => {
  material.color.set(getMaterialRenderColor(editorMaterial, textureSet));
  material.metalness = editorMaterial.metalness;
  material.roughness = editorMaterial.roughness;
  material.emissive.set(editorMaterial.emissive);
  material.emissiveIntensity = editorMaterial.emissiveIntensity;
  material.opacity = editorMaterial.opacity;
  material.transparent = editorMaterial.opacity < 1;
  material.depthWrite = editorMaterial.opacity >= 1;
  material.map = textureSet.map;
  material.normalMap = textureSet.normalMap;
  material.normalScale.set(1, 1);
  material.roughnessMap = textureSet.roughnessMap;
  material.displacementMap = textureSet.displacementMap;
  material.displacementScale = textureSet.displacementMap ? 0.015 : 0;
  material.side = THREE.DoubleSide;
  material.needsUpdate = true;
};

const applyViewportMaterialProps = (
  material: THREE.MeshStandardMaterial,
  editorMaterial: EditorMaterial,
  textureSet: MaterialTextureSet,
  displayMode: ViewportDisplayMode,
  flatShading = false,
) => {
  const textured = displayMode === 'textured';
  applyMaterialProps(material, editorMaterial, textured ? textureSet : EMPTY_TEXTURE_SET);

  material.wireframe = displayMode === 'wireframe';
  material.opacity = displayMode === 'wireframe' ? 1 : editorMaterial.opacity;
  material.transparent = displayMode === 'wireframe' ? false : editorMaterial.opacity < 1;
  material.depthWrite = material.opacity >= 1;
  material.flatShading = flatShading;

  if (!textured) {
    material.map = null;
    material.normalMap = null;
    material.roughnessMap = null;
    material.displacementMap = null;
    material.displacementScale = 0;
  }

  material.needsUpdate = true;
};

const cloneMaterialAsStandard = (source: THREE.Material | null | undefined) => {
  if (source instanceof THREE.MeshStandardMaterial) {
    return source.clone();
  }

  if (source instanceof THREE.MeshBasicMaterial || source instanceof THREE.MeshLambertMaterial || source instanceof THREE.MeshPhongMaterial) {
    return new THREE.MeshStandardMaterial({
      color: source.color.clone(),
      map: source.map ?? null,
    });
  }

  return new THREE.MeshStandardMaterial();
};

function ModelAsset({ object, material }: { object: SceneObject; material: EditorMaterial }) {
  const gltf = useGLTF(object.source ?? '');
  const textureSet = useMaterialTextures(material);
  const activeTool = useEditorStore((state) => state.activeTool);
  const viewportDisplayMode = useEditorStore((state) => state.viewportDisplayMode);
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  const updateObject = useSceneStore((state) => state.updateObject);
  const clone = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    if ((activeTool !== 'edit' && activeTool !== 'sculpt') || !selectedObjectIds.includes(object.uuid) || object.editableMesh) return;

    const editableMesh = editableMeshFromObject3D(clone);
    if (!editableMesh) return;

    updateObject(object.uuid, { editableMesh });
  }, [activeTool, clone, object.editableMesh, object.uuid, selectedObjectIds, updateObject]);

  useEffect(() => {
    const preserveSourceMaterial =
      viewportDisplayMode === 'textured' && !hasTextureSet(textureSet) && object.source?.startsWith('/api/assets/polyhaven/');
    const prepareMaterial = (sourceMaterial: THREE.Material | null | undefined) => {
      const nextMaterial = cloneMaterialAsStandard(sourceMaterial);

      if (preserveSourceMaterial) {
        nextMaterial.side = THREE.DoubleSide;
        nextMaterial.wireframe = false;
        nextMaterial.needsUpdate = true;
        return nextMaterial;
      }

      applyViewportMaterialProps(nextMaterial, material, textureSet, viewportDisplayMode);
      return nextMaterial;
    };

    clone.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      node.castShadow = true;
      node.receiveShadow = true;

      if (Array.isArray(node.material)) {
        node.material = node.material.map((sourceMaterial) => prepareMaterial(sourceMaterial));
        return;
      }

      node.material = prepareMaterial(node.material);
    });
  }, [clone, material, object.source, textureSet, viewportDisplayMode]);

  return <primitive object={clone} />;
}

const pathKey = (path: unknown) => (Array.isArray(path) ? path.join('/') : '');

const findObjectByPath = (root: THREE.Object3D, path: unknown) => {
  if (!Array.isArray(path)) return null;
  let current: THREE.Object3D | null = root;

  for (const index of path) {
    if (typeof index !== 'number' || !current?.children[index]) return null;
    current = current.children[index];
  }

  return current;
};

function GltfMeshAsset({ object, material }: { object: SceneObject; material: EditorMaterial }) {
  const source = typeof object.metadata.gltfSource === 'string' ? object.metadata.gltfSource : object.source;
  const gltf = useGLTF(source ?? '');
  const allMaterials = useMaterialStore((state) => state.materials);
  const activeTool = useEditorStore((state) => state.activeTool);
  const viewportDisplayMode = useEditorStore((state) => state.viewportDisplayMode);
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  const updateObject = useSceneStore((state) => state.updateObject);
  const materialIds = useMemo(() => object.materialIds?.length ? object.materialIds : [object.materialId], [object.materialId, object.materialIds]);
  const editorMaterials = useMemo(
    () => materialIds.map((materialId) => allMaterials[materialId] ?? (materialId === object.materialId ? material : null)).filter(Boolean) as EditorMaterial[],
    [allMaterials, material, materialIds, object.materialId],
  );
  const textureSets = useMaterialTextureSets(editorMaterials);
  const gltfPathKey = pathKey(object.metadata.gltfNodePath);
  const sourceNode = useMemo(
    () => findObjectByPath(gltf.scene, object.metadata.gltfNodePath),
    [gltf.scene, object.metadata.gltfNodePath, gltfPathKey],
  );
  const sourceMesh = sourceNode instanceof THREE.Mesh ? sourceNode : null;

  useEffect(() => {
    if ((activeTool !== 'edit' && activeTool !== 'sculpt') || !selectedObjectIds.includes(object.uuid) || object.editableMesh || !sourceMesh) return;

    const editableMesh = editableMeshFromBufferGeometry(sourceMesh.geometry);
    if (!editableMesh) return;

    updateObject(object.uuid, { editableMesh });
  }, [activeTool, object.editableMesh, object.uuid, selectedObjectIds, sourceMesh, updateObject]);

  const meshMaterials = useMemo(() => {
    if (!sourceMesh) return null;

    const sourceMaterials = Array.isArray(sourceMesh.material) ? sourceMesh.material : [sourceMesh.material];

    return sourceMaterials.map((sourceMaterial, index) => {
      const materialId = materialIds[index] ?? object.materialId;
      const editorMaterial = allMaterials[materialId] ?? material;
      const hasOverride = object.metadata.materialOverrides?.[materialId] === true;
      const nextMaterial = cloneMaterialAsStandard(sourceMaterial);

      if (!hasOverride && viewportDisplayMode === 'textured') {
        nextMaterial.side = THREE.DoubleSide;
        nextMaterial.wireframe = false;
        nextMaterial.needsUpdate = true;
        return nextMaterial;
      }

      applyViewportMaterialProps(nextMaterial, editorMaterial, textureSets[editorMaterial.uuid] ?? EMPTY_TEXTURE_SET, viewportDisplayMode);
      return nextMaterial;
    });
  }, [allMaterials, material, materialIds, object.materialId, object.metadata.materialOverrides, sourceMesh, textureSets, viewportDisplayMode]);

  useEffect(
    () => () => {
      meshMaterials?.forEach((item) => item.dispose());
    },
    [meshMaterials],
  );

  if (!sourceMesh) return null;

  return (
    <mesh
      geometry={sourceMesh.geometry}
      material={meshMaterials && meshMaterials.length > 1 ? meshMaterials : meshMaterials?.[0]}
      castShadow
      receiveShadow
    />
  );
}

function GltfNodePrimitiveAsset({ object }: { object: SceneObject }) {
  const source = typeof object.metadata.gltfSource === 'string' ? object.metadata.gltfSource : object.source;
  const gltf = useGLTF(source ?? '');
  const gltfPathKey = pathKey(object.metadata.gltfNodePath);
  const sourceNode = useMemo(
    () => findObjectByPath(gltf.scene, object.metadata.gltfNodePath),
    [gltf.scene, object.metadata.gltfNodePath, gltfPathKey],
  );
  const clone = useMemo(() => {
    if (!sourceNode) return null;
    const next = sourceNode.clone(false);
    next.position.set(0, 0, 0);
    next.rotation.set(0, 0, 0);
    next.scale.set(1, 1, 1);
    next.updateMatrix();
    return next;
  }, [sourceNode]);

  if (!clone) return null;
  return <primitive object={clone} />;
}

function EditableMeshAsset({ object, material }: { object: SceneObject; material: EditorMaterial }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const allMaterials = useMaterialStore((state) => state.materials);
  const activeTool = useEditorStore((state) => state.activeTool);
  const viewportDisplayMode = useEditorStore((state) => state.viewportDisplayMode);
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  const sculptMode = useEditorStore((state) => state.sculptMode);
  const sculptFalloff = useEditorStore((state) => state.sculptFalloff);
  const sculptSymmetryX = useEditorStore((state) => state.sculptSymmetryX);
  const sculptFrontFacesOnly = useEditorStore((state) => state.sculptFrontFacesOnly);
  const sculptAccumulate = useEditorStore((state) => state.sculptAccumulate);
  const sculptSpacing = useEditorStore((state) => state.sculptSpacing);
  const sculptRadius = useEditorStore((state) => state.sculptRadius);
  const sculptStrength = useEditorStore((state) => state.sculptStrength);
  const sculptPressureStrength = useEditorStore((state) => state.sculptPressureStrength);
  const sculptPressureRadius = useEditorStore((state) => state.sculptPressureRadius);
  const sculptPenSmoothing = useEditorStore((state) => state.sculptPenSmoothing);
  const setSculptPointerType = useEditorStore((state) => state.setSculptPointerType);
  const setSculptBrushPreview = useEditorStore((state) => state.setSculptBrushPreview);
  const clearSculptBrushPreview = useEditorStore((state) => state.clearSculptBrushPreview);
  const camera = useThree((state) => state.camera);
  const updateObject = useSceneStore((state) => state.updateObject);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const sculptingRef = useRef(false);
  const strokeMeshRef = useRef<EditableMesh | null>(null);
  const strokeGrabStartMeshRef = useRef<EditableMesh | null>(null);
  const strokeGrabStartPointRef = useRef<THREE.Vector3 | null>(null);
  const strokeLastPointRef = useRef<THREE.Vector3 | null>(null);
  const strokePaintedVerticesRef = useRef<Set<number>>(new Set());
  const strokeSmoothBufferRef = useRef<THREE.Vector3[]>([]);
  const strokePressureRef = useRef(1);
  const strokeLastScreenRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const strokeSpeedRef = useRef(0);
  const strokeClockRef = useRef({ last: 0 });
  const tickClock = () => {
    const now = Date.now();
    strokeClockRef.current.last = now;
    return now;
  };
  const objectMaterials = useMemo(() => {
    const baseMaterial = allMaterials[object.materialId] ?? material;
    const extraMaterials = Object.values(allMaterials)
      .filter((item) => item.objectId === object.uuid && item.uuid !== baseMaterial.uuid)
      .sort((a, b) => a.name.localeCompare(b.name) || a.uuid.localeCompare(b.uuid));

    return [baseMaterial, ...extraMaterials];
  }, [allMaterials, material, object.materialId, object.uuid]);
  const textureSets = useMaterialTextureSets(objectMaterials);
  const textureSet = textureSets[material.uuid] ?? EMPTY_TEXTURE_SET;
  const materialIdsKey = objectMaterials.map((item) => item.uuid).join('|');
  const materialIds = useMemo(() => materialIdsKey.split('|').filter(Boolean), [materialIdsKey]);
  const geometry = useMemo(
    () => (object.editableMesh ? editableMeshToBufferGeometry(object.editableMesh, materialIds) : null),
    [materialIds, object.editableMesh],
  );
  const meshMaterials = useMemo(() => {
    if (viewportDisplayMode !== 'textured' || objectMaterials.length < 2) return null;

    return objectMaterials.map((editorMaterial, index) => {
      const nextMaterial = new THREE.MeshStandardMaterial();
      applyViewportMaterialProps(
        nextMaterial,
        editorMaterial,
        textureSets[editorMaterial.uuid] ?? EMPTY_TEXTURE_SET,
        viewportDisplayMode,
        object.metadata.flatShading === true,
      );
      return nextMaterial;
    });
  }, [object.metadata.flatShading, objectMaterials, textureSets, viewportDisplayMode]);

  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(
    () => () => {
      meshMaterials?.forEach((item) => item.dispose());
    },
    [meshMaterials],
  );

  if (!geometry) return null;

  const getSmoothedPoint = (rawPoint: THREE.Vector3) => {
    const smoothing = sculptPenSmoothing;
    if (smoothing <= 0) return rawPoint;

    const buffer = strokeSmoothBufferRef.current;
    buffer.push(rawPoint.clone());
    if (buffer.length > 8) buffer.shift();
    if (buffer.length < 2) return rawPoint;

    const weightSum = buffer.reduce((sum, _, i) => sum + Math.pow(1 - smoothing, buffer.length - 1 - i), 0);
    const smoothed = new THREE.Vector3();
    buffer.forEach((p, i) => {
      const weight = Math.pow(1 - smoothing, buffer.length - 1 - i) / weightSum;
      smoothed.add(p.clone().multiplyScalar(weight));
    });
    return smoothed;
  };

  const updateBrushPreview = (event: ThreeEvent<PointerEvent>) => {
    if (activeTool !== 'sculpt' || !selectedObjectIds.includes(object.uuid) || !meshRef.current || !event.face) return null;

    const localPoint = meshRef.current.worldToLocal(event.point.clone());
    const localNormal = event.face.normal.clone().normalize();
    setSculptBrushPreview(object.uuid, [localPoint.x, localPoint.y, localPoint.z], [localNormal.x, localNormal.y, localNormal.z]);
    return { localPoint, localNormal };
  };

  const applySculptStroke = (event: ThreeEvent<PointerEvent>) => {
    if (activeTool !== 'sculpt' || !selectedObjectIds.includes(object.uuid) || !meshRef.current || !event.face) return;

    const sourceMesh = strokeMeshRef.current ?? object.editableMesh;
    if (!sourceMesh) return;

    event.stopPropagation();
    const preview = updateBrushPreview(event);
    if (!preview) return;

    const { localPoint, localNormal } = preview;
    const nativeEvent = event.nativeEvent as PointerEvent;
    const pointerType = nativeEvent.pointerType;
    const hasRealPressure = pointerType === 'pen' || pointerType === 'touch';
    const rawPressure = hasRealPressure ? nativeEvent.pressure || 0.5 : 1;

    strokePressureRef.current = rawPressure;

    let effectivePressure = rawPressure > 0 ? rawPressure : 1;

    if (!hasRealPressure && (sculptPressureStrength || sculptPressureRadius)) {
      const now = tickClock();
      const last = strokeLastScreenRef.current;
      const sx = nativeEvent.clientX;
      const sy = nativeEvent.clientY;
      if (last) {
        const dx = sx - last.x;
        const dy = sy - last.y;
        const dt = Math.max(1, now - last.t);
        const speed = Math.sqrt(dx * dx + dy * dy) / dt;
        strokeSpeedRef.current = strokeSpeedRef.current * 0.6 + speed * 0.4;
      }
      strokeLastScreenRef.current = { x: sx, y: sy, t: now };

      const speedFactor = Math.max(0.35, Math.min(1, 1 - strokeSpeedRef.current * 0.12));
      effectivePressure = speedFactor;
    }

    const pressureStrength = sculptPressureStrength ? effectivePressure : 1;
    const pressureRadius = sculptPressureRadius ? (0.3 + effectivePressure * 0.7) : 1;

    const smoothedPoint = getSmoothedPoint(localPoint);

    if (strokeLastPointRef.current) {
      const spacingDistance = (sculptRadius * pressureRadius) * sculptSpacing * (sculptPressureRadius ? (0.5 + effectivePressure * 0.5) : 1);
      if (sculptMode !== 'grab' && smoothedPoint.distanceTo(strokeLastPointRef.current) < spacingDistance) return;
    }

    strokeLastPointRef.current = smoothedPoint.clone();
    const localCamera = meshRef.current.worldToLocal(camera.position.clone());
    const localViewDirection = localCamera.sub(smoothedPoint).normalize();
    const effectiveStrength = sculptStrength * pressureStrength;
    const effectiveRadius = sculptRadius * pressureRadius;
    const nextMesh =
      sculptMode === 'grab'
        ? (() => {
            if (!strokeGrabStartPointRef.current) {
              strokeGrabStartPointRef.current = smoothedPoint.clone();
              strokeGrabStartMeshRef.current = sourceMesh;
              return sourceMesh;
            }

            return grabMeshVertices({
              mesh: strokeGrabStartMeshRef.current ?? sourceMesh,
              center: strokeGrabStartPointRef.current,
              delta: smoothedPoint.clone().sub(strokeGrabStartPointRef.current),
              radius: effectiveRadius,
              falloff: sculptFalloff,
              symmetryX: sculptSymmetryX,
              frontFacesOnly: sculptFrontFacesOnly,
              viewDirection: localViewDirection,
            });
          })()
        : sculptMesh({
            mesh: sourceMesh,
            center: smoothedPoint,
            normal: localNormal,
            radius: effectiveRadius,
            strength: effectiveStrength,
            mode: sculptMode,
            falloff: sculptFalloff,
            symmetryX: sculptSymmetryX,
            frontFacesOnly: sculptFrontFacesOnly,
            viewDirection: localViewDirection,
            accumulate: sculptAccumulate,
            paintedVertices: strokePaintedVerticesRef.current,
          });

    if (nextMesh === sourceMesh && sculptMode === 'grab') return;

    strokeMeshRef.current = nextMesh;
    updateObject(object.uuid, { editableMesh: nextMesh });
  };

  const startSculpt = (event: ThreeEvent<PointerEvent>) => {
    if (activeTool !== 'sculpt' || !selectedObjectIds.includes(object.uuid) || !object.editableMesh) return;

    event.stopPropagation();
    if (event.nativeEvent.target instanceof Element) {
      event.nativeEvent.target.setPointerCapture?.(event.pointerId);
    }

    const pointerType = event.nativeEvent.pointerType as PointerType;
    setSculptPointerType(pointerType);

    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (e.pointerId === event.pointerId) {
        endSculpt();
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointercancel', handleGlobalPointerUp);
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);

    pushSnapshot();
    sculptingRef.current = true;
    strokeMeshRef.current = object.editableMesh;
    strokeGrabStartMeshRef.current = object.editableMesh;
    strokeGrabStartPointRef.current = null;
    strokeLastPointRef.current = null;
    strokePaintedVerticesRef.current = new Set();
    strokeSmoothBufferRef.current = [];
    strokePressureRef.current = event.nativeEvent.pressure || 0.5;
    strokeLastScreenRef.current = {
      x: event.nativeEvent.clientX,
      y: event.nativeEvent.clientY,
      t: tickClock(),
    };
    strokeSpeedRef.current = 0;
    applySculptStroke(event);
  };

  const updateSculpt = (event: ThreeEvent<PointerEvent>) => {
    if (!sculptingRef.current) {
      updateBrushPreview(event);
      return;
    }

    applySculptStroke(event);
  };

  const endSculpt = () => {
    sculptingRef.current = false;
    strokeMeshRef.current = null;
    strokeGrabStartMeshRef.current = null;
    strokeGrabStartPointRef.current = null;
    strokeLastPointRef.current = null;
    strokePaintedVerticesRef.current.clear();
    strokeSmoothBufferRef.current = [];
    strokePressureRef.current = 1;
    strokeLastScreenRef.current = null;
    strokeSpeedRef.current = 0;
  };

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={meshMaterials ?? undefined}
      castShadow
      receiveShadow
      onPointerDown={startSculpt}
      onPointerMove={updateSculpt}
      onPointerUp={endSculpt}
      onPointerLeave={(event) => {
        if (!sculptingRef.current) {
          clearSculptBrushPreview();
        }
      }}
      onPointerEnter={(event) => {
        setSculptPointerType(event.nativeEvent.pointerType as PointerType);
      }}
    >
      {!meshMaterials && (
        <meshStandardMaterial
          key={`${viewportDisplayMode}-${materialTextureKey(material)}-${object.metadata.flatShading === true}`}
          color={getMaterialRenderColor(material, textureSet)}
          metalness={material.metalness}
          roughness={material.roughness}
          emissive={material.emissive}
          emissiveIntensity={material.emissiveIntensity}
          opacity={viewportDisplayMode === 'wireframe' ? 1 : material.opacity}
          transparent={viewportDisplayMode === 'wireframe' ? false : material.opacity < 1}
          depthWrite={viewportDisplayMode === 'wireframe' || material.opacity >= 1}
          map={viewportDisplayMode === 'textured' ? textureSet.map : null}
          normalMap={viewportDisplayMode === 'textured' ? textureSet.normalMap : null}
          roughnessMap={viewportDisplayMode === 'textured' ? textureSet.roughnessMap : null}
          displacementMap={viewportDisplayMode === 'textured' ? textureSet.displacementMap : null}
          displacementScale={viewportDisplayMode === 'textured' && textureSet.displacementMap ? 0.015 : 0}
          side={THREE.DoubleSide}
          wireframe={viewportDisplayMode === 'wireframe'}
          flatShading={object.metadata.flatShading === true}
        />
      )}
    </mesh>
  );
}

function PrimitiveAsset({ object, material }: { object: SceneObject; material: EditorMaterial }) {
  const textureSet = useMaterialTextures(material);
  const viewportDisplayMode = useEditorStore((state) => state.viewportDisplayMode);
  const primitive = object.primitive ?? 'box';
  const geometry = mergePrimitiveGeometry(primitive, object.geometry);
  const geometryKey = JSON.stringify([primitive, geometry]);

  return (
    <mesh castShadow receiveShadow>
      {primitive === 'sphere' && (
        <sphereGeometry key={geometryKey} args={[geometry.radius, geometry.radialSegments, geometry.heightSegments]} />
      )}
      {primitive === 'cylinder' && (
        <cylinderGeometry
          key={geometryKey}
          args={[geometry.radiusTop, geometry.radiusBottom, geometry.height, geometry.radialSegments, geometry.heightSegments]}
        />
      )}
      {primitive === 'cone' && (
        <coneGeometry key={geometryKey} args={[geometry.radiusBottom, geometry.height, geometry.radialSegments, geometry.heightSegments]} />
      )}
      {primitive === 'torus' && (
        <torusGeometry key={geometryKey} args={[geometry.radius, geometry.tube, geometry.radialSegments, geometry.tubularSegments]} />
      )}
      {primitive === 'plane' && (
        <planeGeometry key={geometryKey} args={[geometry.width, geometry.height, geometry.widthSegments, geometry.heightSegments]} />
      )}
      {primitive === 'box' && (
        <boxGeometry key={geometryKey} args={[geometry.width, geometry.height, geometry.depth, geometry.widthSegments, geometry.heightSegments, geometry.depthSegments]} />
      )}
      <meshStandardMaterial
        key={`${viewportDisplayMode}-${materialTextureKey(material)}-${object.metadata.flatShading === true}`}
        color={getMaterialRenderColor(material, textureSet)}
        metalness={material.metalness}
        roughness={material.roughness}
        emissive={material.emissive}
        emissiveIntensity={material.emissiveIntensity}
        opacity={viewportDisplayMode === 'wireframe' ? 1 : material.opacity}
        transparent={viewportDisplayMode === 'wireframe' ? false : material.opacity < 1}
        depthWrite={viewportDisplayMode === 'wireframe' || material.opacity >= 1}
        map={viewportDisplayMode === 'textured' ? textureSet.map : null}
        normalMap={viewportDisplayMode === 'textured' ? textureSet.normalMap : null}
        roughnessMap={viewportDisplayMode === 'textured' ? textureSet.roughnessMap : null}
        displacementMap={viewportDisplayMode === 'textured' ? textureSet.displacementMap : null}
        displacementScale={viewportDisplayMode === 'textured' && textureSet.displacementMap ? 0.015 : 0}
        side={THREE.DoubleSide}
        wireframe={viewportDisplayMode === 'wireframe'}
        flatShading={object.metadata.flatShading === true}
        />
    </mesh>
  );
}

function useGlowTexture() {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.15, 'rgba(255,255,255,0.8)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(canvas);
    t.needsUpdate = true;
    return t;
  }, []);
  return texture;
}

function LightSprite({ color, size }: { color: THREE.Color; size: number }) {
  const texture = useGlowTexture();
  const hex = useMemo(() => color.getStyle(), [color]);
  return texture ? (
    <sprite scale={[size, size, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} color={hex} opacity={0.7} />
    </sprite>
  ) : null;
}

function SpotHelper({ color, angle }: { color: THREE.Color; angle: number }) {
  const len = 2.0;
  const rad = Math.tan(angle) * len;
  const beamLen = 8.0;
  const beamRad = Math.tan(angle) * beamLen;
  const coneGeo = useMemo(() => new THREE.ConeGeometry(rad, len, 24, 1, true), [rad, len]);
  const ringGeo = useMemo(() => new THREE.RingGeometry(rad * 0.15, rad, 32), [rad]);
  const coneEdges = useMemo(() => new THREE.EdgesGeometry(coneGeo), [coneGeo]);
  const ringEdges = useMemo(() => new THREE.EdgesGeometry(ringGeo), [ringGeo]);
  return (
    <group userData={{ isHelper: true }}>
      <lineSegments geometry={coneEdges}>
        <lineBasicMaterial color={color} transparent opacity={0.7} depthWrite={false} />
      </lineSegments>
      <lineSegments geometry={ringEdges} position={[0, 0, -len]}>
        <lineBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} />
      </lineSegments>
      <mesh position={[0, 0, -beamLen / 2]}>
        <coneGeometry args={[beamRad, beamLen, 32, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <LightSprite color={color} size={0.8} />
    </group>
  );
}

function PointHelper({ color }: { color: THREE.Color }) {
  const geo = useMemo(() => new THREE.OctahedronGeometry(0.8, 0), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  return (
    <group userData={{ isHelper: true }}>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={color} transparent opacity={0.7} depthWrite={false} />
      </lineSegments>
      <LightSprite color={color} size={0.8} />
    </group>
  );
}

function PointRangeHelper({ color, distance }: { color: THREE.Color; distance: number }) {
  const r = Math.max(0.5, distance);
  const geo = useMemo(() => new THREE.SphereGeometry(r, 20, 14), [r]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  return (
    <group userData={{ isHelper: true }}>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={color} transparent opacity={0.15} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

function DirectionalHelper({ color }: { color: THREE.Color }) {
  const ringGeo = useMemo(() => new THREE.RingGeometry(0.5, 1.0, 32), []);
  const ringEdges = useMemo(() => new THREE.EdgesGeometry(ringGeo), [ringGeo]);
  return (
    <group userData={{ isHelper: true }}>
      <lineSegments geometry={ringEdges}>
        <lineBasicMaterial color={color} transparent opacity={0.7} depthWrite={false} />
      </lineSegments>
      {[0, 1, 2].map((i) => (
        <lineSegments key={i} position={[0, 0, -0.5 - i * 0.35]}>
          <edgesGeometry>
            <ringGeometry args={[0.05, 0.3, 10]} />
          </edgesGeometry>
          <lineBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
        </lineSegments>
      ))}
      <LightSprite color={color} size={0.8} />
    </group>
  );
}

function AmbientHelper({ color }: { color: THREE.Color }) {
  const geo = useMemo(() => new THREE.SphereGeometry(0.8, 20, 14), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  return (
    <group userData={{ isHelper: true }}>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
      </lineSegments>
      <LightSprite color={color} size={0.6} />
    </group>
  );
}

function LightAsset({ object }: { object: SceneObject }) {
  const config = object.lightConfig!;
  const [targetRef] = useState(() => new THREE.Object3D());
  const dirRef = useRef<THREE.Group>(null);

  useEffect(() => {
    targetRef.position.set(config.target[0], config.target[1], config.target[2]);
  }, [config.target, targetRef]);

  const memoColor = useMemo(() => new THREE.Color(config.color), [config.color]);

  const dir = useMemo(() => {
    const d = new THREE.Vector3(config.target[0], config.target[1], config.target[2]);
    if (d.lengthSq() < 0.0001) d.set(0, 0, -1);
    return d.normalize();
  }, [config.target]);

  useFrame(() => {
    if (!dirRef.current) return;
    if (config.kind === 'spot' || config.kind === 'directional') {
      dirRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    }
  });

  const commonProps = {
    color: config.color,
    intensity: config.intensity,
    distance: config.distance,
    decay: config.decay,
    castShadow: config.castShadow,
    'shadow-bias': config.shadowBias,
    'shadow-radius': config.shadowRadius,
  };

  switch (config.kind) {
    case 'spot':
      return (
        <group>
          <spotLight position={[0, 0, 0]} angle={config.angle} penumbra={config.penumbra} target={targetRef} {...commonProps} />
          <primitive object={targetRef} />
          <group ref={dirRef}>
            <SpotHelper color={memoColor} angle={config.angle} />
          </group>
        </group>
      );
    case 'point':
      return (
        <group>
          <pointLight position={[0, 0, 0]} {...commonProps} />
          <PointHelper color={memoColor} />
          <PointRangeHelper color={memoColor} distance={config.distance} />
        </group>
      );
    case 'directional':
      return (
        <group>
          <directionalLight position={[0, 0, 0]} target={targetRef} {...commonProps} />
          <primitive object={targetRef} />
          <group ref={dirRef}>
            <DirectionalHelper color={memoColor} />
          </group>
        </group>
      );
    case 'ambient':
      return (
        <group>
          <ambientLight intensity={config.intensity} color={config.color} />
          <AmbientHelper color={memoColor} />
        </group>
      );
    default:
      return <PointHelper color={memoColor} />;
  }
}

function ObjectNode({
  node,
  registerObjectRef,
  allObjects,
  layerVisibilityMap,
  layerLockMap,
}: {
  node: SceneTreeNode;
  registerObjectRef: ObjectRefRegistry;
  allObjects: SceneObject[];
  layerVisibilityMap: Map<string, boolean>;
  layerLockMap: Map<string, boolean>;
}) {
  const object = node.object;
  const groupRef = useRef<THREE.Group>(null);
  const materials = useMaterialStore((state) => state.materials);
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const objectSelectionMode = useEditorStore((state) => state.objectSelectionMode);
  const viewportDisplayMode = useEditorStore((state) => state.viewportDisplayMode);
  const simulationMode = usePhysicsStore((state) => state.mode);
  const showPrimitiveShape = viewportDisplayMode === 'primitive' && object.kind === 'primitive';
  const showContextMenu = useContextMenu((state) => state.show);
  const material = materials[object.materialId];
  const layerLocked = layerLockMap.get(object.layerId) ?? false;
  const layerVisible = layerVisibilityMap.get(object.layerId) !== false;
  const locked = object.locked || layerLocked;
  const isSelected = selectedObjectIds.includes(object.uuid);

  useEffect(() => {
    registerObjectRef(object.uuid, groupRef.current);
    return () => registerObjectRef(object.uuid, null);
  }, [object.uuid, registerObjectRef]);

  if (!layerVisible) return null;
  if (!material && object.kind !== 'svg') return null;
  if (object.kind === 'model' && !object.source) return null;

  return (
    <group
      ref={groupRef}
      name={object.name}
      userData={{ sceneObjectId: object.uuid, physics: object.metadata.physics }}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      visible={object.visible}
      onClick={(event) => {
        if (locked) return;
        event.stopPropagation();
        const targetId = getSelectionTargetId(allObjects, object.uuid, objectSelectionMode);
        if (targetId) setSelectedObject(targetId, event.nativeEvent.shiftKey || event.nativeEvent.ctrlKey);
      }}
      onContextMenu={(event) => {
        if (locked || _rightClickDragged) return;
        event.stopPropagation();
        _rightClickDragged = false;
        const e = event.nativeEvent as MouseEvent;
        showContextMenu(e.clientX, e.clientY, object.uuid);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
      }}
    >
      {object.effect ? (
        <EffectAsset effect={object.effect} />
      ) : object.lightConfig ? (
        <LightAsset object={object} />
      ) : (object.type === 'Light' || object.type === 'Camera') && object.metadata.gltfSource ? (
        <GltfNodePrimitiveAsset object={object} />
      ) : object.kind === 'svg' ? (
        <Svg3DAsset object={object} material={material} />
      ) : object.kind === 'text' ? (
        <Text3DAsset object={object} material={material} />
      ) : showPrimitiveShape ? (
        <PrimitiveAsset object={object} material={material} />
      ) : object.editableMesh ? (
        <EditableMeshAsset object={object} material={material} />
      ) : object.kind === 'mesh' && object.metadata.gltfSource ? (
        <GltfMeshAsset object={object} material={material} />
      ) : object.kind === 'model' ? (
        <ModelAsset object={object} material={material} />
      ) : object.type === 'Mesh' ? (
        <PrimitiveAsset object={object} material={material} />
      ) : null}
      {!object.effect && !object.lightConfig && object.type === 'Mesh' && <MeshEditOverlay object={object} />}
      <PhysicsColliderDebug object={object} rootRef={groupRef} />
      {simulationMode === 'edit' && !object.lightConfig && <BehaviorEngine object={object} groupRef={groupRef} />}
      {simulationMode === 'edit' && !object.lightConfig && <ScriptEngine object={object} groupRef={groupRef} />}
      {node.children.map((child) => (
        <ObjectNode
          key={child.object.uuid}
          node={child}
          registerObjectRef={registerObjectRef}
          allObjects={allObjects}
          layerVisibilityMap={layerVisibilityMap}
          layerLockMap={layerLockMap}
        />
      ))}
    </group>
  );
}

function SelectionBox({ object }: { object: THREE.Object3D | null }) {
  const { scene } = useThree();
  const helperRef = useRef<THREE.BoxHelper | null>(null);

  useEffect(() => {
    if (!object) return;

    const helper = new THREE.BoxHelper(object, '#f59e0b');
    helperRef.current = helper;
    scene.add(helper);

    return () => {
      scene.remove(helper);
      helper.geometry.dispose();
      const material = helper.material;
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose());
      } else {
        material.dispose();
      }
      helperRef.current = null;
    };
  }, [object, scene]);

  useFrame(() => {
    helperRef.current?.update();
  });

  return null;
}

function CameraFramer({
  objectRefs,
}: {
  objectRefs: React.MutableRefObject<Map<string, THREE.Object3D>>;
}) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as
    | (THREE.EventDispatcher & { target?: THREE.Vector3; update?: () => void })
    | null;
  const frameRequestCount = useEditorStore((state) => state.frameRequestCount);
  const frameTargetObjectId = useEditorStore((state) => state.frameTargetObjectId);

  useEffect(() => {
    if (frameRequestCount === 0 || !frameTargetObjectId) return;

    let cancelled = false;
    const box = new THREE.Box3();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    const targetDir = new THREE.Vector3();

    const attemptFrame = (attempt: number) => {
      if (cancelled) return;
      const target = objectRefs.current.get(frameTargetObjectId);
      if (!target) {
        if (attempt < 20) {
          setTimeout(() => attemptFrame(attempt + 1), 80);
        }
        return;
      }

      box.setFromObject(target);
      if (box.isEmpty()) {
        box.setFromCenterAndSize(target.position, new THREE.Vector3(1, 1, 1));
      }
      box.getCenter(center);
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const fov = (camera as THREE.PerspectiveCamera).fov ?? 45;
      const fitDistance = (maxDim / 2) / Math.tan((Math.PI / 180) * (fov / 2));
      const distance = fitDistance * 1.4 + 0.5;

      targetDir.set(0.8, 0.55, 1).normalize();
      camera.position.set(
        center.x + targetDir.x * distance,
        center.y + targetDir.y * distance,
        center.z + targetDir.z * distance,
      );
      camera.near = Math.max(0.01, distance / 1000);
      camera.far = distance * 100 + 100;
      camera.updateProjectionMatrix();
      camera.lookAt(center);

      if (controls && 'target' in controls && controls.target) {
        controls.target.copy(center);
      }
      controls?.update?.();
    };

    attemptFrame(0);

    return () => {
      cancelled = true;
    };
  }, [camera, controls, frameRequestCount, frameTargetObjectId, objectRefs]);

  return null;
}

function ObjectLoading({ object }: { object: SceneObject }) {
  return (
    <Html position={object.position} center>
      <div className="rounded bg-neutral-950/80 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-neutral-300 shadow-lg">
        {object.name}
      </div>
    </Html>
  );
}

function GridHelper({ show }: { show: boolean }) {
  const { scene } = useThree();
  const gridRef = useRef<THREE.GridHelper | null>(null);

  useEffect(() => {
    if (show && !gridRef.current) {
      const grid = new THREE.GridHelper(20, 20, '#3dd6b5', '#30363d');
      grid.position.set(0, 0, 0);
      gridRef.current = grid;
      scene.add(grid);
    }

    if (!show && gridRef.current) {
      scene.remove(gridRef.current);
      gridRef.current.geometry.dispose();
      (gridRef.current.material as THREE.Material).dispose();
      gridRef.current = null;
    }

    return () => {
      if (gridRef.current) {
        scene.remove(gridRef.current);
        gridRef.current.geometry.dispose();
        (gridRef.current.material as THREE.Material).dispose();
        gridRef.current = null;
      }
    };
  }, [show, scene]);

  return null;
}

function ReferenceImagePlane({ refImg }: { refImg: ReferenceImage }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [error, setError] = useState(false);
  const textureRef = useRef<THREE.Texture | null>(null);
  const selectedReferenceId = useEditorStore((s) => s.selectedReferenceId);
  const setSelectedReference = useEditorStore((s) => s.setSelectedReference);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setTexture(null);
    const loader = new THREE.TextureLoader();
    loader.load(
      refImg.imageUrl,
      (tex) => {
        if (!cancelled) {
          textureRef.current = tex;
          setTexture(tex);
        }
      },
      undefined,
      () => {
        if (!cancelled) setError(true);
      },
    );
    return () => {
      cancelled = true;
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, [refImg.imageUrl]);

  if (!texture || error) return null;

  const img = texture.image as HTMLImageElement | null;
  const aspect = img ? img.width / img.height : 1;
  const scale: [number, number, number] = [refImg.scale[0] * aspect, refImg.scale[1], 1];

  return (
    <mesh
      position={refImg.position}
      rotation={refImg.rotation}
      scale={scale}
      onClick={(e) => { e.stopPropagation(); setSelectedReference(refImg.id); }}
    >
      <planeGeometry />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={refImg.opacity}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function Svg3DAsset({ object }: { object: SceneObject; material?: EditorMaterial }) {
  const [group, setGroup] = useState<THREE.Group | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const objectSource = object.source;
  const depth = object.svgConfig?.depth ?? 0.3;
  const bevelEnabled = object.svgConfig?.bevelEnabled ?? false;
  const bevelThickness = object.svgConfig?.bevelThickness ?? 0.05;
  const bevelSize = object.svgConfig?.bevelSize ?? 0.05;

  useEffect(() => {
    if (!objectSource) {
      setStatus('error');
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setGroup(null);

    const s = objectSource.trimStart();
    const isSvgSource =
      s.startsWith('<svg') || s.startsWith('<?xml') ||
      objectSource.startsWith('data:image/svg') ||
      /\.svg(\?|$)/i.test(objectSource);
    const isRasterSource =
      (objectSource.startsWith('data:image/') && !objectSource.startsWith('data:image/svg')) ||
      /\.(png|jpe?g|webp|gif|bmp)(\?|$)/i.test(objectSource);

    if (isSvgSource && !isRasterSource) {
      const loader = new SVGLoader();

      const svgTextPromise = objectSource.startsWith('data:')
        ? Promise.resolve().then(() => {
            const comma = objectSource.indexOf(',');
            const raw = objectSource.slice(comma + 1);
            if (objectSource.includes(';base64')) return decodeURIComponent(escape(atob(raw)));
            return decodeURIComponent(raw);
          })
        : fetch(objectSource).then((res) => res.text());

      svgTextPromise
        .then((svgText) => {
          if (cancelled) return null;
          const data = loader.parse(svgText);
          if (data.paths.length === 0) return null;

          const g = new THREE.Group();
          let meshCount = 0;

          for (const path of data.paths) {
            const shapes = SVGLoader.createShapes(path);
            for (const shape of shapes) {
              const geo = new THREE.ExtrudeGeometry(shape, {
                depth, bevelEnabled, bevelThickness, bevelSize, bevelSegments: 4,
              });
              const hex = path.color ? `#${path.color.getHexString()}` : '#cccccc';
              g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: hex, side: THREE.DoubleSide })));
              meshCount++;
            }
          }

          if (meshCount === 0) return null;
          const box = new THREE.Box3().setFromObject(g);
          g.position.sub(box.getCenter(new THREE.Vector3()));
          return g;
        })
        .then((g) => {
          if (cancelled) return;
          if (g) { setGroup(g); setStatus('ready'); }
          else { setStatus('error'); }
        })
        .catch(() => { if (!cancelled) buildFromImage(); });

      return () => { cancelled = true; };
    }

    buildFromImage();

    function buildFromImage() {
      imageToExtrudedMesh(objectSource!, {
        depth,
        bevelEnabled,
        bevelThickness,
        bevelSize,
        bevelSegments: 3,
        threshold: 30,
        simplifyEpsilon: 1.0,
        maxDimension: 400,
        cleanup: 1,
      })
        .then(({ geometry, texture }) => {
          if (cancelled) return;

          const mat = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            roughness: 0.5,
            metalness: 0.1,
          });

          const mesh = new THREE.Mesh(geometry, mat);

          const box = new THREE.Box3().setFromObject(mesh);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          mesh.position.sub(center);

          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            const scale = 2 / maxDim;
            mesh.scale.setScalar(scale);
          }

          const g = new THREE.Group();
          g.add(mesh);
          setGroup(g);
          setStatus('ready');
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('Image extrude error:', err);
          setStatus('error');
        });
    }

    return () => { cancelled = true; };
  }, [objectSource, depth, bevelEnabled, bevelThickness, bevelSize]);

  if (status === 'error') {
    return (
      <mesh>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#ff3333" wireframe />
      </mesh>
    );
  }

  if (!group) return null;
  return <primitive object={group} />;
}

function Text3DAsset({ object, material }: { object: SceneObject; material: EditorMaterial }) {
  const textureSet = useMaterialTextures(material);
  const viewportDisplayMode = useEditorStore((s) => s.viewportDisplayMode);
  const font = useLoader(FontLoader, '/fonts/helvetiker_regular.typeface.json');
  const text = object.textConfig?.text ?? '3D';
  const size = object.textConfig?.size ?? 1;
  const depth = object.textConfig?.depth ?? 0.3;
  const curveSegments = object.textConfig?.curveSegments ?? 8;
  const bevelEnabled = object.textConfig?.bevelEnabled ?? false;
  const bevelThickness = object.textConfig?.bevelThickness ?? 0.05;
  const bevelSize = object.textConfig?.bevelSize ?? 0.05;
  const bevelSegments = object.textConfig?.bevelSegments ?? 4;

  const geometry = useMemo(() => {
    const geo = new TextGeometry(text, {
      font,
      size,
      depth,
      curveSegments,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelSegments,
    });
    geo.computeBoundingBox();
    const b = geo.boundingBox;
    if (b) {
      const cx = (b.max.x - b.min.x) / 2;
      const cy = (b.max.y - b.min.y) / 2;
      const cz = (b.max.z - b.min.z) / 2;
      geo.translate(-(b.min.x + cx), -(b.min.y + cy), -(b.min.z + cz));
    }
    return geo;
  }, [font, text, size, depth, curveSegments, bevelEnabled, bevelThickness, bevelSize, bevelSegments]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        key={`${viewportDisplayMode}-${materialTextureKey(material)}`}
        color={getMaterialRenderColor(material, textureSet)}
        metalness={material.metalness}
        roughness={material.roughness}
        emissive={material.emissive}
        emissiveIntensity={material.emissiveIntensity}
        opacity={viewportDisplayMode === 'wireframe' ? 1 : material.opacity}
        transparent={viewportDisplayMode === 'wireframe' ? false : material.opacity < 1}
        depthWrite={viewportDisplayMode === 'wireframe' || material.opacity >= 1}
        map={viewportDisplayMode === 'textured' ? textureSet.map : null}
        normalMap={viewportDisplayMode === 'textured' ? textureSet.normalMap : null}
        roughnessMap={viewportDisplayMode === 'textured' ? textureSet.roughnessMap : null}
        displacementMap={viewportDisplayMode === 'textured' ? textureSet.displacementMap : null}
        displacementScale={viewportDisplayMode === 'textured' && textureSet.displacementMap ? 0.015 : 0}
        side={THREE.DoubleSide}
        wireframe={viewportDisplayMode === 'wireframe'}
      />
    </mesh>
  );
}

function EditorScene({ sceneRootRef }: Canvas3DProps) {
  const objects = useSceneStore((state) => state.objects);
  const layers = useSceneStore((state) => state.layers);
  const referenceImages = useSceneStore((state) => state.referenceImages);
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  const showGrid = useEditorStore((state) => state.showGrid);
  const activeTool = useEditorStore((state) => state.activeTool);
  const clearSelectedObjects = useEditorStore((state) => state.clearSelectedObjects);
  const showContextMenu = useContextMenu((state) => state.show);
  const objectRefs = useRef(new Map<string, THREE.Object3D>());
  const rootRef = useRef<THREE.Group>(null);
  const [selectedObject, setSelectedObject3D] = useState<THREE.Object3D | null>(null);

  const layerVisibilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const layer of layers) {
      map.set(layer.id, layer.visible);
    }
    return map;
  }, [layers]);

  const layerLockMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const layer of layers) {
      map.set(layer.id, layer.locked);
    }
    return map;
  }, [layers]);

  const sortedObjects = useMemo(() => {
    const layerOrder = new Map<string, number>();
    for (const layer of layers) {
      layerOrder.set(layer.id, layer.order);
    }
    return [...objects].sort((a, b) => {
      const orderA = layerOrder.get(a.layerId) ?? 0;
      const orderB = layerOrder.get(b.layerId) ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.createdAt - b.createdAt;
    });
  }, [objects, layers]);
  const sceneTree = useMemo(() => buildSceneTree(sortedObjects), [sortedObjects]);
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const [altPressed, setAltPressed] = useState(false);

  const { gl: canvasGl } = useThree();

  useEffect(() => {
    const canvas = canvasGl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        _rightClickDragged = false;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (e.buttons & 2) {
        _rightClickDragged = true;
      }
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [canvasGl]);

  useEffect(() => {
    const updateFromEvent = (event: KeyboardEvent) => {
      setCtrlPressed(event.ctrlKey);
      setAltPressed(event.altKey);
    };

    const handleKeyDown = (event: KeyboardEvent) => updateFromEvent(event);
    const handleKeyUp = (event: KeyboardEvent) => updateFromEvent(event);
    const handleBlur = () => {
      setCtrlPressed(false);
      setAltPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const modifierNavigation = altPressed ? 'zoom' : ctrlPressed ? 'pan' : null;
  const controlsEnabled = true;

  const mouseButtons = useMemo(() => {
    if (modifierNavigation === 'zoom') {
      return {
        LEFT: THREE.MOUSE.DOLLY,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.DOLLY,
      };
    }

    if (modifierNavigation === 'pan') {
      return {
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN,
      };
    }

    if (activeTool === 'sculpt' || activeTool === 'edit' || activeTool === 'draw3D') {
      return {
        LEFT: null as unknown as THREE.MOUSE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      };
    }

    return {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
  }, [modifierNavigation, activeTool]);

  useEffect(() => {
    installMeshBVH();
  }, []);

  useEffect(() => {
    if (activeTool === 'sculpt' || activeTool === 'draw3D') {
      document.body.style.cursor = 'crosshair';
    } else {
      document.body.style.cursor = 'default';
    }
    return () => { document.body.style.cursor = 'default'; };
  }, [activeTool]);

  useEffect(() => {
    sceneRootRef.current = rootRef.current;
    return () => {
      sceneRootRef.current = null;
    };
  }, [sceneRootRef]);

  const registerObjectRef = useCallback(
    (uuid: string, object: THREE.Object3D | null) => {
      if (object) {
        objectRefs.current.set(uuid, object);
      } else {
        objectRefs.current.delete(uuid);
      }
    },
    [],
  );

  useEffect(() => {
    setSelectedObject3D(selectedObjectIds.length > 0 ? objectRefs.current.get(selectedObjectIds[0]) ?? null : null);
  }, [objects.length, selectedObjectIds]);

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 7, 4]} intensity={0.55} castShadow />
      <directionalLight position={[-4, 3, -5]} intensity={0.22} />
      <hemisphereLight args={['#dbeafe', '#1f2937', 0.35]} />
      <GridHelper show={showGrid} />

      {referenceImages.filter((r) => r.visible).map((ref) => (
        <Suspense key={ref.id} fallback={null}>
          <ReferenceImagePlane refImg={ref} />
        </Suspense>
      ))}

      <group ref={rootRef}>
        {sceneTree.map((node) => (
          <Suspense key={node.object.uuid} fallback={<ObjectLoading object={node.object} />}>
            <ObjectNode
              node={node}
              registerObjectRef={registerObjectRef}
              allObjects={objects}
              layerVisibilityMap={layerVisibilityMap}
              layerLockMap={layerLockMap}
            />
          </Suspense>
        ))}
      </group>

      {activeTool === 'drawPolygon' && (
        <DrawPolygonOverlay objectUuid={selectedObjectIds[0] ?? ''} />
      )}
      {activeTool === 'knife' && selectedObjectIds[0] && (
        <KnifeOverlay objectUuid={selectedObjectIds[0]} />
      )}
      {activeTool === 'draw3D' && (
        <Draw3DOverlay />
      )}

      <PhysicsRuntime objects={objects} objectRefs={objectRefs} />

      <CameraFramer objectRefs={objectRefs} />

      {activeTool !== 'edit' && selectedObjectIds.map((uuid) => (
        <SelectionBox key={uuid} object={objectRefs.current.get(uuid) ?? null} />
      ))}
      <TransformGizmo objectId={selectedObjectIds[0] ?? null} object={selectedObject} />
      <OrbitControls
        makeDefault
        enabled={controlsEnabled}
        enableDamping
        dampingFactor={0.08}
        enableRotate={modifierNavigation === 'zoom' || modifierNavigation === 'pan' ? false : true}
        enablePan={modifierNavigation === 'zoom' ? false : true}
        enableZoom
        mouseButtons={mouseButtons}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.015, 0]}
        visible={false}
        onClick={() => clearSelectedObjects()}
        onContextMenu={(event) => {
          if (_rightClickDragged) return;
          event.stopPropagation();
          _rightClickDragged = false;
          const e = event.nativeEvent as MouseEvent;
          showContextMenu(e.clientX, e.clientY, null);
        }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  );
}

export default function Canvas3D({ sceneRootRef }: Canvas3DProps) {
  const clearSelectedObjects = useEditorStore((state) => state.clearSelectedObjects);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#101214]" onContextMenu={(e) => e.preventDefault()}>
      <ContextMenu />
      <Canvas
        flat
        shadows
        dpr={[1, 2]}
        camera={{ position: [4.5, 3.2, 5.8], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onPointerMissed={() => clearSelectedObjects()}
      >
        <color attach="background" args={['#101214']} />
        <fog attach="fog" args={['#101214', 18, 38]} />
        <EditorScene sceneRootRef={sceneRootRef} />
      </Canvas>
    </div>
  );
}
