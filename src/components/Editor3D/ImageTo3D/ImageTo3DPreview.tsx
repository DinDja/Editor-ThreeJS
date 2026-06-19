'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Loader2 } from 'lucide-react';

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

function PreviewModel({ url }: { url: string }) {
  const gltf = useGLTF(url);
  const { scene } = useThree();

  useEffect(() => {
    const clone = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    clone.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));
    clone.scale.setScalar(2 / maxDim);
    clone.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    scene.add(clone);
    return () => {
      scene.remove(clone);
    };
  }, [gltf.scene, scene]);

  return null;
}

function PreviewCameraRig() {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as
    | (THREE.EventDispatcher & { target?: THREE.Vector3; update?: () => void })
    | null;
  useEffect(() => {
    camera.position.set(2.6, 1.8, 3.2);
    if (controls && controls.target) {
      controls.target.set(0, 0.8, 0);
      controls.update?.();
    }
  }, [camera, controls]);
  return null;
}

function LoadingOverlay() {
  return (
    <Html center>
      <div className="flex items-center gap-1.5 rounded bg-black/60 px-2.5 py-1.5 text-[10px] text-neutral-200">
        <Loader2 size={12} className="animate-spin text-emerald-300" />
        Carregando preview...
      </div>
    </Html>
  );
}

type ImageTo3DPreviewProps = {
  glb: ArrayBuffer | null;
};

export default function ImageTo3DPreview({ glb }: ImageTo3DPreviewProps) {
  const url = useMemo(() => {
    if (!glb) return null;
    return `data:model/gltf-binary;base64,${arrayBufferToBase64(glb)}`;
  }, [glb]);

  if (!url) return null;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-neutral-800 bg-[#0d0f10]">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [2.6, 1.8, 3.2], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#0d0f10']} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 6, 4]} intensity={1.1} castShadow />
        <directionalLight position={[-3, 2, -3]} intensity={0.3} />
        <hemisphereLight args={['#dbeafe', '#1f2937', 0.4]} />
        <gridHelper args={[12, 12, '#2b3236', '#1b1f22']} position={[0, 0, 0]} />
        <Suspense fallback={<LoadingOverlay />}>
          <PreviewModel url={url} />
        </Suspense>
        <PreviewCameraRig />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} target={[0, 0.8, 0]} />
      </Canvas>
    </div>
  );
}
