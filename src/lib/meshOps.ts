import * as THREE from 'three';
import { mergePrimitiveGeometry } from './geometryOps';
import type { EditableMesh, PrimitiveGeometry, PrimitiveKind, SculptFalloff, SculptMode, Vec2, Vec3 } from '@/store/types';

const WELD_PRECISION = 100000;

const toVec3 = (value: THREE.Vector3): Vec3 => [
  Number(value.x.toFixed(5)),
  Number(value.y.toFixed(5)),
  Number(value.z.toFixed(5)),
];

const keyForVector = (value: THREE.Vector3) =>
  `${Math.round(value.x * WELD_PRECISION)},${Math.round(value.y * WELD_PRECISION)},${Math.round(value.z * WELD_PRECISION)}`;

const createBuilder = () => ({
  vertices: [] as Vec3[],
  indices: [] as number[],
  uvs: [] as Vec2[],
  lookup: new Map<string, number>(),
});

const appendGeometry = (
  builder: ReturnType<typeof createBuilder>,
  sourceGeometry: THREE.BufferGeometry,
  matrix = new THREE.Matrix4(),
) => {
  const positionAttribute = sourceGeometry.getAttribute('position');
  if (!positionAttribute) return;

  const uvAttribute = sourceGeometry.getAttribute('uv');
  const indexAttribute = sourceGeometry.getIndex();
  const point = new THREE.Vector3();
  const count = indexAttribute ? indexAttribute.count : positionAttribute.count;

  for (let cursor = 0; cursor < count; cursor += 1) {
    const sourceIndex = indexAttribute ? indexAttribute.getX(cursor) : cursor;
    point.fromBufferAttribute(positionAttribute, sourceIndex).applyMatrix4(matrix);

    const key = keyForVector(point);
    let vertexIndex = builder.lookup.get(key);

    if (vertexIndex === undefined) {
      vertexIndex = builder.vertices.length;
      builder.lookup.set(key, vertexIndex);
      builder.vertices.push(toVec3(point));
      builder.uvs.push(
        uvAttribute
          ? [
              Number(uvAttribute.getX(sourceIndex).toFixed(5)),
              Number(uvAttribute.getY(sourceIndex).toFixed(5)),
            ]
          : [0, 0],
      );
    }

    builder.indices.push(vertexIndex);
  }
};

export const createPrimitiveBufferGeometry = (primitive: PrimitiveKind, geometry?: PrimitiveGeometry) => {
  const config = mergePrimitiveGeometry(primitive, geometry);

  if (primitive === 'sphere') {
    return new THREE.SphereGeometry(config.radius, config.radialSegments, config.heightSegments);
  }

  if (primitive === 'cylinder') {
    return new THREE.CylinderGeometry(
      config.radiusTop,
      config.radiusBottom,
      config.height,
      config.radialSegments,
      config.heightSegments,
    );
  }

  if (primitive === 'cone') {
    return new THREE.ConeGeometry(config.radiusBottom, config.height, config.radialSegments, config.heightSegments);
  }

  if (primitive === 'torus') {
    return new THREE.TorusGeometry(config.radius, config.tube, config.radialSegments, config.tubularSegments);
  }

  if (primitive === 'plane') {
    return new THREE.PlaneGeometry(config.width, config.height, config.widthSegments, config.heightSegments);
  }

  return new THREE.BoxGeometry(
    config.width,
    config.height,
    config.depth,
    config.widthSegments,
    config.heightSegments,
    config.depthSegments,
  );
};

export const editableMeshFromBufferGeometry = (geometry: THREE.BufferGeometry): EditableMesh => {
  const builder = createBuilder();
  appendGeometry(builder, geometry);

  return {
    vertices: builder.vertices,
    indices: builder.indices,
    uvs: builder.uvs.length === builder.vertices.length ? builder.uvs : undefined,
  };
};

export const createPrimitiveEditableMesh = (primitive: PrimitiveKind, geometry?: PrimitiveGeometry) => {
  const bufferGeometry = createPrimitiveBufferGeometry(primitive, geometry);
  const mesh = editableMeshFromBufferGeometry(bufferGeometry);
  bufferGeometry.dispose();
  return mesh;
};

