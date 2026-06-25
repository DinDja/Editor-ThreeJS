'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { mergePrimitiveGeometry } from '@/lib/geometryOps';
import { editableMeshToBufferGeometry } from '@/lib/meshOps';
import { EffectAsset } from '@/lib/effects';
import { imageToExtrudedMesh } from '@/lib/imageTo3DMesh';
import { BehaviorEngine } from '@/lib/behaviors';
import { buildSceneTree, type SceneTreeNode } from '@/store/sceneTree';
import { usePreviewStatsStore } from '@/store/previewStatsStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import type { EditorMaterial, SceneObject } from '@/store/types';

type ExperienceSceneCanvasProps = {
  interactive?: boolean;
  transparent?: boolean;
  className?: string;
};

type RuntimeEvent = {
  id: string;
  active: boolean;
};

const fallbackMaterial: EditorMaterial = {
  uuid: 'fallback-material',
  objectId: 'fallback',
  name: 'Fallback',
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
};

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

const TEXTURE_SLOTS = [
  ['map', 'textureUrl', THREE.SRGBColorSpace],
  ['normalMap', 'normalMapUrl', THREE.NoColorSpace],
  ['roughnessMap', 'roughnessMapUrl', THREE.NoColorSpace],
  ['displacementMap', 'displacementMapUrl', THREE.NoColorSpace],
] as const satisfies ReadonlyArray<readonly [keyof MaterialTextureSet, keyof EditorMaterial, THREE.ColorSpace]>;

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

const hasTextureSet = (textureSet: MaterialTextureSet) =>
  Boolean(textureSet.map || textureSet.normalMap || textureSet.roughnessMap || textureSet.displacementMap);

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

const getMaterialRenderColor = (material: EditorMaterial, textureSet: MaterialTextureSet) =>
  textureSet.map ? '#ffffff' : material.color;

const applyMaterialProps = (
  material: THREE.MeshStandardMaterial,
  editorMaterial: EditorMaterial,
  textureSet: MaterialTextureSet,
  flatShading = false,
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
  material.flatShading = flatShading;
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

const findObjectByPath = (root: THREE.Object3D, path: unknown) => {
  if (!Array.isArray(path)) return null;
  let current: THREE.Object3D | null = root;

  for (const index of path) {
    if (typeof index !== 'number' || !current?.children[index]) return null;
    current = current.children[index];
  }

  return current;
};

const toVec3 = (value: unknown, fallback: [number, number, number]): [number, number, number] =>
  Array.isArray(value) && value.length >= 3 && value.every((item) => typeof item === 'number')
    ? [value[0], value[1], value[2]]
    : fallback;

const getRuntimeTarget = (
  id: string,
  objectRefs: React.MutableRefObject<Map<string, THREE.Object3D>>,
  rootRef: React.RefObject<THREE.Group | null>,
) => {
  if (id === 'current-scene') return rootRef.current;
  return objectRefs.current.get(id) ?? rootRef.current;
};

const applyMaterialToObject = (object: THREE.Object3D, patch: { color?: string; opacity?: number }) => {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (patch.color && 'color' in material && material.color instanceof THREE.Color) {
        material.color.set(patch.color);
      }
      if (patch.opacity !== undefined) {
        material.transparent = patch.opacity < 1;
        material.opacity = patch.opacity;
      }
      material.needsUpdate = true;
    });
  });
};

const applyLightToObject = (
  object: THREE.Object3D,
  patch: { color?: string; enabled?: boolean; intensity?: number },
) => {
  object.traverse((child) => {
    if (!(child instanceof THREE.Light)) return;

    if (child.userData.runtimeBaseIntensity === undefined) {
      child.userData.runtimeBaseIntensity = child.intensity;
    }

    if (patch.color) child.color.set(patch.color);

    if (patch.intensity !== undefined) {
      child.intensity = patch.intensity;
      child.userData.runtimeBaseIntensity = patch.intensity;
    }

    if (patch.enabled !== undefined) {
      const baseIntensity =
        typeof child.userData.runtimeBaseIntensity === 'number'
          ? child.userData.runtimeBaseIntensity
          : child.intensity;
      child.intensity = patch.enabled ? baseIntensity : 0;
      child.visible = patch.enabled;
    }
  });
};

