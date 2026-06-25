import * as THREE from 'three';
import type { Vec3, EditableMesh } from '@/store/types';

export type Draw3DMode = 'stroke' | 'polyline' | 'shape' | 'surface' | 'extrude';

export type Draw3DPlane = 'camera' | 'xy' | 'xz' | 'yz' | 'surface';

export type Draw3DConfig = {
  mode: Draw3DMode;
  radius: number;
  smoothing: number;
  tubularSegments: number;
  radialSegments: number;
  extrudeDepth: number;
  autoConvertToMesh: boolean;
  autoClose: boolean;
  plane: Draw3DPlane;
  color: string;
  metalness: number;
  roughness: number;
};

const CLOSE_THRESHOLD = 0.08;

export const DEFAULT_DRAW3D_CONFIG: Draw3DConfig = {
  mode: 'stroke',
  radius: 0.05,
  smoothing: 0.5,
  tubularSegments: 64,
  radialSegments: 8,
  extrudeDepth: 1,
  autoConvertToMesh: true,
  autoClose: false,
  plane: 'xz',
  color: '#f8fafc',
  metalness: 0,
  roughness: 0.55,
};

export function shouldCloseOutline(points: Vec3[]): boolean {
  if (points.length < 3) return false;
  const first = new THREE.Vector3(...points[0]);
  const last = new THREE.Vector3(...points[points.length - 1]);
  return first.distanceTo(last) < CLOSE_THRESHOLD;
}

function pointsToVector3Array(points: Vec3[]): THREE.Vector3[] {
  return points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
}

function smoothPoints(points: THREE.Vector3[], smoothing: number): THREE.Vector3[] {
  if (smoothing <= 0 || points.length < 3) return points;

  const result = [points[0].clone()];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const avg = new THREE.Vector3(
      prev.x * smoothing + curr.x * (1 - smoothing * 2) + next.x * smoothing,
      prev.y * smoothing + curr.y * (1 - smoothing * 2) + next.y * smoothing,
      prev.z * smoothing + curr.z * (1 - smoothing * 2) + next.z * smoothing,
    );
    result.push(avg);
  }
  result.push(points[points.length - 1].clone());
  return result;
}

function reducePoints(points: THREE.Vector3[], minDistance: number): THREE.Vector3[] {
  if (points.length < 2) return points;
  const result = [points[0]];
  for (let i = 1; i < points.length; i++) {
    if (points[i].distanceTo(result[result.length - 1]) >= minDistance) {
      result.push(points[i].clone());
    }
  }
  if (result.length > 1 && result[result.length - 1].distanceTo(points[points.length - 1]) > 0.001) {
    result.push(points[points.length - 1].clone());
  }
  return result;
}

export function strokeToBufferGeometry(
  points: Vec3[],
  config: Draw3DConfig,
): THREE.BufferGeometry | null {
  if (points.length < 2) return null;

  const vectors = pointsToVector3Array(points);
  const smoothed = smoothPoints(vectors, config.smoothing);
  const reduced = reducePoints(smoothed, config.radius * 0.3);

  if (reduced.length < 2) return null;

  const curve = new THREE.CatmullRomCurve3(reduced, false, 'centripetal', 0.5);
  const geometry = new THREE.TubeGeometry(
    curve,
    Math.max(4, Math.min(config.tubularSegments, reduced.length * 4)),
    Math.max(0.005, config.radius),
    Math.max(3, config.radialSegments),
    false,
  );

  return geometry;
}

export function polylineToBufferGeometry(
  points: Vec3[],
  config: Draw3DConfig,
): THREE.BufferGeometry | null {
  if (points.length < 2) return null;

  const vectors = pointsToVector3Array(points);
  const curve = new THREE.CatmullRomCurve3(vectors, false, 'centripetal', 0);
  const geometry = new THREE.TubeGeometry(
    curve,
    Math.max(2, points.length - 1),
    Math.max(0.005, config.radius),
    Math.max(3, config.radialSegments),
    false,
  );

  return geometry;
}

