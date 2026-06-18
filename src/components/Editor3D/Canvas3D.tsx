'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import MeshEditOverlay from './MeshEditOverlay';
import TransformGizmo from './TransformGizmo';
import { installMeshBVH, mergePrimitiveGeometry } from '@/lib/geometryOps';
import { editableMeshFromObject3D, editableMeshToBufferGeometry, grabMeshVertices, sculptMesh } from '@/lib/meshOps';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { useContextMenu } from '@/store/contextMenuStore';
import ContextMenu from './ContextMenu';
import type { EditableMesh, EditorMaterial, PointerType, ReferenceImage, SceneObject, ViewportDisplayMode } from '@/store/types';
import { EffectAsset } from '@/lib/effects';
import { BehaviorEngine } from '@/lib/behaviors';
import { ScriptEngine } from '@/lib/scriptEngine';

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
  ].join('|');

const useMaterialTextures = (material: EditorMaterial) => {
  const {
    textureUrl,
    normalMapUrl,
    roughnessMapUrl,
    displacementMapUrl,
    textureRepeatX,
    textureRepeatY,
    textureOffsetX,
    textureOffsetY,
    textureRotation,
  } = material;
  const gl = useThree((state) => state.gl);
  const [baseTexture, normalTexture, roughnessTexture, displacementTexture] = useLoader(THREE.TextureLoader, [
    textureUrl ?? EMPTY_TEXTURE_URL,
    normalMapUrl ?? EMPTY_TEXTURE_URL,
    roughnessMapUrl ?? EMPTY_TEXTURE_URL,
    displacementMapUrl ?? EMPTY_TEXTURE_URL,
  ]) as THREE.Texture[];

  const configuredTextures = useMemo(() => {
    const configureTexture = (source: THREE.Texture, url: string | null, colorSpace: THREE.ColorSpace) => {
      if (!url) return null;

      const nextTexture = source.clone();
      nextTexture.image = source.image;
      nextTexture.colorSpace = colorSpace;
      nextTexture.wrapS = THREE.RepeatWrapping;
      nextTexture.wrapT = THREE.RepeatWrapping;
      nextTexture.repeat.set(textureRepeatX, textureRepeatY);
      nextTexture.offset.set(textureOffsetX, textureOffsetY);
      nextTexture.center.set(0.5, 0.5);
      nextTexture.rotation = textureRotation;
      nextTexture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      nextTexture.needsUpdate = true;
      return nextTexture;
    };

    return {
      map: configureTexture(baseTexture, textureUrl, THREE.SRGBColorSpace),
      normalMap: configureTexture(normalTexture, normalMapUrl ?? null, THREE.NoColorSpace),
      roughnessMap: configureTexture(roughnessTexture, roughnessMapUrl ?? null, THREE.NoColorSpace),
      displacementMap: configureTexture(displacementTexture, displacementMapUrl ?? null, THREE.NoColorSpace),
    };
  }, [
    baseTexture,
    displacementMapUrl,
    displacementTexture,
    gl,
    normalMapUrl,
    normalTexture,
    roughnessMapUrl,
    roughnessTexture,
    textureOffsetX,
    textureOffsetY,
    textureRepeatX,
    textureRepeatY,
    textureRotation,
    textureUrl,
  ]);

  useEffect(
    () => () => {
      Object.values(configuredTextures).forEach((texture) => texture?.dispose());
    },
    [configuredTextures],
  );

  return configuredTextures;
};

const applyMaterialProps = (
  material: THREE.MeshStandardMaterial,
  editorMaterial: EditorMaterial,
  textureSet: MaterialTextureSet,
) => {
  material.color.set(editorMaterial.color);
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
) => {
  const textured = displayMode === 'textured';
  applyMaterialProps(material, editorMaterial, textured ? textureSet : EMPTY_TEXTURE_SET);

  material.wireframe = displayMode === 'wireframe';
  material.opacity = displayMode === 'wireframe' ? 1 : editorMaterial.opacity;
  material.transparent = displayMode === 'wireframe' ? false : editorMaterial.opacity < 1;
  material.depthWrite = material.opacity >= 1;

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
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const updateObject = useSceneStore((state) => state.updateObject);
  const clone = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    if ((activeTool !== 'edit' && activeTool !== 'sculpt') || selectedObjectId !== object.uuid || object.editableMesh) return;

    const editableMesh = editableMeshFromObject3D(clone);
    if (!editableMesh) return;

    updateObject(object.uuid, { editableMesh });
  }, [activeTool, clone, object.editableMesh, object.uuid, selectedObjectId, updateObject]);

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

