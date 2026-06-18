import * as THREE from 'three';
import {
  DEFAULT_PHYSICS_CONFIG,
  type PhysicsAxisLocks,
  type PhysicsBodyType,
  type PhysicsColliderType,
  type SceneObject,
  type ScenePhysicsConfig,
  type SceneTransform,
  type Vec3,
} from '@/store/types';

export const PHYSICS_BODY_TYPES: PhysicsBodyType[] = ['dynamic', 'static', 'kinematic'];

export const PHYSICS_COLLIDER_TYPES: PhysicsColliderType[] = ['box', 'sphere', 'capsule', 'cylinder', 'mesh', 'convexHull'];

export const PHYSICS_BODY_LABELS: Record<PhysicsBodyType, string> = {
  dynamic: 'Dinamico',
  static: 'Estatico',
  kinematic: 'Cinematico',
};

export const PHYSICS_COLLIDER_LABELS: Record<PhysicsColliderType, string> = {
  box: 'Box',
  sphere: 'Sphere',
  capsule: 'Capsule',
  cylinder: 'Cylinder',
  mesh: 'Mesh',
  convexHull: 'Convex hull',
};

export type PhysicsColliderGeometry = {
  bounds: THREE.Box3;
  center: THREE.Vector3;
  size: THREE.Vector3;
  vertices: Float32Array;
  indices: Uint32Array;
  triangleCount: number;
  vertexCount: number;
  hasRenderableGeometry: boolean;
};

const BODY_TYPE_SET = new Set<PhysicsBodyType>(PHYSICS_BODY_TYPES);
const COLLIDER_TYPE_SET = new Set<PhysicsColliderType>(PHYSICS_COLLIDER_TYPES);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const numberOr = (value: unknown, fallback: number, min = -Infinity, max = Infinity) => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
};

const normalizeLocks = (value: unknown, fallback: PhysicsAxisLocks): PhysicsAxisLocks => {
  if (!isRecord(value)) return { ...fallback };

  return {
    x: typeof value.x === 'boolean' ? value.x : fallback.x,
    y: typeof value.y === 'boolean' ? value.y : fallback.y,
    z: typeof value.z === 'boolean' ? value.z : fallback.z,
  };
};

export const normalizePhysicsConfig = (value: unknown): ScenePhysicsConfig => {
  if (!isRecord(value)) {
    return {
      ...DEFAULT_PHYSICS_CONFIG,
      lockTranslation: { ...DEFAULT_PHYSICS_CONFIG.lockTranslation },
      lockRotation: { ...DEFAULT_PHYSICS_CONFIG.lockRotation },
    };
  }

  const bodyType = BODY_TYPE_SET.has(value.bodyType as PhysicsBodyType)
    ? (value.bodyType as PhysicsBodyType)
    : DEFAULT_PHYSICS_CONFIG.bodyType;
  const colliderType = COLLIDER_TYPE_SET.has(value.colliderType as PhysicsColliderType)
    ? (value.colliderType as PhysicsColliderType)
    : DEFAULT_PHYSICS_CONFIG.colliderType;

  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : DEFAULT_PHYSICS_CONFIG.enabled,
    bodyType,
    colliderType,
    mass: numberOr(value.mass, DEFAULT_PHYSICS_CONFIG.mass, 0.001, 100000),
    friction: numberOr(value.friction, DEFAULT_PHYSICS_CONFIG.friction, 0, 10),
    restitution: numberOr(value.restitution, DEFAULT_PHYSICS_CONFIG.restitution, 0, 1),
    linearDamping: numberOr(value.linearDamping, DEFAULT_PHYSICS_CONFIG.linearDamping, 0, 100),
    angularDamping: numberOr(value.angularDamping, DEFAULT_PHYSICS_CONFIG.angularDamping, 0, 100),
    gravityScale: numberOr(value.gravityScale, DEFAULT_PHYSICS_CONFIG.gravityScale, -10, 10),
    isTrigger: typeof value.isTrigger === 'boolean' ? value.isTrigger : DEFAULT_PHYSICS_CONFIG.isTrigger,
    lockTranslation: normalizeLocks(value.lockTranslation, DEFAULT_PHYSICS_CONFIG.lockTranslation),
    lockRotation: normalizeLocks(value.lockRotation, DEFAULT_PHYSICS_CONFIG.lockRotation),
  };
};

export const inferDefaultColliderType = (object: SceneObject): PhysicsColliderType => {
  if (object.primitive === 'sphere') return 'sphere';
  if (object.primitive === 'cylinder') return 'cylinder';
  if (object.primitive === 'plane') return 'box';
  return 'box';
};

export const createDefaultPhysicsConfig = (object?: SceneObject): ScenePhysicsConfig => ({
  ...DEFAULT_PHYSICS_CONFIG,
  enabled: true,
  bodyType: object?.primitive === 'plane' ? 'static' : DEFAULT_PHYSICS_CONFIG.bodyType,
  colliderType: object ? inferDefaultColliderType(object) : DEFAULT_PHYSICS_CONFIG.colliderType,
  lockTranslation: { ...DEFAULT_PHYSICS_CONFIG.lockTranslation },
  lockRotation: { ...DEFAULT_PHYSICS_CONFIG.lockRotation },
});

export const getPhysicsConfig = (object: SceneObject | null | undefined) =>
  normalizePhysicsConfig(object?.metadata?.physics);

export const isPhysicsEnabled = (object: SceneObject | null | undefined) =>
  Boolean(object && getPhysicsConfig(object).enabled);