export function shapeOutlineToBufferGeometry(
  points: Vec3[],
  config: Draw3DConfig,
  plane: Draw3DPlane,
): THREE.BufferGeometry | null {
  if (points.length < 3) return null;

  let closedPoints = [...points];
  const first = new THREE.Vector3(...points[0]);
  const last = new THREE.Vector3(...points[points.length - 1]);
  if (first.distanceTo(last) > CLOSE_THRESHOLD) {
    closedPoints.push(points[0]);
  }

  const frame = computeLocalFrame(closedPoints);
  if (!frame) return null;

  const local2D = projectToLocal2D(closedPoints, frame);

  const shape = new THREE.Shape();
  shape.moveTo(local2D[0][0], local2D[0][1]);
  for (let i = 1; i < local2D.length; i++) {
    shape.lineTo(local2D[i][0], local2D[i][1]);
  }

  const shapeGeometry = new THREE.ShapeGeometry(shape, Math.max(1, Math.floor(config.tubularSegments / 8)));
  const worldMatrix = frameToMatrix4(frame);
  shapeGeometry.applyMatrix4(worldMatrix);

  return shapeGeometry;
}

export function extrudeOutlineToBufferGeometry(
  points: Vec3[],
  config: Draw3DConfig,
  plane: Draw3DPlane,
): THREE.BufferGeometry | null {
  if (points.length < 3) return null;

  let closedPoints = [...points];
  const first = new THREE.Vector3(...points[0]);
  const last = new THREE.Vector3(...points[points.length - 1]);
  if (first.distanceTo(last) > CLOSE_THRESHOLD) {
    closedPoints.push(points[0]);
  }

  const frame = computeLocalFrame(closedPoints);
  if (!frame) return null;

  const local2D = projectToLocal2D(closedPoints, frame);

  const shape = new THREE.Shape();
  shape.moveTo(local2D[0][0], local2D[0][1]);
  for (let i = 1; i < local2D.length; i++) {
    shape.lineTo(local2D[i][0], local2D[i][1]);
  }

  const extrudeGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, config.extrudeDepth),
    bevelEnabled: false,
    steps: 1,
  });

  const worldMatrix = frameToMatrix4(frame);
  extrudeGeometry.applyMatrix4(worldMatrix);

  return extrudeGeometry;
}

export function surfacePatchToBufferGeometry(
  points: Vec3[],
  config: Draw3DConfig,
  plane: Draw3DPlane,
): THREE.BufferGeometry | null {
  if (points.length < 3) return null;

  const frame = computeLocalFrame(points);
  if (!frame) return null;

  const local2D = projectToLocal2D(points, frame);

  const hull = convexHull2D(local2D);
  if (hull.length < 3) return null;

  const shape = new THREE.Shape();
  shape.moveTo(hull[0][0], hull[0][1]);
  for (let i = 1; i < hull.length; i++) {
    shape.lineTo(hull[i][0], hull[i][1]);
  }
  shape.closePath();

  const subdivU = Math.max(1, Math.min(16, Math.floor(config.tubularSegments / 4)));
  const subdivV = Math.max(1, Math.min(16, Math.floor(config.tubularSegments / 4)));
  const shapeGeometry = new THREE.ShapeGeometry(shape, subdivU);
  const worldMatrix = frameToMatrix4(frame);
  shapeGeometry.applyMatrix4(worldMatrix);

  return shapeGeometry;
}

function computeLocalFrame(points: Vec3[]): { normal: THREE.Vector3; uAxis: THREE.Vector3; vAxis: THREE.Vector3; origin: THREE.Vector3 } | null {
  if (points.length < 3) return null;

  const center = new THREE.Vector3();
  for (const p of points) center.add(new THREE.Vector3(...p));
  center.divideScalar(points.length);

  const normal = new THREE.Vector3();
  for (let i = 0; i < points.length; i++) {
    const curr = new THREE.Vector3(...points[i]);
    const next = new THREE.Vector3(...points[(i + 1) % points.length]);
    normal.add(
      new THREE.Vector3().crossVectors(
        curr.clone().sub(center),
        next.clone().sub(center),
      ),
    );
  }
  if (normal.lengthSq() < 1e-10) return null;
  normal.normalize();

  const uAxis = new THREE.Vector3(...points[1]).sub(new THREE.Vector3(...points[0]));
  if (uAxis.lengthSq() < 1e-10) return null;
  uAxis.normalize();

  const vAxis = new THREE.Vector3().crossVectors(normal, uAxis).normalize();

  return { normal, uAxis, vAxis, origin: new THREE.Vector3(...points[0]) };
}