function EditableMeshAsset({ object, material }: { object: SceneObject; material: EditorMaterial }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const allMaterials = useMaterialStore((state) => state.materials);
  const textureSet = useMaterialTextures(material);
  const activeTool = useEditorStore((state) => state.activeTool);
  const viewportDisplayMode = useEditorStore((state) => state.viewportDisplayMode);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
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
  const objectMaterials = useMemo(() => {
    const baseMaterial = allMaterials[object.materialId] ?? material;
    const extraMaterials = Object.values(allMaterials)
      .filter((item) => item.objectId === object.uuid && item.uuid !== baseMaterial.uuid)
      .sort((a, b) => a.name.localeCompare(b.name) || a.uuid.localeCompare(b.uuid));

    return [baseMaterial, ...extraMaterials];
  }, [allMaterials, material, object.materialId, object.uuid]);
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
      applyViewportMaterialProps(nextMaterial, editorMaterial, index === 0 ? textureSet : EMPTY_TEXTURE_SET, viewportDisplayMode);
      return nextMaterial;
    });
  }, [objectMaterials, textureSet, viewportDisplayMode]);

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
    if (activeTool !== 'sculpt' || selectedObjectId !== object.uuid || !meshRef.current || !event.face) return null;

    const pressure = event.nativeEvent.pressure || 0.5;
    const localPoint = meshRef.current.worldToLocal(event.point.clone());
    const localNormal = event.face.normal.clone().normalize();
    setSculptBrushPreview(object.uuid, [localPoint.x, localPoint.y, localPoint.z], [localNormal.x, localNormal.y, localNormal.z]);
    return { localPoint, localNormal, pressure };
  };

  const applySculptStroke = (event: ThreeEvent<PointerEvent>) => {
    if (activeTool !== 'sculpt' || selectedObjectId !== object.uuid || !meshRef.current || !event.face) return;

    const sourceMesh = strokeMeshRef.current ?? object.editableMesh;
    if (!sourceMesh) return;

    event.stopPropagation();
    const preview = updateBrushPreview(event);
    if (!preview) return;

    const { localPoint, localNormal, pressure } = preview;
    const rawPressure = event.nativeEvent.pressure || (event.nativeEvent.pointerType === 'pen' ? 0.5 : 1);

    strokePressureRef.current = rawPressure;

    const effectivePressure = rawPressure > 0 ? rawPressure : 1;
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
    if (activeTool !== 'sculpt' || selectedObjectId !== object.uuid || !object.editableMesh) return;

    event.stopPropagation();
    if (event.nativeEvent.target instanceof Element) {
      event.nativeEvent.target.setPointerCapture?.(event.pointerId);
    }

    const pointerType = event.nativeEvent.pointerType as PointerType;
    setSculptPointerType(pointerType);

    pushSnapshot();
    sculptingRef.current = true;
    strokeMeshRef.current = object.editableMesh;
    strokeGrabStartMeshRef.current = object.editableMesh;
    strokeGrabStartPointRef.current = null;
    strokeLastPointRef.current = null;
    strokePaintedVerticesRef.current = new Set();
    strokeSmoothBufferRef.current = [];
    strokePressureRef.current = event.nativeEvent.pressure || 0.5;
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
      onPointerLeave={() => {
        endSculpt();
        clearSculptBrushPreview();
      }}
      onPointerEnter={(event) => {
        setSculptPointerType(event.nativeEvent.pointerType as PointerType);
      }}
    >
      {!meshMaterials && (
        <meshStandardMaterial
          key={`${viewportDisplayMode}-${materialTextureKey(material)}`}
          color={material.color}
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
          onUpdate={(nextMaterial) => {
            applyViewportMaterialProps(nextMaterial, material, textureSet, viewportDisplayMode);
          }}
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
        key={`${viewportDisplayMode}-${materialTextureKey(material)}`}
        color={material.color}
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
        onUpdate={(nextMaterial) => {
          applyViewportMaterialProps(nextMaterial, material, textureSet, viewportDisplayMode);
        }}
      />
    </mesh>
  );
}

function ObjectNode({
  object,
  material,
  registerObjectRef,
}: {
  object: SceneObject;
  material: EditorMaterial;
  registerObjectRef: ObjectRefRegistry;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const layers = useSceneStore((state) => state.layers);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const viewportDisplayMode = useEditorStore((state) => state.viewportDisplayMode);
  const showPrimitiveShape = viewportDisplayMode === 'primitive' && object.kind === 'primitive';
  const showContextMenu = useContextMenu((state) => state.show);
  const layerLocked = useMemo(
    () => layers.find((l) => l.id === object.layerId)?.locked ?? false,
    [layers, object.layerId],
  );

  useEffect(() => {
    registerObjectRef(object.uuid, groupRef.current);
    return () => registerObjectRef(object.uuid, null);
  }, [object.uuid, registerObjectRef]);

  if (object.kind === 'model' && !object.source) return null;

  return (
    <group
      ref={groupRef}
      name={object.name}
      userData={{ sceneObjectId: object.uuid }}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
      visible={object.visible}
      onClick={(event) => {
        if (layerLocked) return;
        event.stopPropagation();
        setSelectedObject(object.uuid);
      }}
      onContextMenu={(event) => {
        if (layerLocked) return;
        event.stopPropagation();
        const e = event.nativeEvent as MouseEvent;
        showContextMenu(e.clientX, e.clientY, object.uuid);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
      }}
    >
      {object.effect ? (
        <EffectAsset effect={object.effect} />
      ) : showPrimitiveShape ? (
        <PrimitiveAsset object={object} material={material} />
      ) : object.editableMesh ? (
        <EditableMeshAsset object={object} material={material} />
      ) : object.kind === 'model' ? (
        <ModelAsset object={object} material={material} />
      ) : (
        <PrimitiveAsset object={object} material={material} />
      )}
      {!object.effect && <MeshEditOverlay object={object} />}
      <BehaviorEngine object={object} groupRef={groupRef} />
      <ScriptEngine object={object} groupRef={groupRef} />
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
  const texture = useLoader(THREE.TextureLoader, refImg.imageUrl);
  const selectedReferenceId = useEditorStore((s) => s.selectedReferenceId);
  const setSelectedReference = useEditorStore((s) => s.setSelectedReference);

  useEffect(() => () => texture.dispose(), [texture]);

  const aspect = texture.image ? texture.image.width / texture.image.height : 1;
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

function EditorScene({ sceneRootRef }: Canvas3DProps) {
  const objects = useSceneStore((state) => state.objects);
  const layers = useSceneStore((state) => state.layers);
  const referenceImages = useSceneStore((state) => state.referenceImages);
  const materials = useMaterialStore((state) => state.materials);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const showGrid = useEditorStore((state) => state.showGrid);
  const activeTool = useEditorStore((state) => state.activeTool);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
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

  const visibleObjects = useMemo(
    () => objects.filter((o) => layerVisibilityMap.get(o.layerId) !== false),
    [objects, layerVisibilityMap],
  );

  const sortedObjects = useMemo(() => {
    const layerOrder = new Map<string, number>();
    for (const layer of layers) {
      layerOrder.set(layer.id, layer.order);
    }
    return [...visibleObjects].sort((a, b) => {
      const orderA = layerOrder.get(a.layerId) ?? 0;
      const orderB = layerOrder.get(b.layerId) ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.createdAt - b.createdAt;
    });
  }, [visibleObjects, layers]);
  const [ctrlPressed, setCtrlPressed] = useState(false);
  const [altPressed, setAltPressed] = useState(false);

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

    if (activeTool === 'sculpt' || activeTool === 'edit') {
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
    if (activeTool === 'sculpt') {
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

      if (uuid === selectedObjectId) {
        setSelectedObject3D(object);
      }
    },
    [selectedObjectId],
  );

  useEffect(() => {
    setSelectedObject3D(selectedObjectId ? objectRefs.current.get(selectedObjectId) ?? null : null);
  }, [objects.length, selectedObjectId]);

  return (
    <>
      <ambientLight intensity={0.72} />
      <directionalLight position={[5, 7, 4]} intensity={1.7} castShadow />
      <directionalLight position={[-4, 3, -5]} intensity={0.45} />
      <hemisphereLight args={['#dbeafe', '#1f2937', 0.75]} />
      <GridHelper show={showGrid} />

      {referenceImages.filter((r) => r.visible).map((ref) => (
        <ReferenceImagePlane key={ref.id} refImg={ref} />
      ))}

      <group ref={rootRef}>
        {sortedObjects.map((object) => {
          const material = materials[object.materialId];
          if (!material) return null;

          return (
            <Suspense key={object.uuid} fallback={<ObjectLoading object={object} />}>
              <ObjectNode object={object} material={material} registerObjectRef={registerObjectRef} />
            </Suspense>
          );
        })}
      </group>

      {activeTool !== 'edit' && <SelectionBox object={selectedObject} />}
      <TransformGizmo objectId={selectedObjectId} object={selectedObject} />
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
        onClick={() => setSelectedObject(null)}
        onContextMenu={(event) => {
          event.stopPropagation();
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
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const activeTool = useEditorStore((state) => state.activeTool);
  const viewportDisplayMode = useEditorStore((state) => state.viewportDisplayMode);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const objects = useSceneStore((state) => state.objects);
  const selectedObject = objects.find((object) => object.uuid === selectedObjectId);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#101214]" onContextMenu={(e) => e.preventDefault()}>
      <ContextMenu />
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [4.5, 3.2, 5.8], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onPointerMissed={() => setSelectedObject(null)}
      >
        <color attach="background" args={['#101214']} />
        <fog attach="fog" args={['#101214', 18, 38]} />
        <EditorScene sceneRootRef={sceneRootRef} />
      </Canvas>
      <div className="pointer-events-none absolute left-2 top-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-md border border-neutral-800/90 bg-neutral-950/70 px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] text-neutral-400 shadow-lg backdrop-blur sm:left-4 sm:top-4 sm:max-w-[calc(100%-2rem)] sm:gap-2 sm:px-3 sm:py-2 sm:text-[11px]">
        <span className="text-emerald-300">{activeTool}</span>
        <span className="h-3 w-px bg-neutral-700" />
        <span className="text-sky-300">{viewportDisplayMode}</span>
        <span className="h-3 w-px bg-neutral-700" />
        <span className="max-w-24 truncate sm:max-w-48">{selectedObject?.name ?? 'Sem selecao'}</span>
      </div>
    </div>
  );
}