export const editableMeshFromObject3D = (root: THREE.Object3D): EditableMesh | null => {
  const builder = createBuilder();
  root.updateMatrixWorld(true);

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !(node.geometry instanceof THREE.BufferGeometry)) return;
    appendGeometry(builder, node.geometry, node.matrixWorld);
  });

  if (builder.vertices.length === 0 || builder.indices.length === 0) return null;

  return {
    vertices: builder.vertices,
    indices: builder.indices,
    uvs: builder.uvs.length === builder.vertices.length ? builder.uvs : undefined,
  };
};

export const editableMeshToBufferGeometry = (mesh: EditableMesh) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.vertices.flat(), 3));
  geometry.setIndex(mesh.indices);

  if (mesh.uvs?.length === mesh.vertices.length) {
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(mesh.uvs.flat(), 2));
  }

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};

export const getFaceVertexIndices = (mesh: EditableMesh, faceIndex: number) => {
  const start = faceIndex * 3;
  return Array.from(new Set(mesh.indices.slice(start, start + 3)));
};

export const getSelectionCenter = (mesh: EditableMesh, vertexIndices: number[]) => {
  if (vertexIndices.length === 0) return new THREE.Vector3();

  const center = new THREE.Vector3();
  for (const index of vertexIndices) {
    const vertex = mesh.vertices[index];
    if (!vertex) continue;
    center.add(new THREE.Vector3(vertex[0], vertex[1], vertex[2]));
  }

  return center.multiplyScalar(1 / vertexIndices.length);
};

export const translateMeshVertices = (mesh: EditableMesh, vertexIndices: number[], delta: THREE.Vector3): EditableMesh => {
  const selected = new Set(vertexIndices);

  return {
    ...mesh,
    vertices: mesh.vertices.map((vertex, index) =>
      selected.has(index)
        ? [
            Number((vertex[0] + delta.x).toFixed(5)),
            Number((vertex[1] + delta.y).toFixed(5)),
            Number((vertex[2] + delta.z).toFixed(5)),
          ]
        : [...vertex],
    ),
    indices: [...mesh.indices],
    uvs: mesh.uvs?.map((uv) => [uv[0], uv[1]]),
    mask: mesh.mask ? [...mesh.mask] : undefined,
  };
};

const vectorFromVertex = (vertex: Vec3) => new THREE.Vector3(vertex[0], vertex[1], vertex[2]);

const uvAt = (mesh: EditableMesh, index: number): Vec2 => {
  const uv = mesh.uvs?.[index];
  return uv ? [uv[0], uv[1]] : [0, 0];
};

const midpointUv = (a: Vec2, b: Vec2): Vec2 => [
  Number(((a[0] + b[0]) / 2).toFixed(5)),
  Number(((a[1] + b[1]) / 2).toFixed(5)),
];

export const getFaceNormal = (mesh: EditableMesh, faceIndex: number) => {
  const [aIndex, bIndex, cIndex] = mesh.indices.slice(faceIndex * 3, faceIndex * 3 + 3);
  const a = mesh.vertices[aIndex];
  const b = mesh.vertices[bIndex];
  const c = mesh.vertices[cIndex];

  if (!a || !b || !c) return new THREE.Vector3(0, 1, 0);

  return vectorFromVertex(b)
    .sub(vectorFromVertex(a))
    .cross(vectorFromVertex(c).sub(vectorFromVertex(a)))
    .normalize();
};