export const canObjectUsePhysics = (object: SceneObject) =>
  !object.effect && !object.lightConfig && object.type !== 'Light' && object.type !== 'Camera';

export const hasEnabledPhysicsAncestor = (objects: SceneObject[], object: SceneObject) => {
  let parentId = object.parentId ?? object.parent;

  while (parentId) {
    const parent = objects.find((item) => item.uuid === parentId);
    if (!parent) return false;
    if (isPhysicsEnabled(parent)) return true;
    parentId = parent.parentId ?? parent.parent;
  }

  return false;
};

export const isPhysicsSimulationRoot = (objects: SceneObject[], object: SceneObject) =>
  isPhysicsEnabled(object) && canObjectUsePhysics(object) && !hasEnabledPhysicsAncestor(objects, object);

export const getPhysicsSimulationRoots = (objects: SceneObject[]) =>
  objects.filter((object) => isPhysicsSimulationRoot(objects, object));

export const getPhysicsWarnings = (object: SceneObject, objects: SceneObject[] = []) => {
  const physics = getPhysicsConfig(object);
  const warnings: string[] = [];

  if (!canObjectUsePhysics(object)) {
    warnings.push('Este tipo de item nao possui geometria fisica simulavel nesta versao.');
    return warnings;
  }

  if (!physics.enabled) return warnings;

  if (hasEnabledPhysicsAncestor(objects, object)) {
    warnings.push('Um ancestral ja possui fisica ativa; durante a simulacao o corpo pai controla esta subarvore.');
  }

  if (physics.bodyType === 'dynamic' && physics.colliderType === 'mesh') {
    warnings.push('Mesh collider dinamico pode ficar instavel; o runtime usa convex hull quando necessario.');
  }

  if (physics.isTrigger) {
    warnings.push('Trigger detecta intersecoes, mas nao empurra outros corpos.');
  }

  if (object.kind === 'group' && object.children.length === 0) {
    warnings.push('Grupo vazio usa um box collider padrao ate receber geometria filha.');
  }

  if (object.effect) {
    warnings.push('Particulas, fluido, smoke e cloth ficam reservados para os proximos modulos de simulacao.');
  }

  return warnings;
};

export const vec3FromThree = (value: THREE.Vector3 | THREE.Euler): Vec3 => [
  Number(value.x.toFixed(5)),
  Number(value.y.toFixed(5)),
  Number(value.z.toFixed(5)),
];

export const transformFromObject3D = (object: THREE.Object3D): SceneTransform => ({
  position: vec3FromThree(object.position),
  rotation: vec3FromThree(object.rotation),
  scale: vec3FromThree(object.scale),
});

const expandBoundsFromPoint = (bounds: THREE.Box3, point: THREE.Vector3) => {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) return;
  bounds.expandByPoint(point);
};

const addFallbackBounds = (bounds: THREE.Box3) => {
  bounds.expandByPoint(new THREE.Vector3(-0.5, -0.5, -0.5));
  bounds.expandByPoint(new THREE.Vector3(0.5, 0.5, 0.5));
};

export const computePhysicsColliderGeometry = (
  root: THREE.Object3D,
  options: { collectMesh?: boolean; maxVertices?: number } = {},
): PhysicsColliderGeometry => {
  const collectMesh = options.collectMesh ?? true;
  const maxVertices = options.maxVertices ?? 30000;
  const bounds = new THREE.Box3();
  const vertices: number[] = [];
  const indices: number[] = [];
  root.updateWorldMatrix(true, true);
  const bodyInverse = root.matrixWorld.clone().invert();
  const tempVertex = new THREE.Vector3();
  const localMatrix = new THREE.Matrix4();
  let hasRenderableGeometry = false;
  let vertexCount = 0;
  let triangleCount = 0;

  root.traverse((node) => {
    if (node.userData?.isHelper) return;
    if (!(node instanceof THREE.Mesh)) return;

    const geometry = node.geometry;
    const position = geometry.getAttribute('position');
    if (!position) return;

    hasRenderableGeometry = true;
    node.updateWorldMatrix(true, false);
    localMatrix.copy(bodyInverse).multiply(node.matrixWorld);

    const canCollectMesh = collectMesh && vertices.length / 3 + position.count <= maxVertices;
    const vertexOffset = vertices.length / 3;

    for (let i = 0; i < position.count; i += 1) {
      tempVertex.fromBufferAttribute(position, i).applyMatrix4(localMatrix);
      expandBoundsFromPoint(bounds, tempVertex);
      vertexCount += 1;

      if (canCollectMesh) {
        vertices.push(tempVertex.x, tempVertex.y, tempVertex.z);
      }
    }

    if (!canCollectMesh) return;

    const index = geometry.getIndex();
    if (index) {
      for (let i = 0; i + 2 < index.count; i += 3) {
        indices.push(
          vertexOffset + index.getX(i),
          vertexOffset + index.getX(i + 1),
          vertexOffset + index.getX(i + 2),
        );
        triangleCount += 1;
      }
      return;
    }

    for (let i = 0; i + 2 < position.count; i += 3) {
      indices.push(vertexOffset + i, vertexOffset + i + 1, vertexOffset + i + 2);
      triangleCount += 1;
    }
  });

  if (bounds.isEmpty()) {
    addFallbackBounds(bounds);
  }

  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());

  return {
    bounds,
    center,
    size: new THREE.Vector3(
      Math.max(size.x, 0.001),
      Math.max(size.y, 0.001),
      Math.max(size.z, 0.001),
    ),
    vertices: new Float32Array(vertices),
    indices: new Uint32Array(indices),
    triangleCount,
    vertexCount,
    hasRenderableGeometry,
  };
};