function InteractionBridge({
  objectRefs,
  rootRef,
}: {
  objectRefs: React.MutableRefObject<Map<string, THREE.Object3D>>;
  rootRef: React.RefObject<THREE.Group | null>;
}) {
  const interactions = useExperienceStore((state) => state.interactions);
  const activeRuntimeIds = useRef(new Set<string>());
  const pointer = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    const handleRuntime = (event: Event) => {
      const detail = (event as CustomEvent<RuntimeEvent>).detail;
      if (!detail?.id) return;
      if (detail.active) activeRuntimeIds.current.add(detail.id);
      else activeRuntimeIds.current.delete(detail.id);
    };

    const handlePointer = (event: PointerEvent) => {
      pointer.current = {
        x: (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2,
        y: (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2,
      };
    };

    const handleScroll = () => {
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      scroll.current = window.scrollY / max;
    };

    window.addEventListener('experience-interaction', handleRuntime);
    window.addEventListener('pointermove', handlePointer);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('experience-interaction', handleRuntime);
      window.removeEventListener('pointermove', handlePointer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useFrame(() => {
    interactions.forEach((interaction) => {
      if (!interaction.enabled) return;
      const shouldRun =
        interaction.trigger === 'mouseMove' ||
        interaction.trigger === 'scroll' ||
        interaction.trigger === 'pageLoad' ||
        activeRuntimeIds.current.has(interaction.id);
      if (!shouldRun) return;

      const target = getRuntimeTarget(interaction.targetId, objectRefs, rootRef);
      const duration = Math.max(interaction.duration ?? 0.35, 0.05);
      const alpha = Math.min(0.18, 1 / (duration * 60));

      if (interaction.action === 'rotateObject3D' && target) {
        const base = toVec3(interaction.params.rotation, [0, 0.35, 0]);
        const mouseFactor = interaction.trigger === 'mouseMove' ? pointer.current.x : 1;
        target.rotation.x = THREE.MathUtils.lerp(target.rotation.x, base[0] + pointer.current.y * 0.18, alpha);
        target.rotation.y = THREE.MathUtils.lerp(target.rotation.y, base[1] * mouseFactor, alpha);
        target.rotation.z = THREE.MathUtils.lerp(target.rotation.z, base[2], alpha);
      }

      if (interaction.action === 'moveObject3D' && target) {
        const destination = toVec3(interaction.params.position, [0, 0.4, 0]);
        target.position.lerp(new THREE.Vector3(...destination), alpha);
      }

      if (interaction.action === 'scaleObject3D' && target) {
        const destination = toVec3(interaction.params.scale, [1.08, 1.08, 1.08]);
        target.scale.lerp(new THREE.Vector3(...destination), alpha);
      }

      if ((interaction.action === 'changeColor' || interaction.action === 'changeMaterial') && target) {
        const color = typeof interaction.params.color === 'string' ? interaction.params.color : '#00ffcc';
        applyMaterialToObject(target, { color });
        applyLightToObject(target, { color });
      }

      if (interaction.action === 'changeOpacity' && target) {
        const opacity = typeof interaction.params.opacity === 'number' ? interaction.params.opacity : 0.65;
        applyMaterialToObject(target, { opacity });
      }

      if (interaction.action === 'toggleLight' && target) {
        const enabled = typeof interaction.params.enabled === 'boolean' ? interaction.params.enabled : true;
        const intensity = typeof interaction.params.intensity === 'number' ? interaction.params.intensity : undefined;
        applyLightToObject(target, { enabled, intensity });
      }

      if ((interaction.action === 'moveCamera' || interaction.action === 'animateCamera') && interaction.trigger === 'scroll') {
        const base = toVec3(interaction.params.position, [4.5, 3.2, 5.8]);
        const destination = new THREE.Vector3(base[0], base[1] + scroll.current * 2.4, base[2] - scroll.current * 2.8);
        camera.position.lerp(destination, alpha);
        camera.lookAt(0, 0.6, 0);
      }
    });
  });

  return null;
}

function ModelAsset({ object, material }: { object: SceneObject; material: EditorMaterial }) {
  const gltf = useGLTF(object.source ?? '');
  const textureSet = useMaterialTextures(material);
  const clone = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    const shouldOverrideMaterial = hasTextureSet(textureSet) || object.metadata.materialOverrides?.[material.uuid] === true;
    clone.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      node.castShadow = true;
      node.receiveShadow = true;

      if (!shouldOverrideMaterial) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((item) => {
          item.side = THREE.DoubleSide;
          item.needsUpdate = true;
        });
        return;
      }

      const apply = (source: THREE.Material | null | undefined) => {
        const nextMaterial = cloneMaterialAsStandard(source);
        applyMaterialProps(nextMaterial, material, textureSet, object.metadata.flatShading === true);
        return nextMaterial;
      };

      node.material = Array.isArray(node.material)
        ? node.material.map((sourceMaterial) => apply(sourceMaterial))
        : apply(node.material);
    });
  }, [clone, material, object.metadata.materialOverrides, textureSet]);

  return <primitive object={clone} />;
}

