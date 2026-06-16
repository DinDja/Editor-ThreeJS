import * as THREE from 'three';
import { mergePrimitiveGeometry } from './geometryOps';
import type { EditableMesh, PrimitiveGeometry, PrimitiveKind, SculptMode, Vec2, Vec3 } from '@/store/types';

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
  };
};

export const deleteFace = (mesh: EditableMesh, faceIndex: number): EditableMesh => {
  const start = faceIndex * 3;

  return {
    ...mesh,
    vertices: mesh.vertices.map((vertex) => [...vertex] as Vec3),
    indices: mesh.indices.filter((_, index) => index < start || index >= start + 3),
    uvs: mesh.uvs?.map((uv) => [uv[0], uv[1]] as Vec2),
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
  };
};

const getBrushWeight = (distance: number, radius: number) => {
  if (distance > radius) return 0;
  const falloff = 1 - distance / radius;
  return falloff * falloff * (3 - 2 * falloff);
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
}: {
  mesh: EditableMesh;
  center: THREE.Vector3;
  normal: THREE.Vector3;
  radius: number;
  strength: number;
  mode: SculptMode;
}): EditableMesh => {
  const brushNormal = normal.lengthSq() > 0 ? normal.clone().normalize() : new THREE.Vector3(0, 1, 0);
  const neighbors = mode === 'smooth' ? getNeighborMap(mesh) : null;

  return {
    ...mesh,
    vertices: mesh.vertices.map((vertex, index) => {
      const current = vectorFromVertex(vertex);
      const distance = current.distanceTo(center);
      const weight = getBrushWeight(distance, radius);
      if (weight === 0) return [...vertex] as Vec3;

      if (mode === 'smooth') {
        const neighborIndices = neighbors?.get(index);
        if (!neighborIndices || neighborIndices.size === 0) return [...vertex] as Vec3;

        const average = new THREE.Vector3();
        for (const neighborIndex of neighborIndices) {
          const neighbor = mesh.vertices[neighborIndex];
          if (neighbor) average.add(vectorFromVertex(neighbor));
        }
        average.multiplyScalar(1 / neighborIndices.size);

        return toVec3(current.lerp(average, strength * weight));
      }

      if (mode === 'inflate') {
        const direction = current.clone().sub(center);
        if (direction.lengthSq() === 0) direction.copy(brushNormal);
        current.add(direction.normalize().multiplyScalar(strength * weight));
        return toVec3(current);
      }

      const direction = mode === 'pull' ? brushNormal : brushNormal.clone().multiplyScalar(-1);
      current.add(direction.multiplyScalar(strength * weight));
      return toVec3(current);
    }),
    indices: [...mesh.indices],
    uvs: mesh.uvs?.map((uv) => [uv[0], uv[1]] as Vec2),
  };
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