function projectToLocal2D(points: Vec3[], frame: { uAxis: THREE.Vector3; vAxis: THREE.Vector3; origin: THREE.Vector3 }): [number, number][] {
  return points.map((p) => {
    const v = new THREE.Vector3(...p).sub(frame.origin);
    return [v.dot(frame.uAxis), v.dot(frame.vAxis)];
  });
}

function frameToMatrix4(frame: { normal: THREE.Vector3; uAxis: THREE.Vector3; vAxis: THREE.Vector3; origin: THREE.Vector3 }): THREE.Matrix4 {
  const m = new THREE.Matrix4();
  m.makeBasis(frame.uAxis, frame.vAxis, frame.normal);
  m.setPosition(frame.origin);
  return m;
}

function convexHull2D(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points;

  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: [number, number][] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: [number, number][] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

export function draw3DToBufferGeometry(
  points: Vec3[],
  config: Draw3DConfig,
): THREE.BufferGeometry | null {
  switch (config.mode) {
    case 'stroke':
      return strokeToBufferGeometry(points, config);
    case 'polyline':
      return polylineToBufferGeometry(points, config);
    case 'shape':
      return shapeOutlineToBufferGeometry(points, config, config.plane);
    case 'surface':
      return surfacePatchToBufferGeometry(points, config, config.plane);
    case 'extrude':
      return extrudeOutlineToBufferGeometry(points, config, config.plane);
    default:
      return null;
  }
}

export function bufferGeometryToEditableMesh(geometry: THREE.BufferGeometry): EditableMesh | null {
  const posAttr = geometry.getAttribute('position');
  const indexAttr = geometry.getIndex();

  if (!posAttr) return null;

  const vertices: Vec3[] = [];
  for (let i = 0; i < posAttr.count; i++) {
    vertices.push([posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)]);
  }

  let indices: number[];
  if (indexAttr) {
    indices = [];
    for (let i = 0; i < indexAttr.count; i++) {
      indices.push(indexAttr.getX(i));
    }
  } else {
    indices = [];
    for (let i = 0; i < posAttr.count; i++) {
      indices.push(i);
    }
  }

  return { vertices, indices };
}

export function createDrawPlaneNormal(plane: Draw3DPlane, camera?: THREE.Camera): THREE.Vector3 {
  switch (plane) {
    case 'xz':
      return new THREE.Vector3(0, 1, 0);
    case 'xy':
      return new THREE.Vector3(0, 0, 1);
    case 'yz':
      return new THREE.Vector3(1, 0, 0);
    case 'camera':
      if (camera) {
        return camera.getWorldDirection(new THREE.Vector3()).negate().normalize();
      }
      return new THREE.Vector3(0, 1, 0);
    case 'surface':
      return new THREE.Vector3(0, 1, 0);
    default:
      return new THREE.Vector3(0, 1, 0);
  }
}

export function createDrawPlane(
  plane: Draw3DPlane,
  camera?: THREE.Camera,
  origin?: THREE.Vector3,
  surfaceNormal?: THREE.Vector3,
): THREE.Plane {
  const normal = plane === 'surface' && surfaceNormal
    ? surfaceNormal.clone().normalize()
    : createDrawPlaneNormal(plane, camera);

  const planeObj = new THREE.Plane();
  planeObj.setFromNormalAndCoplanarPoint(normal, origin ?? new THREE.Vector3(0, 0, 0));
  return planeObj;
}

export function applySnapGrid(point: THREE.Vector3, snapStep: number): THREE.Vector3 {
  if (snapStep <= 0) return point;
  return new THREE.Vector3(
    Math.round(point.x / snapStep) * snapStep,
    Math.round(point.y / snapStep) * snapStep,
    Math.round(point.z / snapStep) * snapStep,
  );
}
