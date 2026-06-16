import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import type { PrimitiveKind } from '@/store/types';

let bvhInstalled = false;

export const installMeshBVH = () => {
  if (bvhInstalled) return;

  (THREE.BufferGeometry.prototype as unknown as { computeBoundsTree: typeof computeBoundsTree }).computeBoundsTree =
    computeBoundsTree;
  (THREE.BufferGeometry.prototype as unknown as { disposeBoundsTree: typeof disposeBoundsTree }).disposeBoundsTree =
    disposeBoundsTree;
  THREE.Mesh.prototype.raycast = acceleratedRaycast;
  bvhInstalled = true;
};

export const rebuildGeometryBVH = (geometry: THREE.BufferGeometry) => {
  const editableGeometry = geometry.index ? geometry : geometry.toNonIndexed();
  const withBVH = editableGeometry as THREE.BufferGeometry & {
    computeBoundsTree?: typeof computeBoundsTree;
    disposeBoundsTree?: typeof disposeBoundsTree;
  };

  withBVH.disposeBoundsTree?.();
  withBVH.computeBoundsTree?.();
  return editableGeometry;
};

export const primitiveLabels: Record<PrimitiveKind, string> = {
  box: 'Cubo',
  sphere: 'Esfera',
  cylinder: 'Cilindro',
  cone: 'Cone',
  torus: 'Toro',
  plane: 'Plano',
};

export const primitiveKinds: PrimitiveKind[] = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane'];

export const duplicateGeometry = (geometry: THREE.BufferGeometry) => rebuildGeometryBVH(geometry.clone());