function GltfMeshAsset({ object, material }: { object: SceneObject; material: EditorMaterial }) {
  const source = typeof object.metadata.gltfSource === 'string' ? object.metadata.gltfSource : object.source;
  const gltf = useGLTF(source ?? '');
  const allMaterials = useMaterialStore((state) => state.materials);
  const materialIds = useMemo(() => object.materialIds?.length ? object.materialIds : [object.materialId], [object.materialId, object.materialIds]);
  const editorMaterials = useMemo(
    () => materialIds.map((materialId) => allMaterials[materialId] ?? (materialId === object.materialId ? material : null)).filter(Boolean) as EditorMaterial[],
    [allMaterials, material, materialIds, object.materialId],
  );
  const textureSets = useMaterialTextureSets(editorMaterials);
  const sourceNode = useMemo(
    () => findObjectByPath(gltf.scene, object.metadata.gltfNodePath),
    [gltf.scene, object.metadata.gltfNodePath],
  );
  const sourceMesh = sourceNode instanceof THREE.Mesh ? sourceNode : null;

  const meshMaterials = useMemo(() => {
    if (!sourceMesh) return null;

    const sourceMaterials = Array.isArray(sourceMesh.material) ? sourceMesh.material : [sourceMesh.material];

    return sourceMaterials.map((sourceMaterial, index) => {
      const materialId = materialIds[index] ?? object.materialId;
      const editorMaterial = allMaterials[materialId] ?? material;
      const textureSet = textureSets[editorMaterial.uuid] ?? EMPTY_TEXTURE_SET;
      const hasOverride = object.metadata.materialOverrides?.[materialId] === true || hasTextureSet(textureSet);
      const nextMaterial = cloneMaterialAsStandard(sourceMaterial);

      if (!hasOverride) {
        nextMaterial.side = THREE.DoubleSide;
        nextMaterial.needsUpdate = true;
        return nextMaterial;
      }

      applyMaterialProps(nextMaterial, editorMaterial, textureSet, object.metadata.flatShading === true);
      return nextMaterial;
    });
  }, [allMaterials, material, materialIds, object.materialId, object.metadata.flatShading, object.metadata.materialOverrides, sourceMesh, textureSets]);

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
  const sourceNode = useMemo(
    () => findObjectByPath(gltf.scene, object.metadata.gltfNodePath),
    [gltf.scene, object.metadata.gltfNodePath],
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
  const allMaterials = useMaterialStore((state) => state.materials);
  const objectMaterials = useMemo(() => {
    const baseMaterial = allMaterials[object.materialId] ?? material;
    const extraMaterials = Object.values(allMaterials)
      .filter((item) => item.objectId === object.uuid && item.uuid !== baseMaterial.uuid)
      .sort((a, b) => a.name.localeCompare(b.name) || a.uuid.localeCompare(b.uuid));

    return [baseMaterial, ...extraMaterials];
  }, [allMaterials, material, object.materialId, object.uuid]);
  const textureSets = useMaterialTextureSets(objectMaterials);
  const materialIdsKey = objectMaterials.map((item) => item.uuid).join('|');
  const materialIds = useMemo(() => materialIdsKey.split('|').filter(Boolean), [materialIdsKey]);
  const geometry = useMemo(
    () => (object.editableMesh ? editableMeshToBufferGeometry(object.editableMesh, materialIds) : null),
    [materialIds, object.editableMesh],
  );
  const meshMaterials = useMemo(
    () =>
      objectMaterials.map((editorMaterial) => {
        const nextMaterial = new THREE.MeshStandardMaterial();
        applyMaterialProps(
          nextMaterial,
          editorMaterial,
          textureSets[editorMaterial.uuid] ?? EMPTY_TEXTURE_SET,
          object.metadata.flatShading === true,
        );
        return nextMaterial;
      }),
    [object.metadata.flatShading, objectMaterials, textureSets],
  );

  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(
    () => () => {
      meshMaterials.forEach((item) => item.dispose());
    },
    [meshMaterials],
  );

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      material={meshMaterials.length > 1 ? meshMaterials : meshMaterials[0]}
      castShadow
      receiveShadow
    />
  );
}

