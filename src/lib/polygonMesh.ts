import * as THREE from 'three';
import type { EditableMesh, Vec3 } from '@/store/types';

export type VertexId = string;
export type EdgeId = string;
export type FaceId = string;

export type PolygonVertex = {
  id: VertexId;
  position: Vec3;
};

export type PolygonEdge = {
  id: EdgeId;
  a: VertexId;
  b: VertexId;
  faces: FaceId[];
};

export type PolygonFace = {
  id: FaceId;
  vertices: VertexId[];
  edges: EdgeId[];
  normal?: Vec3;
  materialId?: string | null;
};

export type PolygonMesh = {
  id: string;
  name: string;
  vertices: Map<VertexId, PolygonVertex>;
  edges: Map<EdgeId, PolygonEdge>;
  faces: Map<FaceId, PolygonFace>;
};

export type PolygonMeshSnapshot = {
  id: string;
  name: string;
  vertices: Array<{ id: VertexId; position: Vec3 }>;
  edges: Array<{ id: EdgeId; a: VertexId; b: VertexId; faces: FaceId[] }>;
  faces: Array<{ id: FaceId; vertices: VertexId[]; edges: EdgeId[]; materialId?: string | null }>;
};

let idCounter = 0;

const nextId = (prefix: string) => {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}`;
};

export const createPolygonMesh = (id?: string, name = 'Polygon Mesh'): PolygonMesh => ({
  id: id ?? nextId('mesh'),
  name,
  vertices: new Map(),
  edges: new Map(),
  faces: new Map(),
});

export const clonePolygonMesh = (mesh: PolygonMesh): PolygonMesh => ({
  id: mesh.id,
  name: mesh.name,
  vertices: new Map(
    Array.from(mesh.vertices.entries()).map(([id, v]) => [id, { ...v, position: [...v.position] as Vec3 }]),
  ),
  edges: new Map(
    Array.from(mesh.edges.entries()).map(([id, e]) => [id, { ...e, faces: [...e.faces] }]),
  ),
  faces: new Map(
    Array.from(mesh.faces.entries()).map(([id, f]) => [id, { ...f, vertices: [...f.vertices], edges: [...f.edges] }]),
  ),
});

export const toSnapshot = (mesh: PolygonMesh): PolygonMeshSnapshot => ({
  id: mesh.id,
  name: mesh.name,
  vertices: Array.from(mesh.vertices.values()).map((v) => ({ id: v.id, position: [...v.position] as Vec3 })),
  edges: Array.from(mesh.edges.values()).map((e) => ({ id: e.id, a: e.a, b: e.b, faces: [...e.faces] })),
  faces: Array.from(mesh.faces.values()).map((f) => ({
    id: f.id,
    vertices: [...f.vertices],
    edges: [...f.edges],
    materialId: f.materialId ?? null,
  })),
});

export const fromSnapshot = (snapshot: PolygonMeshSnapshot): PolygonMesh => {
  const mesh = createPolygonMesh(snapshot.id, snapshot.name);
  for (const v of snapshot.vertices) mesh.vertices.set(v.id, { id: v.id, position: [...v.position] as Vec3 });
  for (const e of snapshot.edges) mesh.edges.set(e.id, { id: e.id, a: e.a, b: e.b, faces: [...e.faces] });
  for (const f of snapshot.faces) {
    mesh.faces.set(f.id, {
      id: f.id,
      vertices: [...f.vertices],
      edges: [...f.edges],
      materialId: f.materialId ?? undefined,
    });
  }
  return mesh;
};

const edgeKeyFor = (a: VertexId, b: VertexId) => {
  const [x, y] = a < b ? [a, b] : [b, a];
  return `${x}|${y}`;
};

export const addVertex = (mesh: PolygonMesh, position: Vec3): VertexId => {
  const id = nextId('v');
  mesh.vertices.set(id, { id, position: [...position] as Vec3 });
  return id;
};

export const findEdge = (mesh: PolygonMesh, a: VertexId, b: VertexId): EdgeId | null => {
  for (const edge of mesh.edges.values()) {
    if ((edge.a === a && edge.b === b) || (edge.a === b && edge.b === a)) return edge.id;
  }
  return null;
};

export const addEdge = (mesh: PolygonMesh, a: VertexId, b: VertexId): EdgeId | null => {
  if (a === b) return null;
  const existing = findEdge(mesh, a, b);
  if (existing) return existing;
  const id = nextId('e');
  mesh.edges.set(id, { id, a, b, faces: [] });
  return id;
};

const removeEdge = (mesh: PolygonMesh, edgeId: EdgeId) => {
  mesh.edges.delete(edgeId);
};

export const triangulateFace = (vertexIds: VertexId[]): VertexId[][] => {
  if (vertexIds.length < 3) return [];
  const tris: VertexId[][] = [];
  for (let i = 1; i < vertexIds.length - 1; i += 1) {
    tris.push([vertexIds[0], vertexIds[i], vertexIds[i + 1]]);
  }
  return tris;
};

export const addFace = (mesh: PolygonMesh, vertexIds: VertexId[]): FaceId | null => {
  if (vertexIds.length < 3) return null;
  const unique = Array.from(new Set(vertexIds));
  if (unique.length < 3) return null;

  const id = nextId('f');
  const edgeIds: EdgeId[] = [];
  for (let i = 0; i < unique.length; i += 1) {
    const a = unique[i];
    const b = unique[(i + 1) % unique.length];
    const edgeId = addEdge(mesh, a, b);
    if (!edgeId) continue;
    edgeIds.push(edgeId);
    const edge = mesh.edges.get(edgeId);
    if (edge && !edge.faces.includes(id)) edge.faces.push(id);
  }

  mesh.faces.set(id, { id, vertices: unique, edges: edgeIds });
  return id;
};

export const removeFace = (mesh: PolygonMesh, faceId: FaceId) => {
  const face = mesh.faces.get(faceId);
  if (!face) return;
  for (const edgeId of face.edges) {
    const edge = mesh.edges.get(edgeId);
    if (!edge) continue;
    edge.faces = edge.faces.filter((f) => f !== faceId);
    if (edge.faces.length === 0) removeEdge(mesh, edgeId);
  }
  mesh.faces.delete(faceId);
};

export const removeVertex = (mesh: PolygonMesh, vertexId: VertexId) => {
  const edgesToRemove: EdgeId[] = [];
  const facesToRemove: FaceId[] = [];
  for (const edge of mesh.edges.values()) {
    if (edge.a === vertexId || edge.b === vertexId) {
      edgesToRemove.push(edge.id);
      for (const f of edge.faces) facesToRemove.push(f);
    }
  }
  for (const f of Array.from(new Set(facesToRemove))) removeFace(mesh, f);
  for (const e of edgesToRemove) removeEdge(mesh, e);
  mesh.vertices.delete(vertexId);
};

export const getAdjacentVertices = (mesh: PolygonMesh, vertexId: VertexId): VertexId[] => {
  const result = new Set<VertexId>();
  for (const edge of mesh.edges.values()) {
    if (edge.a === vertexId) result.add(edge.b);
    if (edge.b === vertexId) result.add(edge.a);
  }
  return Array.from(result);
};

export const getFacesOfVertex = (mesh: PolygonMesh, vertexId: VertexId): FaceId[] => {
  const result: FaceId[] = [];
  for (const face of mesh.faces.values()) {
    if (face.vertices.includes(vertexId)) result.push(face.id);
  }
  return result;
};

export const getEdgesOfFace = (mesh: PolygonMesh, faceId: FaceId): EdgeId[] => {
  return mesh.faces.get(faceId)?.edges ?? [];
};

export const getAdjacentFaces = (mesh: PolygonMesh, faceId: FaceId): FaceId[] => {
  const face = mesh.faces.get(faceId);
  if (!face) return [];
  const result = new Set<FaceId>();
  for (const edgeId of face.edges) {
    const edge = mesh.edges.get(edgeId);
    if (!edge) continue;
    for (const f of edge.faces) if (f !== faceId) result.add(f);
  }
  return Array.from(result);
};

export const edgeLoopSelect = (
  mesh: PolygonMesh,
  startEdgeId: EdgeId,
  maxSteps = 256,
): EdgeId[] => {
  const startEdge = mesh.edges.get(startEdgeId);
  if (!startEdge) return [];

  const getLoopDirection = (edgeId: EdgeId, fromFaceId: FaceId | null): EdgeId | null => {
    const edge = mesh.edges.get(edgeId);
    if (!edge) return null;
    const faces = edge.faces;
    if (faces.length !== 2) return null;
    const nextFaceId = faces.find((f) => f !== fromFaceId);
    if (!nextFaceId) return null;
    const face = mesh.faces.get(nextFaceId);
    if (!face) return null;
    const edgeIndex = face.edges.indexOf(edgeId);
    if (edgeIndex < 0) return null;
    const oppositeEdgeId = face.edges[(edgeIndex + 2) % face.edges.length];
    return oppositeEdgeId;
  };

  const walk = (direction: 'forward' | 'backward'): EdgeId[] => {
    const path: EdgeId[] = [];
    const visited = new Set<EdgeId>();
    let current: EdgeId | null = startEdgeId;
    let fromFace: FaceId | null = null;
    let steps = 0;
    while (current && !visited.has(current) && steps < maxSteps) {
      visited.add(current);
      path.push(current);
      const edge = mesh.edges.get(current);
      if (!edge) break;
      const faces = edge.faces;
      const nextFace = faces.find((f) => f !== fromFace) ?? faces[0];
      if (!nextFace) break;
      const face = mesh.faces.get(nextFace);
      if (!face) break;
      const edgeIndex = face.edges.indexOf(current);
      if (edgeIndex < 0) break;
      current = face.edges[(edgeIndex + 2) % face.edges.length];
      fromFace = nextFace;
      steps += 1;
      if (current === startEdgeId) break;
    }
    return direction === 'forward' ? path : path.reverse();
  };

  const forward = walk('forward');
  const backward = walk('backward').filter((id) => id !== startEdgeId);
  return [...backward, ...forward];
};

export const edgeRingSelect = (
  mesh: PolygonMesh,
  startEdgeId: EdgeId,
  maxSteps = 256,
): EdgeId[] => {
  const result: EdgeId[] = [];
  const visited = new Set<EdgeId>();
  let current: EdgeId | null = startEdgeId;
  let steps = 0;
  while (current && !visited.has(current) && steps < maxSteps) {
    visited.add(current);
    result.push(current);
    const edge = mesh.edges.get(current);
    if (!edge || edge.faces.length !== 2) break;
    const face = mesh.faces.get(edge.faces[0]);
    if (!face) break;
    const edgeIndex = face.edges.indexOf(current);
    if (edgeIndex < 0) break;
    const oppositeEdgeId = face.edges[(edgeIndex + 1) % face.edges.length];
    const oppositeEdge = mesh.edges.get(oppositeEdgeId);
    if (!oppositeEdge || oppositeEdge.faces.length !== 2) break;
    const nextFaceId = oppositeEdge.faces.find((f) => f !== face.id);
    if (!nextFaceId) break;
    const nextFace = mesh.faces.get(nextFaceId);
    if (!nextFace) break;
    const oppIndex = nextFace.edges.indexOf(oppositeEdgeId);
    if (oppIndex < 0) break;
    current = nextFace.edges[(oppIndex + 1) % nextFace.edges.length];
    steps += 1;
  }
  return result;
};

export const polygonMeshToEditableMesh = (mesh: PolygonMesh): EditableMesh => {
  const vertexIdToIndex = new Map<VertexId, number>();
  const vertices: Vec3[] = [];
  for (const v of mesh.vertices.values()) {
    vertexIdToIndex.set(v.id, vertices.length);
    vertices.push([...v.position] as Vec3);
  }

  const indices: number[] = [];
  const faceMaterialIds: Array<string | null> = [];
  for (const face of mesh.faces.values()) {
    const tris = triangulateFace(face.vertices);
    for (const tri of tris) {
      const a = vertexIdToIndex.get(tri[0]);
      const b = vertexIdToIndex.get(tri[1]);
      const c = vertexIdToIndex.get(tri[2]);
      if (a === undefined || b === undefined || c === undefined) continue;
      indices.push(a, b, c);
      faceMaterialIds.push(face.materialId ?? null);
    }
  }

  return {
    vertices,
    indices,
    faceMaterialIds: faceMaterialIds.length > 0 ? faceMaterialIds : undefined,
  };
};

export const editableMeshToPolygonMesh = (
  mesh: EditableMesh,
  id?: string,
  name = 'Converted Mesh',
): PolygonMesh => {
  const polyMesh = createPolygonMesh(id, name);
  const vertexKeyToId = new Map<string, VertexId>();
  const indexToVertexId: VertexId[] = [];

  for (let i = 0; i < mesh.vertices.length; i += 1) {
    const v = mesh.vertices[i];
    const key = `${v[0].toFixed(5)},${v[1].toFixed(5)},${v[2].toFixed(5)}`;
    let vid = vertexKeyToId.get(key);
    if (!vid) {
      vid = addVertex(polyMesh, v);
      vertexKeyToId.set(key, vid);
    }
    indexToVertexId.push(vid);
  }

  const faceCount = Math.floor(mesh.indices.length / 3);
  for (let f = 0; f < faceCount; f += 1) {
    const a = indexToVertexId[mesh.indices[f * 3]];
    const b = indexToVertexId[mesh.indices[f * 3 + 1]];
    const c = indexToVertexId[mesh.indices[f * 3 + 2]];
    if (!a || !b || !c) continue;
    const materialId = mesh.faceMaterialIds?.[f] ?? null;
    const faceId = addFace(polyMesh, [a, b, c]);
    if (faceId && materialId) {
      const face = polyMesh.faces.get(faceId);
      if (face) face.materialId = materialId;
    }
  }

  return polyMesh;
};

export const computeFaceNormal = (mesh: PolygonMesh, faceId: FaceId): Vec3 => {
  const face = mesh.faces.get(faceId);
  if (!face || face.vertices.length < 3) return [0, 1, 0];
  const a = mesh.vertices.get(face.vertices[0])?.position;
  const b = mesh.vertices.get(face.vertices[1])?.position;
  const c = mesh.vertices.get(face.vertices[2])?.position;
  if (!a || !b || !c) return [0, 1, 0];
  const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
  const n = ab.cross(ac).normalize();
  return [n.x, n.y, n.z];
};

export const flipFaceNormal = (mesh: PolygonMesh, faceId: FaceId) => {
  const face = mesh.faces.get(faceId);
  if (!face) return;
  face.vertices.reverse();
  face.edges.reverse();
};

export const mergeVerticesByDistance = (mesh: PolygonMesh, threshold = 0.0001): number => {
  const positions = Array.from(mesh.vertices.values());
  const merged = new Map<VertexId, VertexId>();
  let mergeCount = 0;

  for (let i = 0; i < positions.length; i += 1) {
    if (merged.has(positions[i].id)) continue;
    for (let j = i + 1; j < positions.length; j += 1) {
      if (merged.has(positions[j].id)) continue;
      const a = positions[i].position;
      const b = positions[j].position;
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      const dz = a[2] - b[2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) <= threshold) {
        merged.set(positions[j].id, positions[i].id);
        mergeCount += 1;
      }
    }
  }

  if (mergeCount === 0) return 0;

  for (const edge of mesh.edges.values()) {
    edge.a = merged.get(edge.a) ?? edge.a;
    edge.b = merged.get(edge.b) ?? edge.b;
  }
  for (const face of mesh.faces.values()) {
    face.vertices = face.vertices.map((v) => merged.get(v) ?? v);
    face.vertices = Array.from(new Set(face.vertices));
  }
  for (const [id] of merged) mesh.vertices.delete(id);

  const deadEdges: EdgeId[] = [];
  for (const edge of mesh.edges.values()) {
    if (edge.a === edge.b) deadEdges.push(edge.id);
  }
  for (const eid of deadEdges) removeEdge(mesh, eid);

  return mergeCount;
};

export const bridgeEdges = (
  mesh: PolygonMesh,
  edgeAId: EdgeId,
  edgeBId: EdgeId,
): FaceId[] => {
  const edgeA = mesh.edges.get(edgeAId);
  const edgeB = mesh.edges.get(edgeBId);
  if (!edgeA || !edgeB) return [];

  const a1 = edgeA.a;
  const a2 = edgeA.b;
  const b1 = edgeB.a;
  const b2 = edgeB.b;

  const face1Id = addFace(mesh, [a1, a2, b2, b1]);
  const face2Id = addFace(mesh, [a2, a1, b1, b2]);

  return [face1Id, face2Id].filter((id): id is FaceId => id !== null);
};

export const fillFace = (mesh: PolygonMesh, vertexIds: VertexId[]): FaceId | null => {
  if (vertexIds.length < 3) return null;
  return addFace(mesh, vertexIds);
};

export const insetFace = (mesh: PolygonMesh, faceId: FaceId, inset = 0.2): FaceId[] => {
  const face = mesh.faces.get(faceId);
  if (!face || face.vertices.length < 3) return [];

  const positions = face.vertices.map((vid) => mesh.vertices.get(vid)?.position);
  if (positions.some((p) => !p)) return [];

  const center: Vec3 = [0, 0, 0];
  for (const p of positions) {
    center[0] += p![0];
    center[1] += p![1];
    center[2] += p![2];
  }
  center[0] /= positions.length;
  center[1] /= positions.length;
  center[2] /= positions.length;

  const newVertexIds: VertexId[] = [];
  for (const vid of face.vertices) {
    const p = mesh.vertices.get(vid)!.position;
    const np: Vec3 = [
      p[0] + (center[0] - p[0]) * inset,
      p[1] + (center[1] - p[1]) * inset,
      p[2] + (center[2] - p[2]) * inset,
    ];
    newVertexIds.push(addVertex(mesh, np));
  }

  removeFace(mesh, faceId);
  const newCenterFaceId = addFace(mesh, newVertexIds);
  const sideFaceIds: FaceId[] = [];
  for (let i = 0; i < face.vertices.length; i += 1) {
    const next = (i + 1) % face.vertices.length;
    const sideId = addFace(mesh, [
      face.vertices[i],
      face.vertices[next],
      newVertexIds[next],
      newVertexIds[i],
    ]);
    if (sideId) sideFaceIds.push(sideId);
  }
  return newCenterFaceId ? [newCenterFaceId, ...sideFaceIds] : sideFaceIds;
};

export const getEdgeLength = (mesh: PolygonMesh, edgeId: EdgeId): number => {
  const edge = mesh.edges.get(edgeId);
  if (!edge) return 0;
  const a = mesh.vertices.get(edge.a)?.position;
  const b = mesh.vertices.get(edge.b)?.position;
  if (!a || !b) return 0;
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
};

export const getFaceArea = (mesh: PolygonMesh, faceId: FaceId): number => {
  const face = mesh.faces.get(faceId);
  if (!face) return 0;
  const tris = triangulateFace(face.vertices);
  let area = 0;
  for (const tri of tris) {
    const a = mesh.vertices.get(tri[0])?.position;
    const b = mesh.vertices.get(tri[1])?.position;
    const c = mesh.vertices.get(tri[2])?.position;
    if (!a || !b || !c) continue;
    const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    area += ab.cross(ac).length() / 2;
  }
  return area;
};

export const getStats = (mesh: PolygonMesh) => {
  let tris = 0;
  let quads = 0;
  let ngons = 0;
  for (const face of mesh.faces.values()) {
    if (face.vertices.length === 3) tris += 1;
    else if (face.vertices.length === 4) quads += 1;
    else ngons += 1;
  }
  return {
    vertices: mesh.vertices.size,
    edges: mesh.edges.size,
    faces: mesh.faces.size,
    tris,
    quads,
    ngons,
  };
};

const lineLineIntersection2D = (
  p1: Vec3, p2: Vec3, p3: Vec3, p4: Vec3,
): { t: number; u: number } | null => {
  const x1 = p1[0]; const y1 = p1[1];
  const x2 = p2[0]; const y2 = p2[1];
  const x3 = p3[0]; const y3 = p3[1];
  const x4 = p4[0]; const y4 = p4[1];

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { t, u };
};

const planeNormal = (a: Vec3, b: Vec3, c: Vec3): Vec3 => {
  const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n: Vec3 = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ];
  const len = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
  if (len < 1e-10) return [0, 1, 0];
  return [n[0] / len, n[1] / len, n[2] / len];
};

const pointSideOfPlane = (point: Vec3, planePoint: Vec3, normal: Vec3): number => {
  const d: Vec3 = [point[0] - planePoint[0], point[1] - planePoint[1], point[2] - planePoint[2]];
  return d[0] * normal[0] + d[1] * normal[1] + d[2] * normal[2];
};

export const knifeCut = (
  mesh: PolygonMesh,
  cutStart: Vec3,
  cutEnd: Vec3,
): { newVertices: VertexId[]; newFaces: FaceId[] } => {
  const newVertices: VertexId[] = [];
  const newFaces: FaceId[] = [];

  const facesToProcess = Array.from(mesh.faces.values());
  for (const face of facesToProcess) {
    if (face.vertices.length < 3) continue;

    const positions = face.vertices.map((vid) => mesh.vertices.get(vid)?.position).filter(Boolean) as Vec3[];
    if (positions.length < 3) continue;

    const normal = planeNormal(positions[0], positions[1], positions[2]);

    const sideStart = pointSideOfPlane(cutStart, positions[0], normal);
    const sideEnd = pointSideOfPlane(cutEnd, positions[0], normal);
    if (Math.abs(sideStart) > 1e-6 || Math.abs(sideEnd) > 1e-6) continue;

    const intersections: Array<{ edgeIndex: number; t: number; point: Vec3 }> = [];
    for (let i = 0; i < positions.length; i += 1) {
      const a = positions[i];
      const b = positions[(i + 1) % positions.length];
      const result = lineLineIntersection2D(cutStart, cutEnd, a, b);
      if (result) {
        const point: Vec3 = [
          a[0] + (b[0] - a[0]) * result.u,
          a[1] + (b[1] - a[1]) * result.u,
          a[2] + (b[2] - a[2]) * result.u,
        ];
        intersections.push({ edgeIndex: i, t: result.u, point });
      }
    }

    if (intersections.length < 2) continue;

    intersections.sort((a, b) => a.edgeIndex - b.edgeIndex);
    const [i1, i2] = intersections;
    const v1 = addVertex(mesh, i1.point);
    const v2 = addVertex(mesh, i2.point);
    newVertices.push(v1, v2);

    removeFace(mesh, face.id);

    const faceVerts = face.vertices;
    const e1 = i1.edgeIndex;
    const e2 = i2.edgeIndex;

    const polyA: VertexId[] = [];
    for (let i = 0; i <= e1; i += 1) polyA.push(faceVerts[i]);
    polyA.push(v1);
    polyA.push(v2);
    for (let i = e2 + 1; i < faceVerts.length; i += 1) polyA.push(faceVerts[i]);

    const polyB: VertexId[] = [];
    polyB.push(v1);
    for (let i = e1 + 1; i <= e2; i += 1) polyB.push(faceVerts[i]);
    polyB.push(v2);

    const fa = addFace(mesh, polyA);
    const fb = addFace(mesh, polyB);
    if (fa) newFaces.push(fa);
    if (fb) newFaces.push(fb);
  }

  return { newVertices, newFaces };
};