export const extrudeFace = (mesh: EditableMesh, faceIndex: number, distance = 0.35): EditableMesh => {
  const start = faceIndex * 3;
  const face = mesh.indices.slice(start, start + 3);
  if (face.length !== 3) return mesh;

  const normal = getFaceNormal(mesh, faceIndex).multiplyScalar(distance);
  const nextVertices = mesh.vertices.map((vertex) => [...vertex] as Vec3);
  const nextUvs = mesh.uvs?.map((uv) => [uv[0], uv[1]] as Vec2);
  const nextMask = mesh.mask ? [...mesh.mask] : undefined;
  const newFace: number[] = [];

  for (const index of face) {
    const vertex = mesh.vertices[index];
    if (!vertex) return mesh;

    newFace.push(nextVertices.length);
    nextVertices.push([
      Number((vertex[0] + normal.x).toFixed(5)),
      Number((vertex[1] + normal.y).toFixed(5)),
      Number((vertex[2] + normal.z).toFixed(5)),
    ]);
    nextUvs?.push(uvAt(mesh, index));
    nextMask?.push(mesh.mask?.[index] ?? 0);
  }

  const nextIndices = [...mesh.indices, newFace[0], newFace[1], newFace[2]];

  for (let cursor = 0; cursor < 3; cursor += 1) {
    const nextCursor = (cursor + 1) % 3;
    const a = face[cursor];
    const b = face[nextCursor];
    const na = newFace[cursor];
    const nb = newFace[nextCursor];
    nextIndices.push(a, b, nb, a, nb, na);
  }

  return {
    vertices: nextVertices,
    indices: nextIndices,
    uvs: nextUvs,
    mask: nextMask,
  };
};

export const deleteFace = (mesh: EditableMesh, faceIndex: number): EditableMesh => {
  const start = faceIndex * 3;

  return {
    ...mesh,
    vertices: mesh.vertices.map((vertex) => [...vertex] as Vec3),
    indices: mesh.indices.filter((_, index) => index < start || index >= start + 3),
    uvs: mesh.uvs?.map((uv) => [uv[0], uv[1]] as Vec2),
    mask: mesh.mask ? [...mesh.mask] : undefined,
  };
};

export const subdivideFace = (mesh: EditableMesh, faceIndex: number): EditableMesh => {
  const start = faceIndex * 3;
  const [aIndex, bIndex, cIndex] = mesh.indices.slice(start, start + 3);
  const a = mesh.vertices[aIndex];
  const b = mesh.vertices[bIndex];
  const c = mesh.vertices[cIndex];
  if (!a || !b || !c) return mesh;

  const nextVertices = mesh.vertices.map((vertex) => [...vertex] as Vec3);
  const nextUvs = mesh.uvs?.map((uv) => [uv[0], uv[1]] as Vec2);
  const nextMask = mesh.mask ? [...mesh.mask] : undefined;
  const addMidpoint = (firstIndex: number, secondIndex: number) => {
    const first = mesh.vertices[firstIndex];
    const second = mesh.vertices[secondIndex];
    const index = nextVertices.length;
    nextVertices.push([
      Number(((first[0] + second[0]) / 2).toFixed(5)),
      Number(((first[1] + second[1]) / 2).toFixed(5)),
      Number(((first[2] + second[2]) / 2).toFixed(5)),
    ]);
    nextUvs?.push(midpointUv(uvAt(mesh, firstIndex), uvAt(mesh, secondIndex)));
    if (nextMask) {
      const firstMask = mesh.mask?.[firstIndex] ?? 0;
      const secondMask = mesh.mask?.[secondIndex] ?? 0;
      nextMask.push(Number((((firstMask + secondMask) / 2)).toFixed(5)));
    }
    return index;
  };

  const ab = addMidpoint(aIndex, bIndex);
  const bc = addMidpoint(bIndex, cIndex);
  const ca = addMidpoint(cIndex, aIndex);
  const replacement = [aIndex, ab, ca, ab, bIndex, bc, ca, bc, cIndex, ab, bc, ca];

  return {
    vertices: nextVertices,
    indices: [...mesh.indices.slice(0, start), ...replacement, ...mesh.indices.slice(start + 3)],
    uvs: nextUvs,
    mask: nextMask,
  };
};