function PrimitiveAsset({ object, material }: { object: SceneObject; material: EditorMaterial }) {
  const textureSet = useMaterialTextures(material);
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
        key={`${materialTextureKey(material)}-${object.metadata.flatShading === true}`}
        color={getMaterialRenderColor(material, textureSet)}
        metalness={material.metalness}
        roughness={material.roughness}
        emissive={material.emissive}
        emissiveIntensity={material.emissiveIntensity}
        opacity={material.opacity}
        transparent={material.opacity < 1}
        depthWrite={material.opacity >= 1}
        map={textureSet.map}
        normalMap={textureSet.normalMap}
        roughnessMap={textureSet.roughnessMap}
        displacementMap={textureSet.displacementMap}
        displacementScale={textureSet.displacementMap ? 0.015 : 0}
        side={THREE.DoubleSide}
        flatShading={object.metadata.flatShading === true}
      />
    </mesh>
  );
}

function Svg3DAsset({ object }: { object: SceneObject }) {
  const [group, setGroup] = useState<THREE.Group | null>(null);
  const objectSource = object.source;
  const depth = object.svgConfig?.depth ?? 0.3;
  const bevelEnabled = object.svgConfig?.bevelEnabled ?? false;
  const bevelThickness = object.svgConfig?.bevelThickness ?? 0.05;
  const bevelSize = object.svgConfig?.bevelSize ?? 0.05;

  useEffect(() => {
    if (!objectSource) return;

    let cancelled = false;

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

          const nextGroup = new THREE.Group();
          let meshCount = 0;

          for (const path of data.paths) {
            const shapes = SVGLoader.createShapes(path);
            for (const shape of shapes) {
              const geo = new THREE.ExtrudeGeometry(shape, {
                depth, bevelEnabled, bevelThickness, bevelSize, bevelSegments: 4,
              });
              const hex = path.color ? `#${path.color.getHexString()}` : '#cccccc';
              nextGroup.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: hex, side: THREE.DoubleSide })));
              meshCount++;
            }
          }

          if (meshCount === 0) return null;

          const box = new THREE.Box3().setFromObject(nextGroup);
          nextGroup.position.sub(box.getCenter(new THREE.Vector3()));
          return nextGroup;
        })
        .then((nextGroup) => {
          if (!cancelled && nextGroup) setGroup(nextGroup);
        })
        .catch(() => { if (!cancelled) buildFromImage(); });

      return () => { cancelled = true; };
    }

    buildFromImage();

    function buildFromImage() {
      imageToExtrudedMesh(objectSource!, {
        depth, bevelEnabled, bevelThickness, bevelSize,
        bevelSegments: 3, threshold: 30, simplifyEpsilon: 1.0, maxDimension: 400, cleanup: 1,
      })
        .then(({ geometry, texture }) => {
          if (cancelled) return;
          const mat = new THREE.MeshStandardMaterial({
            map: texture, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.1,
          });
          const mesh = new THREE.Mesh(geometry, mat);
          const box = new THREE.Box3().setFromObject(mesh);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          mesh.position.sub(center);
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) mesh.scale.setScalar(2 / maxDim);
          const g = new THREE.Group();
          g.add(mesh);
          setGroup(g);
        })
        .catch((err) => console.warn('Image extrude error:', err));
    }

    return () => { cancelled = true; };
  }, [objectSource, depth, bevelEnabled, bevelThickness, bevelSize]);

  if (!group) return null;
  return <primitive object={group} />;
}

