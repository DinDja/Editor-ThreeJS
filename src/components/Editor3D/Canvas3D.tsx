'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import TransformGizmo from './TransformGizmo';
import { installMeshBVH } from '@/lib/geometryOps';
import { useEditorStore } from '@/store/editorStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import type { EditorMaterial, SceneObject } from '@/store/types';

type Canvas3DProps = {
  sceneRootRef: MutableRefObject<THREE.Group | null>;
};

type ObjectRefRegistry = (uuid: string, object: THREE.Object3D | null) => void;

const useMaterialTexture = (textureUrl: string | null) => {
  const texture = useMemo(() => {
    if (!textureUrl) return null;

    const nextTexture = new THREE.TextureLoader().load(textureUrl);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.wrapS = THREE.RepeatWrapping;
    nextTexture.wrapT = THREE.RepeatWrapping;
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [textureUrl]);

  useEffect(() => () => texture?.dispose(), [texture]);

  return texture;
};

const applyMaterialProps = (material: THREE.MeshStandardMaterial, editorMaterial: EditorMaterial, texture: THREE.Texture | null) => {
  material.color.set(editorMaterial.color);
  material.metalness = editorMaterial.metalness;
  material.roughness = editorMaterial.roughness;
  material.emissive.set(editorMaterial.emissive);
  material.emissiveIntensity = editorMaterial.emissiveIntensity;
  material.opacity = editorMaterial.opacity;
  material.transparent = editorMaterial.opacity < 1;
  material.depthWrite = editorMaterial.opacity >= 1;
  material.map = texture;
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
  const texture = useMaterialTexture(material.textureUrl);
  const clone = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    clone.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      if (Array.isArray(node.material)) {
        node.material = node.material.map((sourceMaterial) => {
          const nextMaterial = cloneMaterialAsStandard(sourceMaterial);
          applyMaterialProps(nextMaterial, material, texture);
          return nextMaterial;
        });
        return;
      }

      const nextMaterial = cloneMaterialAsStandard(node.material);
      applyMaterialProps(nextMaterial, material, texture);
      node.material = nextMaterial;
      node.castShadow = true;
      node.receiveShadow = true;
    });
  }, [clone, material, texture]);

  return <primitive object={clone} />;
}

function PrimitiveAsset({ object, material }: { object: SceneObject; material: EditorMaterial }) {
  const texture = useMaterialTexture(material.textureUrl);

  return (
    <mesh castShadow receiveShadow>
      {object.primitive === 'sphere' && <sphereGeometry args={[0.6, 48, 32]} />}
      {object.primitive === 'cylinder' && <cylinderGeometry args={[0.45, 0.45, 1.1, 48]} />}
      {object.primitive === 'cone' && <coneGeometry args={[0.55, 1.2, 48]} />}
      {object.primitive === 'torus' && <torusGeometry args={[0.48, 0.16, 24, 72]} />}
      {object.primitive === 'plane' && <planeGeometry args={[1.6, 1.6, 12, 12]} />}
      {(!object.primitive || object.primitive === 'box') && <boxGeometry args={[1, 1, 1]} />}
      <meshStandardMaterial
        color={material.color}
        metalness={material.metalness}
        roughness={material.roughness}
        emissive={material.emissive}
        emissiveIntensity={material.emissiveIntensity}
        opacity={material.opacity}
        transparent={material.opacity < 1}
        depthWrite={material.opacity >= 1}
        map={texture}
        side={THREE.DoubleSide}
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
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);

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
        event.stopPropagation();
        setSelectedObject(object.uuid);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {object.kind === 'model' ? <ModelAsset object={object} material={material} /> : <PrimitiveAsset object={object} material={material} />}
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

function EditorScene({ sceneRootRef }: Canvas3DProps) {
  const objects = useSceneStore((state) => state.objects);
  const materials = useMaterialStore((state) => state.materials);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const showGrid = useEditorStore((state) => state.showGrid);
  const activeTool = useEditorStore((state) => state.activeTool);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const objectRefs = useRef(new Map<string, THREE.Object3D>());
  const rootRef = useRef<THREE.Group>(null);
  const [selectedObject, setSelectedObject3D] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    installMeshBVH();
  }, []);

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
      {showGrid && <gridHelper args={[20, 20, '#3dd6b5', '#30363d']} position={[0, 0, 0]} />}

      <group ref={rootRef}>
        {objects.map((object) => {
          const material = materials[object.materialId];
          if (!material) return null;

          return (
            <Suspense key={object.uuid} fallback={<ObjectLoading object={object} />}>
              <ObjectNode object={object} material={material} registerObjectRef={registerObjectRef} />
            </Suspense>
          );
        })}
      </group>

      <SelectionBox object={selectedObject} />
      <TransformGizmo objectId={selectedObjectId} object={selectedObject} />
      <OrbitControls makeDefault enabled={activeTool === 'select'} enableDamping dampingFactor={0.08} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.015, 0]}
        visible={false}
        onClick={() => setSelectedObject(null)}
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
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const objects = useSceneStore((state) => state.objects);
  const selectedObject = objects.find((object) => object.uuid === selectedObjectId);

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden bg-[#101214] max-sm:min-h-[300px]">
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
      <div className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-md border border-neutral-800/90 bg-neutral-950/70 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-neutral-400 shadow-lg backdrop-blur max-sm:left-2 max-sm:top-2 max-sm:px-2 max-sm:py-1.5 max-sm:text-[10px]">
        <span className="text-emerald-300">{activeTool}</span>
        <span className="h-3 w-px bg-neutral-700" />
        <span className="max-w-48 truncate">{selectedObject?.name ?? 'Sem selecao'}</span>
      </div>
    </div>
  );
}