export const weldVertices = (mesh: EditableMesh, vertexIndices: number[]): EditableMesh => {
  const uniqueIndices = Array.from(new Set(vertexIndices));
  if (uniqueIndices.length < 2) return mesh;

  const center = getSelectionCenter(mesh, uniqueIndices);
  const selected = new Set(uniqueIndices);

  return {
    ...mesh,
    vertices: mesh.vertices.map((vertex, index) =>
      selected.has(index)
        ? [Number(center.x.toFixed(5)), Number(center.y.toFixed(5)), Number(center.z.toFixed(5))]
        : ([...vertex] as Vec3),
    ),
    indices: [...mesh.indices],
    uvs: mesh.uvs?.map((uv) => [uv[0], uv[1]] as Vec2),
    mask: mesh.mask ? [...mesh.mask] : undefined,
  };
};

const getVertexNormals = (mesh: EditableMesh) => {
  const normals = Array.from({ length: mesh.vertices.length }, () => new THREE.Vector3());

  for (let cursor = 0; cursor < mesh.indices.length; cursor += 3) {
    const aIndex = mesh.indices[cursor];
    const bIndex = mesh.indices[cursor + 1];
    const cIndex = mesh.indices[cursor + 2];
    const a = mesh.vertices[aIndex];
    const b = mesh.vertices[bIndex];
    const c = mesh.vertices[cIndex];
    if (!a || !b || !c) continue;

    const normal = vectorFromVertex(b)
      .sub(vectorFromVertex(a))
      .cross(vectorFromVertex(c).sub(vectorFromVertex(a)));

    normals[aIndex].add(normal);
    normals[bIndex].add(normal);
    normals[cIndex].add(normal);
  }

  normals.forEach((normal) => {
    if (normal.lengthSq() === 0) {
      normal.set(0, 1, 0);
    } else {
      normal.normalize();
    }
  });

  return normals;
};

const getBrushWeight = (distance: number, radius: number, falloff: SculptFalloff) => {
  if (distance > radius) return 0;
  const t = 1 - distance / radius;

  if (falloff === 'linear') return t;
  if (falloff === 'sharp') return t * t;
  if (falloff === 'sphere') return Math.sqrt(Math.max(0, 1 - (distance / radius) ** 2));

  return t * t * (3 - 2 * t);
};

const getNeighborMap = (mesh: EditableMesh) => {
  const neighbors = new Map<number, Set<number>>();
  const addNeighbor = (from: number, to: number) => {
    const current = neighbors.get(from) ?? new Set<number>();
    current.add(to);
    neighbors.set(from, current);
  };

  for (let cursor = 0; cursor < mesh.indices.length; cursor += 3) {
    const a = mesh.indices[cursor];
    const b = mesh.indices[cursor + 1];
    const c = mesh.indices[cursor + 2];
    addNeighbor(a, b);
    addNeighbor(a, c);
    addNeighbor(b, a);
    addNeighbor(b, c);
    addNeighbor(c, a);
    addNeighbor(c, b);
  }

  return neighbors;
};