function Text3DAsset({ object, material }: { object: SceneObject; material: EditorMaterial }) {
  const textureSet = useMaterialTextures(material);
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
    const bounds = geo.boundingBox;
    if (bounds) {
      const cx = (bounds.max.x - bounds.min.x) / 2;
      const cy = (bounds.max.y - bounds.min.y) / 2;
      const cz = (bounds.max.z - bounds.min.z) / 2;
      geo.translate(-(bounds.min.x + cx), -(bounds.min.y + cy), -(bounds.min.z + cz));
    }
    return geo;
  }, [font, text, size, depth, curveSegments, bevelEnabled, bevelThickness, bevelSize, bevelSegments]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        key={materialTextureKey(material)}
        color={getMaterialRenderColor(material, textureSet)}
        metalness={material.metalness}
        roughness={material.roughness}
        emissive={material.emissive}
        emissiveIntensity={material.emissiveIntensity}
        map={textureSet.map}
        normalMap={textureSet.normalMap}
        roughnessMap={textureSet.roughnessMap}
        displacementMap={textureSet.displacementMap}
        displacementScale={textureSet.displacementMap ? 0.015 : 0}
        transparent={material.opacity < 1}
        opacity={material.opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function ObjectAsset({ object, material }: { object: SceneObject; material: EditorMaterial }) {
  if (object.effect) return <EffectAsset effect={object.effect} />;
  if (object.svgConfig) return <Svg3DAsset object={object} />;
  if (object.textConfig) return <Text3DAsset object={object} material={material} />;
  if (object.editableMesh) return <EditableMeshAsset object={object} material={material} />;
  if (object.kind === 'mesh' && object.metadata.gltfSource) return <GltfMeshAsset object={object} material={material} />;
  if ((object.kind === 'group' || object.kind === 'object3d') && object.metadata.gltfSource) return <GltfNodePrimitiveAsset object={object} />;
  if (object.kind === 'model' && object.source) return <ModelAsset object={object} material={material} />;

  if (object.type !== 'Mesh' && object.kind !== 'primitive' && object.kind !== 'mesh') return null;
  return <PrimitiveAsset object={object} material={material} />;
}

function LightAsset({ object }: { object: SceneObject }) {
  const light = object.lightConfig;
  const [targetRef] = useState(() => new THREE.Object3D());

  useEffect(() => {
    if (!light) return;
    targetRef.position.set(light.target[0], light.target[1], light.target[2]);
  }, [light, targetRef]);

  if (!light) return null;

  if (light.kind === 'ambient') return <ambientLight color={light.color} intensity={light.intensity} />;
  if (light.kind === 'point') {
    return (
      <pointLight
        color={light.color}
        intensity={light.intensity}
        distance={light.distance}
        decay={light.decay}
        castShadow={light.castShadow}
        shadow-bias={light.shadowBias}
        shadow-radius={light.shadowRadius}
      />
    );
  }
  if (light.kind === 'directional') {
    return (
      <>
        <directionalLight
          color={light.color}
          intensity={light.intensity}
          castShadow={light.castShadow}
          target={targetRef}
          shadow-bias={light.shadowBias}
          shadow-radius={light.shadowRadius}
        />
        <primitive object={targetRef} />
      </>
    );
  }
  return (
    <>
      <spotLight
        color={light.color}
        intensity={light.intensity}
        distance={light.distance}
        decay={light.decay}
        angle={light.angle}
        penumbra={light.penumbra}
        castShadow={light.castShadow}
        target={targetRef}
        shadow-bias={light.shadowBias}
        shadow-radius={light.shadowRadius}
      />
      <primitive object={targetRef} />
    </>
  );
}

function RuntimeObjectNode({
  node,
  materials,
  register,
}: {
  node: SceneTreeNode;
  materials: Record<string, EditorMaterial>;
  register: (id: string, object: THREE.Object3D | null) => void;
}) {
  const object = node.object;
  const groupRef = useRef<THREE.Group>(null);
  const material = materials[object.materialId] ?? fallbackMaterial;

  useEffect(() => {
    register(object.uuid, groupRef.current);
    return () => register(object.uuid, null);
  }, [object.uuid, register]);

  if (!object.visible) return null;

  const hasActiveBehavior = Boolean(object.behaviors?.some((behavior) => behavior.enabled));

  return (
    <group
      ref={groupRef}
      name={object.name}
      position={object.position}
      rotation={object.rotation}
      scale={object.scale}
    >
      <LightAsset object={object} />
      {!object.lightConfig && <ObjectAsset object={object} material={material} />}
      {hasActiveBehavior && <BehaviorEngine object={object} groupRef={groupRef} />}
      {node.children.map((child) => (
        <RuntimeObjectNode key={child.object.uuid} node={child} materials={materials} register={register} />
      ))}
    </group>
  );
}

function RuntimeStatsReporter() {
  const gl = useThree((state) => state.gl);
  const setStats = usePreviewStatsStore((state) => state.setStats);
  const frameCount = useRef(0);
  const lastSample = useRef(performance.now());
  const lastFpsTime = useRef(performance.now());
  const fpsFrames = useRef(0);

  useFrame(() => {
    frameCount.current += 1;
    fpsFrames.current += 1;
    const now = performance.now();
    if (now - lastFpsTime.current >= 500) {
      const fps = Math.round((fpsFrames.current * 1000) / (now - lastFpsTime.current));
      fpsFrames.current = 0;
      lastFpsTime.current = now;
      const info = gl.info;
      const memory = (performance as Performance & { memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number } }).memory;
      setStats({
        fps,
        drawCalls: info.render.calls,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        triangles: info.render.triangles,
        calls: info.render.calls,
        jsHeapUsedMB: memory?.usedJSHeapSize ? memory.usedJSHeapSize / (1024 * 1024) : 0,
        jsHeapTotalMB: memory?.totalJSHeapSize ? memory.totalJSHeapSize / (1024 * 1024) : 0,
      });
      lastSample.current = now;
    }
  });

  return null;
}

