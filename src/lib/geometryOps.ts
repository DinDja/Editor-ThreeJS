import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import type { PrimitiveGeometry, PrimitiveKind, Vec3 } from '@/store/types';

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

export const primitiveGeometryDefaults: Record<PrimitiveKind, Required<PrimitiveGeometry>> = {
  box: {
    width: 1,
    height: 1,
    depth: 1,
    radius: 0.5,
    radiusTop: 0.5,
    radiusBottom: 0.5,
    tube: 0.16,
    radialSegments: 24,
    tubularSegments: 64,
    widthSegments: 6,
    heightSegments: 6,
    depthSegments: 6,
  },
  sphere: {
    width: 1,
    height: 1,
    depth: 1,
    radius: 0.6,
    radiusTop: 0.5,
    radiusBottom: 0.5,
    tube: 0.16,
    radialSegments: 48,
    tubularSegments: 64,
    widthSegments: 32,
    heightSegments: 24,
    depthSegments: 1,
  },
  cylinder: {
    width: 1,
    height: 1.1,
    depth: 1,
    radius: 0.45,
    radiusTop: 0.45,
    radiusBottom: 0.45,
    tube: 0.16,
    radialSegments: 48,
    tubularSegments: 64,
    widthSegments: 1,
    heightSegments: 1,
    depthSegments: 1,
  },
  cone: {
    width: 1,
    height: 1.2,
    depth: 1,
    radius: 0.55,
    radiusTop: 0,
    radiusBottom: 0.55,
    tube: 0.16,
    radialSegments: 48,
    tubularSegments: 64,
    widthSegments: 1,
    heightSegments: 1,
    depthSegments: 1,
  },
  torus: {
    width: 1,
    height: 1,
    depth: 1,
    radius: 0.48,
    radiusTop: 0.5,
    radiusBottom: 0.5,
    tube: 0.16,
    radialSegments: 24,
    tubularSegments: 72,
    widthSegments: 1,
    heightSegments: 1,
    depthSegments: 1,
  },
  plane: {
    width: 1.6,
    height: 1.6,
    depth: 1,
    radius: 0.5,
    radiusTop: 0.5,
    radiusBottom: 0.5,
    tube: 0.16,
    radialSegments: 24,
    tubularSegments: 64,
    widthSegments: 12,
    heightSegments: 12,
    depthSegments: 1,
  },
};

export const mergePrimitiveGeometry = (primitive: PrimitiveKind, geometry?: PrimitiveGeometry) => ({
  ...primitiveGeometryDefaults[primitive],
  ...(geometry ?? {}),
});

export const applyScaleToPrimitiveGeometry = (
  primitive: PrimitiveKind,
  geometry: PrimitiveGeometry | undefined,
  scale: Vec3,
): PrimitiveGeometry => {
  const current = mergePrimitiveGeometry(primitive, geometry);
  const [sx, sy, sz] = scale.map((axis) => Math.max(0.001, Math.abs(axis))) as Vec3;
  const radialScale = Math.max(0.001, (sx + sz) / 2);

  if (primitive === 'box') {
    return {
      ...current,
      width: current.width * sx,
      height: current.height * sy,
      depth: current.depth * sz,
    };
  }

  if (primitive === 'sphere') {
    return {
      ...current,
      radius: current.radius * Math.max(0.001, (sx + sy + sz) / 3),
    };
  }

  if (primitive === 'cylinder' || primitive === 'cone') {
    return {
      ...current,
      height: current.height * sy,
      radiusTop: current.radiusTop * radialScale,
      radiusBottom: current.radiusBottom * radialScale,
      radius: current.radius * radialScale,
    };
  }

  if (primitive === 'torus') {
    return {
      ...current,
      radius: current.radius * radialScale,
      tube: current.tube * Math.max(0.001, (sx + sy + sz) / 3),
    };
  }

  return {
    ...current,
    width: current.width * sx,
    height: current.height * sy,
  };
};