export const sculptMesh = ({
  mesh,
  center,
  normal,
  radius,
  strength,
  mode,
  falloff,
  symmetryX,
  frontFacesOnly,
  viewDirection,
  accumulate,
  paintedVertices,
}: {
  mesh: EditableMesh;
  center: THREE.Vector3;
  normal: THREE.Vector3;
  radius: number;
  strength: number;
  mode: SculptMode;
  falloff: SculptFalloff;
  symmetryX: boolean;
  frontFacesOnly: boolean;
  viewDirection: THREE.Vector3;
  accumulate: boolean;
  paintedVertices?: Set<number>;
}): EditableMesh => {
  const brushNormal = normal.lengthSq() > 0 ? normal.clone().normalize() : new THREE.Vector3(0, 1, 0);
  const neighbors = mode === 'smooth' ? getNeighborMap(mesh) : null;
  const maskValues = mesh.mask ? [...mesh.mask] : new Array(mesh.vertices.length).fill(0);
  const normals = frontFacesOnly ? getVertexNormals(mesh) : null;
  const viewDir = viewDirection.lengthSq() > 0 ? viewDirection.clone().normalize() : new THREE.Vector3(0, 0, 1);
  const strokeCenters = [
    {
      center: center.clone(),
      normal: brushNormal.clone(),
    },
  ];

  if (symmetryX) {
    strokeCenters.push({
      center: new THREE.Vector3(-center.x, center.y, center.z),
      normal: new THREE.Vector3(-brushNormal.x, brushNormal.y, brushNormal.z),
    });
  }

  return {
    ...mesh,
    vertices: mesh.vertices.map((vertex, index) => {
      const current = vectorFromVertex(vertex);
      if (frontFacesOnly && normals && normals[index].dot(viewDir) <= 0) {
        return [...vertex] as Vec3;
      }

      if (!accumulate && paintedVertices?.has(index)) {
        return [...vertex] as Vec3;
      }

      const influences = strokeCenters
        .map((stroke) => ({
          ...stroke,
          weight: getBrushWeight(current.distanceTo(stroke.center), radius, falloff),
        }))
        .filter((stroke) => stroke.weight > 0);

      if (influences.length === 0) return [...vertex] as Vec3;

      paintedVertices?.add(index);

      if (mode === 'mask') {
        const maxWeight = influences.reduce((max, stroke) => Math.max(max, stroke.weight), 0);
        const nextMask = Math.max(0, Math.min(1, maskValues[index] + strength * maxWeight));
        maskValues[index] = Number(nextMask.toFixed(5));
        return [...vertex] as Vec3;
      }

      const maskFactor = 1 - (maskValues[index] ?? 0);
      if (maskFactor <= 0) return [...vertex] as Vec3;

      if (mode === 'smooth') {
        const neighborIndices = neighbors?.get(index);
        if (!neighborIndices || neighborIndices.size === 0) return [...vertex] as Vec3;

        const average = new THREE.Vector3();
        for (const neighborIndex of neighborIndices) {
          const neighbor = mesh.vertices[neighborIndex];
          if (neighbor) average.add(vectorFromVertex(neighbor));
        }
        average.multiplyScalar(1 / neighborIndices.size);

        const maxWeight = influences.reduce((max, stroke) => Math.max(max, stroke.weight), 0);
        return toVec3(current.lerp(average, Math.min(1, strength * maxWeight * maskFactor)));
      }

      if (mode === 'inflate') {
        for (const stroke of influences) {
          const direction = current.clone().sub(stroke.center);
          if (direction.lengthSq() === 0) direction.copy(stroke.normal);
          current.add(direction.normalize().multiplyScalar(strength * stroke.weight * maskFactor));
        }
        return toVec3(current);
      }

      if (mode === 'flatten') {
        for (const stroke of influences) {
          const offset = current.clone().sub(stroke.center).dot(stroke.normal);
          current.add(stroke.normal.clone().multiplyScalar(-offset * stroke.weight * 0.9 * maskFactor));
        }
        return toVec3(current);
      }

      if (mode === 'pinch') {
        for (const stroke of influences) {
          const toCenter = stroke.center.clone().sub(current);
          if (toCenter.lengthSq() > 0) {
            current.add(toCenter.normalize().multiplyScalar(strength * stroke.weight * 0.55 * maskFactor));
          }
        }
        return toVec3(current);
      }

      if (mode === 'crease') {
        for (const stroke of influences) {
          const toCenter = stroke.center.clone().sub(current);
          if (toCenter.lengthSq() > 0) {
            current.add(toCenter.normalize().multiplyScalar(strength * stroke.weight * 0.35 * maskFactor));
          }
          current.add(stroke.normal.clone().multiplyScalar(-strength * stroke.weight * 0.9 * maskFactor));
        }
        return toVec3(current);
      }

      if (mode === 'clay') {
        for (const stroke of influences) {
          current.add(stroke.normal.clone().multiplyScalar(strength * stroke.weight * 0.7 * maskFactor));
        }
        return toVec3(current);
      }

      for (const stroke of influences) {
        const direction = mode === 'pull' ? stroke.normal : stroke.normal.clone().multiplyScalar(-1);
        current.add(direction.multiplyScalar(strength * stroke.weight * maskFactor));
      }
      return toVec3(current);
    }),
    indices: [...mesh.indices],
    uvs: mesh.uvs?.map((uv) => [uv[0], uv[1]] as Vec2),
    mask: maskValues,
  };
};