function EmptySceneFallback() {
  return (
    <group>
      <mesh rotation={[0.4, 0.55, 0]}>
        <boxGeometry args={[1.4, 1.4, 1.4]} />
        <meshStandardMaterial color="#34d399" wireframe transparent opacity={0.75} />
      </mesh>
      <gridHelper args={[8, 8, '#34d399', '#2f3633']} position={[0, -1.05, 0]} />
    </group>
  );
}

function RuntimeScene({ interactive }: { interactive: boolean }) {
  const objects = useSceneStore((state) => state.objects);
  const layers = useSceneStore((state) => state.layers);
  const materials = useMaterialStore((state) => state.materials);
  const objectRefs = useRef(new Map<string, THREE.Object3D>());
  const rootRef = useRef<THREE.Group>(null);

  const visibleLayerIds = useMemo(
    () => new Set(layers.filter((layer) => layer.visible).map((layer) => layer.id)),
    [layers],
  );
  const sceneTree = useMemo(
    () => buildSceneTree(objects.filter((object) => visibleLayerIds.has(object.layerId))),
    [objects, visibleLayerIds],
  );
  const hasVisibleSceneLights = useMemo(
    () => objects.some((object) => visibleLayerIds.has(object.layerId) && object.visible && Boolean(object.lightConfig)),
    [objects, visibleLayerIds],
  );

  const register = (id: string, object: THREE.Object3D | null) => {
    if (object) objectRefs.current.set(id, object);
    else objectRefs.current.delete(id);
  };

  return (
    <>
      {!hasVisibleSceneLights && (
        <>
          <ambientLight intensity={0.35} />
          <directionalLight position={[5, 7, 4]} intensity={0.65} castShadow />
          <hemisphereLight args={['#dbeafe', '#1f2937', 0.35]} />
        </>
      )}
      <group ref={rootRef}>
        {sceneTree.length === 0 ? (
          <EmptySceneFallback />
        ) : (
          sceneTree.map((node) => (
            <Suspense key={node.object.uuid} fallback={null}>
              <RuntimeObjectNode node={node} materials={materials} register={register} />
            </Suspense>
          ))
        )}
      </group>
      <InteractionBridge objectRefs={objectRefs} rootRef={rootRef} />
      <RuntimeStatsReporter />
      <OrbitControls enabled={interactive} enableDamping autoRotate={!interactive} autoRotateSpeed={0.35} />
    </>
  );
}

export default function ExperienceSceneCanvas({
  interactive = true,
  transparent = true,
  className = '',
}: ExperienceSceneCanvasProps) {
  return (
    <div className={`relative h-full min-h-[260px] w-full overflow-hidden ${className}`}>
      <Canvas
        shadows
        flat
        dpr={[1, 2]}
        camera={{ position: [4.5, 3.2, 5.8], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: transparent, preserveDrawingBuffer: true }}
      >
        {!transparent && <color attach="background" args={['#101214']} />}
        <fog attach="fog" args={['#101214', 18, 38]} />
        <RuntimeScene interactive={interactive} />
      </Canvas>
    </div>
  );
}
