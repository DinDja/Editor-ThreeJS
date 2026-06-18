import * as THREE from 'three';
import type { EditableMesh, Vec3 } from '@/store/types';
import { sculptMesh, subdivideMesh } from './meshOps';

type NimVertex = [number, number, number];
type NimFace = [number, number, number];

const toVec3 = (v: NimVertex): Vec3 => [
  Number(v[0].toFixed(5)),
  Number(v[1].toFixed(5)),
  Number(v[2].toFixed(5)),
];

export const buildEditableMeshFromAiData = (
  vertices: NimVertex[],
  faces: NimFace[],
): EditableMesh => {
  const meshVertices: Vec3[] = vertices.map(toVec3);
  const meshIndices: number[] = [];
  for (const face of faces) {
    meshIndices.push(face[0], face[1], face[2]);
  }

  let mesh: EditableMesh = {
    vertices: meshVertices,
    indices: meshIndices,
  };

  const faceCount = Math.floor(mesh.indices.length / 3);
  if (faceCount < 3000) {
    mesh = subdivideMesh(mesh, 2, 8000);
  }

  mesh = smoothMeshSurface(mesh, 2);

  return mesh;
};

const computeBoundingBox = (mesh: EditableMesh) => {
  const min = new THREE.Vector3(Infinity, Infinity, Infinity);
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

  for (const vertex of mesh.vertices) {
    min.x = Math.min(min.x, vertex[0]);
    min.y = Math.min(min.y, vertex[1]);
    min.z = Math.min(min.z, vertex[2]);
    max.x = Math.max(max.x, vertex[0]);
    max.y = Math.max(max.y, vertex[1]);
    max.z = Math.max(max.z, vertex[2]);
  }

  const size = new THREE.Vector3().subVectors(max, min);
  const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
  return { min, max, size, center, radius: size.length() / 2 };
};

const smoothMeshSurface = (mesh: EditableMesh, passes: number): EditableMesh => {
  if (mesh.vertices.length === 0) return mesh;
  const { radius } = computeBoundingBox(mesh);
  if (radius <= 0.001) return mesh;

  let current = mesh;

  for (let pass = 0; pass < passes; pass += 1) {
    const center = computeBoundingBox(current).center;
    current = sculptMesh({
      mesh: current,
      center,
      normal: new THREE.Vector3(0, 1, 0),
      radius: radius * 1.5,
      strength: 0.6,
      mode: 'smooth',
      falloff: 'smooth',
      symmetryX: false,
      frontFacesOnly: false,
      viewDirection: new THREE.Vector3(0, 0, 1),
      accumulate: false,
    });
  }

  return current;
};

export const seedForObject = (name: string, index: number) => {
  let hash = 0;
  const source = `${name}:${index}`;
  for (let cursor = 0; cursor < source.length; cursor += 1) {
    hash = (hash * 31 + source.charCodeAt(cursor)) | 0;
  }
  return Math.abs(hash) + 1;
};