export const clearMask = (mesh: EditableMesh): EditableMesh => ({
  ...mesh,
  vertices: mesh.vertices.map((vertex) => [...vertex] as Vec3),
  indices: [...mesh.indices],
  uvs: mesh.uvs?.map((uv) => [uv[0], uv[1]] as Vec2),
  mask: new Array(mesh.vertices.length).fill(0),
});

export const invertMask = (mesh: EditableMesh): EditableMesh => {
  const mask = mesh.mask ?? new Array(mesh.vertices.length).fill(0);
  return {
    ...mesh,
    vertices: mesh.vertices.map((vertex) => [...vertex] as Vec3),
    indices: [...mesh.indices],
    uvs: mesh.uvs?.map((uv) => [uv[0], uv[1]] as Vec2),
    mask: mask.map((value) => Number((1 - value).toFixed(5))),
  };
};

export const remeshDyntopoLite = (mesh: EditableMesh, passes = 2, targetEdgeLength = 0.45): EditableMesh => {
  let current = {
    ...mesh,
    vertices: mesh.vertices.map((vertex) => [...vertex] as Vec3),
    indices: [...mesh.indices],
    uvs: mesh.uvs?.map((uv) => [uv[0], uv[1]] as Vec2),
    mask: mesh.mask ? [...mesh.mask] : undefined,
  } as EditableMesh;

  const distanceAt = (aIndex: number, bIndex: number) => {
    const a = current.vertices[aIndex];
    const b = current.vertices[bIndex];
    if (!a || !b) return 0;
    return vectorFromVertex(a).distanceTo(vectorFromVertex(b));
  };

  for (let pass = 0; pass < passes; pass += 1) {
    let refinedAny = false;

    for (let faceIndex = 0; faceIndex < current.indices.length / 3; faceIndex += 1) {
      const start = faceIndex * 3;
      const a = current.indices[start];
      const b = current.indices[start + 1];
      const c = current.indices[start + 2];
      const maxEdge = Math.max(distanceAt(a, b), distanceAt(b, c), distanceAt(c, a));

      if (maxEdge > targetEdgeLength) {
        current = subdivideFace(current, faceIndex);
        refinedAny = true;
        break;
      }
    }

    if (!refinedAny) break;
  }

  return current;
};

export const subdivideMesh = (mesh: EditableMesh, iterations = 1, maxFaces = 120000): EditableMesh => {
  let current: EditableMesh = {
    ...mesh,
    vertices: mesh.vertices.map((vertex) => [...vertex] as Vec3),
    indices: [...mesh.indices],
    uvs: mesh.uvs?.map((uv) => [uv[0], uv[1]] as Vec2),
    mask: mesh.mask ? [...mesh.mask] : undefined,
  };

  const safeIterations = Math.max(1, Math.min(4, Math.round(iterations)));
  const safeMaxFaces = Math.max(2000, Math.min(200000, Math.round(maxFaces)));

  for (let pass = 0; pass < safeIterations; pass += 1) {
    const faceCount = Math.floor(current.indices.length / 3);
    if (faceCount >= safeMaxFaces) break;
    if (faceCount * 4 > safeMaxFaces) break;

    for (let faceIndex = faceCount - 1; faceIndex >= 0; faceIndex -= 1) {
      current = subdivideFace(current, faceIndex);
    }
  }

  return current;
};

export const createSelectedFaceGeometry = (mesh: EditableMesh, faceIndex: number) => {
  const start = faceIndex * 3;
  const faceIndices = mesh.indices.slice(start, start + 3);
  if (faceIndices.length !== 3) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(faceIndices.flatMap((index) => mesh.vertices[index] ?? [0, 0, 0]), 3),
  );
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();
  return geometry;
};
