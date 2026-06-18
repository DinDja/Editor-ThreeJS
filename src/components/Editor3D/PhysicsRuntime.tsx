'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {
  computePhysicsColliderGeometry,
  getPhysicsConfig,
  getPhysicsSimulationRoots,
  transformFromObject3D,
  type PhysicsColliderGeometry,
} from '@/lib/physics';
import { useHistoryStore } from '@/store/historyStore';
import { usePhysicsStore } from '@/store/physicsStore';
import { useSceneStore } from '@/store/sceneStore';
import type { PhysicsColliderType, SceneObject, ScenePhysicsConfig, Vec3 } from '@/store/types';

type ObjectRefMap = MutableRefObject<Map<string, THREE.Object3D>>;

type RapierWorld = InstanceType<typeof RAPIER.World>;
type RapierRigidBody = ReturnType<RapierWorld['createRigidBody']>;
type RapierCollider = ReturnType<RapierWorld['createCollider']>;
type RapierColliderDesc = ReturnType<typeof RAPIER.ColliderDesc.cuboid>;

type TransformSnapshot = {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
};

type RuntimeBody = {
  objectId: string;
  object: THREE.Object3D;
  body: RapierRigidBody;
  collider: RapierCollider;
  initialLocal: TransformSnapshot;
  initialWorldScale: THREE.Vector3;
  bodyType: ScenePhysicsConfig['bodyType'];
};

type RuntimeState = {
  world: RapierWorld;
  bodies: RuntimeBody[];
  colliderToObjectId: Map<number, string>;
  sessionId: number;
};

const STEP_SECONDS = 1 / 60;
const MAX_FRAME_DELTA = 1 / 20;

const snapshotTransform = (object: THREE.Object3D): TransformSnapshot => ({
  position: object.position.clone(),
  quaternion: object.quaternion.clone(),
  scale: object.scale.clone(),
});

const restoreTransform = (object: THREE.Object3D, snapshot: TransformSnapshot) => {
  object.position.copy(snapshot.position);
  object.quaternion.copy(snapshot.quaternion);
  object.scale.copy(snapshot.scale);
  object.updateMatrixWorld(true);
};

const createBodyDesc = (physics: ScenePhysicsConfig, position: THREE.Vector3, quaternion: THREE.Quaternion, gravityEnabled: boolean) => {
  const desc =
    physics.bodyType === 'static'
      ? RAPIER.RigidBodyDesc.fixed()
      : physics.bodyType === 'kinematic'
        ? RAPIER.RigidBodyDesc.kinematicPositionBased()
        : RAPIER.RigidBodyDesc.dynamic();

  desc
    .setTranslation(position.x, position.y, position.z)
    .setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w })
    .setGravityScale(gravityEnabled ? physics.gravityScale : 0)
    .setLinearDamping(physics.linearDamping)
    .setAngularDamping(physics.angularDamping)
    .enabledTranslations(!physics.lockTranslation.x, !physics.lockTranslation.y, !physics.lockTranslation.z)
    .enabledRotations(!physics.lockRotation.x, !physics.lockRotation.y, !physics.lockRotation.z)
    .setCanSleep(false);

  if (physics.bodyType === 'dynamic') {
    desc.setCcdEnabled(true);
  }

  return desc;
};

const createBoxDesc = (geometry: PhysicsColliderGeometry) => {
  const half = geometry.size.clone().multiplyScalar(0.5);
  return RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(
    geometry.center.x,
    geometry.center.y,
    geometry.center.z,
  );
};

const createShapeDesc = (
  colliderType: PhysicsColliderType,
  physics: ScenePhysicsConfig,
  geometry: PhysicsColliderGeometry,
): RapierColliderDesc => {
  const half = geometry.size.clone().multiplyScalar(0.5);
  const center = geometry.center;
  let desc: RapierColliderDesc | null = null;

  if (colliderType === 'sphere') {
    const radius = Math.max(half.x, half.y, half.z, 0.001);
    desc = RAPIER.ColliderDesc.ball(radius).setTranslation(center.x, center.y, center.z);
  }

  if (colliderType === 'capsule') {
    const radius = Math.max(half.x, half.z, 0.001);
    const halfHeight = Math.max(half.y - radius, 0.001);
    desc = RAPIER.ColliderDesc.capsule(halfHeight, radius).setTranslation(center.x, center.y, center.z);
  }

  if (colliderType === 'cylinder') {
    const radius = Math.max(half.x, half.z, 0.001);
    desc = RAPIER.ColliderDesc.cylinder(Math.max(half.y, 0.001), radius).setTranslation(center.x, center.y, center.z);
  }

  if (colliderType === 'convexHull' || (colliderType === 'mesh' && physics.bodyType === 'dynamic')) {
    desc = geometry.vertices.length >= 12 ? RAPIER.ColliderDesc.convexHull(geometry.vertices) : null;
  }

  if (colliderType === 'mesh' && physics.bodyType !== 'dynamic' && geometry.indices.length >= 3) {
    desc = RAPIER.ColliderDesc.trimesh(geometry.vertices, geometry.indices);
  }

  return (desc ?? createBoxDesc(geometry))
    .setFriction(physics.friction)
    .setRestitution(physics.restitution)
    .setSensor(physics.isTrigger)
    .setMass(Math.max(physics.mass, 0.001));
};

const decomposeWorldToLocal = (
  object: THREE.Object3D,
  worldPosition: THREE.Vector3,
  worldQuaternion: THREE.Quaternion,
  worldScale: THREE.Vector3,
) => {
  const worldMatrix = new THREE.Matrix4().compose(worldPosition, worldQuaternion, worldScale);
  const parent = object.parent;

  if (!parent) {
    worldMatrix.decompose(object.position, object.quaternion, object.scale);
    object.updateMatrixWorld(true);
    return;
  }

  parent.updateWorldMatrix(true, false);
  const localMatrix = parent.matrixWorld.clone().invert().multiply(worldMatrix);
  localMatrix.decompose(object.position, object.quaternion, object.scale);
  object.updateMatrixWorld(true);
};

const syncRuntimeBodies = (runtime: RuntimeState) => {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();

  runtime.bodies.forEach((entry) => {
    const bodyPosition = entry.body.translation();
    const bodyRotation = entry.body.rotation();
    position.set(bodyPosition.x, bodyPosition.y, bodyPosition.z);
    quaternion.set(bodyRotation.x, bodyRotation.y, bodyRotation.z, bodyRotation.w);
    decomposeWorldToLocal(entry.object, position, quaternion, entry.initialWorldScale);
  });
};

const restoreRuntimeBodies = (runtime: RuntimeState | null) => {
  runtime?.bodies.forEach((entry) => restoreTransform(entry.object, entry.initialLocal));
};

const freeRuntime = (runtime: RuntimeState | null) => {
  runtime?.world.free();
};

function PhysicsWorldDebug() {
  const showDebug = usePhysicsStore((state) => state.showDebug);
  const gravityEnabled = usePhysicsStore((state) => state.gravityEnabled);
  const contactPoints = usePhysicsStore((state) => state.contactPoints);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    if (!showDebug) return;

    const direction = new THREE.Vector3(0, gravityEnabled ? -1 : 0, 0);
    if (direction.lengthSq() === 0) direction.set(0, -1, 0);
    const arrow = new THREE.ArrowHelper(direction.normalize(), new THREE.Vector3(-2.5, 3, -2.5), 1.6, '#38bdf8', 0.28, 0.16);
    arrow.userData.isHelper = true;
    scene.add(arrow);

    return () => {
      scene.remove(arrow);
      arrow.dispose();
    };
  }, [gravityEnabled, scene, showDebug]);

  if (!showDebug || contactPoints.length === 0) return null;

  return (
    <group userData={{ isHelper: true }}>
      {contactPoints.map((point) => (
        <mesh key={point.id} position={point.position}>
          <sphereGeometry args={[0.055, 10, 10]} />
          <meshBasicMaterial color="#fb7185" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function PhysicsRuntime({
  objects,
  objectRefs,
}: {
  objects: SceneObject[];
  objectRefs: ObjectRefMap;
}) {
  const runtimeRef = useRef<RuntimeState | null>(null);
  const objectsRef = useRef(objects);
  const accumulatorRef = useRef(0);
  const lastStepVersionRef = useRef(0);
  const lastImpulseVersionRef = useRef(0);
  const contactClockRef = useRef(0);
  const [rapierReady, setRapierReady] = useState(false);
  const updateObject = useSceneStore((state) => state.updateObject);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const sessionId = usePhysicsStore((state) => state.sessionId);
  const resetVersion = usePhysicsStore((state) => state.resetVersion);
  const stopVersion = usePhysicsStore((state) => state.stopVersion);
  const applyVersion = usePhysicsStore((state) => state.applyVersion);

  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  const buildRuntime = useCallback((sessionId: number) => {
    const physicsState = usePhysicsStore.getState();
    const roots = getPhysicsSimulationRoots(objectsRef.current);
    const world = new RAPIER.World({ x: 0, y: physicsState.gravityEnabled ? -9.81 : 0, z: 0 });
    world.timestep = STEP_SECONDS;
    world.numSolverIterations = 8;
    world.maxCcdSubsteps = 1;

    const bodies: RuntimeBody[] = [];
    const colliderToObjectId = new Map<number, string>();

    roots.forEach((sceneObject) => {
      const object = objectRefs.current.get(sceneObject.uuid);
      if (!object) return;

      const physics = getPhysicsConfig(sceneObject);
      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();

      object.updateWorldMatrix(true, true);
      object.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

      const body = world.createRigidBody(createBodyDesc(physics, worldPosition, worldQuaternion, physicsState.gravityEnabled));
      const colliderGeometry = computePhysicsColliderGeometry(object, {
        collectMesh: physics.colliderType === 'mesh' || physics.colliderType === 'convexHull',
      });
      const collider = world.createCollider(createShapeDesc(physics.colliderType, physics, colliderGeometry), body);
      colliderToObjectId.set(collider.handle, sceneObject.uuid);
      bodies.push({
        objectId: sceneObject.uuid,
        object,
        body,
        collider,
        initialLocal: snapshotTransform(object),
        initialWorldScale: worldScale.clone(),
        bodyType: physics.bodyType,
      });
    });

    const nextRuntime: RuntimeState = { world, bodies, colliderToObjectId, sessionId };
    freeRuntime(runtimeRef.current);
    runtimeRef.current = nextRuntime;
    accumulatorRef.current = 0;
    contactClockRef.current = 0;
    usePhysicsStore.getState().setContactPoints([]);
    syncRuntimeBodies(nextRuntime);
  }, [objectRefs]);

  useEffect(() => {
    let cancelled = false;
    RAPIER.init().then(() => {
      if (!cancelled) setRapierReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!rapierReady) return;
    const state = usePhysicsStore.getState();
    if (state.mode !== 'simulation' || state.sessionId === 0) return;
    buildRuntime(state.sessionId);
  }, [buildRuntime, rapierReady, sessionId]);

  useEffect(() => {
    if (!rapierReady) return;
    const state = usePhysicsStore.getState();
    if (state.mode !== 'simulation') return;
    restoreRuntimeBodies(runtimeRef.current);
    buildRuntime(state.sessionId);
  }, [buildRuntime, rapierReady, resetVersion]);

  useEffect(() => {
    restoreRuntimeBodies(runtimeRef.current);
    freeRuntime(runtimeRef.current);
    runtimeRef.current = null;
    accumulatorRef.current = 0;
  }, [stopVersion]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    pushSnapshot();
    syncRuntimeBodies(runtime);
    runtime.bodies.forEach((entry) => {
      updateObject(entry.objectId, transformFromObject3D(entry.object));
    });
    freeRuntime(runtime);
    runtimeRef.current = null;
    accumulatorRef.current = 0;
    usePhysicsStore.getState().finalizeApplySimulation();
  }, [applyVersion, pushSnapshot, updateObject]);

  useEffect(
    () => () => {
      freeRuntime(runtimeRef.current);
      runtimeRef.current = null;
    },
    [],
  );

  useFrame((_, delta) => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const physicsState = usePhysicsStore.getState();
    runtime.world.gravity = { x: 0, y: physicsState.gravityEnabled ? -9.81 : 0, z: 0 };

    const impulseRequest = physicsState.impulseRequest;
    if (impulseRequest && impulseRequest.version !== lastImpulseVersionRef.current) {
      lastImpulseVersionRef.current = impulseRequest.version;
      const target = runtime.bodies.find((entry) => entry.objectId === impulseRequest.objectId && entry.bodyType === 'dynamic');
      if (target) {
        target.body.applyImpulse(
          { x: impulseRequest.impulse[0], y: impulseRequest.impulse[1], z: impulseRequest.impulse[2] },
          true,
        );
        physicsState.markSimulationResult();
      }
    }

    let shouldSync = false;
    const stepWorld = () => {
      runtime.world.step();
      shouldSync = true;
      physicsState.markSimulationResult();
    };

    if (physicsState.mode === 'simulation' && physicsState.playback === 'playing') {
      accumulatorRef.current += Math.min(delta, MAX_FRAME_DELTA);
      while (accumulatorRef.current >= STEP_SECONDS) {
        stepWorld();
        accumulatorRef.current -= STEP_SECONDS;
      }
    }

    if (physicsState.mode === 'simulation' && physicsState.stepVersion !== lastStepVersionRef.current) {
      lastStepVersionRef.current = physicsState.stepVersion;
      stepWorld();
    }

    if (shouldSync) {
      syncRuntimeBodies(runtime);
    }

    if (physicsState.showDebug) {
      contactClockRef.current += delta;
      if (contactClockRef.current > 0.12) {
        contactClockRef.current = 0;
        const points: Array<{ id: string; position: Vec3 }> = [];
        const seen = new Set<string>();

        runtime.bodies.forEach((entry) => {
          runtime.world.contactPairsWith(entry.collider, (other) => {
            const otherId = runtime.colliderToObjectId.get(other.handle);
            if (!otherId || otherId === entry.objectId) return;
            const key = [entry.objectId, otherId].sort().join('|');
            if (seen.has(key)) return;
            seen.add(key);
            const a = entry.collider.translation();
            const b = other.translation();
            points.push({
              id: key,
              position: [
                Number(((a.x + b.x) * 0.5).toFixed(5)),
                Number(((a.y + b.y) * 0.5).toFixed(5)),
                Number(((a.z + b.z) * 0.5).toFixed(5)),
              ],
            });
          });
        });

        usePhysicsStore.getState().setContactPoints(points.slice(0, 24));
      }
    } else if (physicsState.contactPoints.length > 0) {
      usePhysicsStore.getState().setContactPoints([]);
    }
  });

  return <PhysicsWorldDebug />;
}

function PhysicsMeshWire({ geometryData }: { geometryData: PhysicsColliderGeometry }) {
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute('position', new THREE.BufferAttribute(geometryData.vertices, 3));
    if (geometryData.indices.length > 0) next.setIndex(new THREE.BufferAttribute(geometryData.indices, 1));
    next.computeBoundingSphere();
    return next;
  }, [geometryData]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.35} depthWrite={false} />
    </mesh>
  );
}

export function PhysicsColliderDebug({
  object,
  rootRef,
}: {
  object: SceneObject;
  rootRef: MutableRefObject<THREE.Object3D | null>;
}) {
  const showColliders = usePhysicsStore((state) => state.showColliders);
  const showDebug = usePhysicsStore((state) => state.showDebug);
  const [geometryData, setGeometryData] = useState<PhysicsColliderGeometry | null>(null);
  const signatureRef = useRef('');
  const frameRef = useRef(0);
  const physics = getPhysicsConfig(object);
  const visible = physics.enabled && (showColliders || showDebug);

  useFrame(() => {
    if (!visible || !rootRef.current) return;
    frameRef.current += 1;
    if (frameRef.current % 24 !== 1 && geometryData) return;

    const next = computePhysicsColliderGeometry(rootRef.current, {
      collectMesh: physics.colliderType === 'mesh' || physics.colliderType === 'convexHull',
      maxVertices: 12000,
    });
    const signature = [
      physics.colliderType,
      next.vertexCount,
      next.triangleCount,
      next.center.toArray().map((value) => value.toFixed(3)).join(','),
      next.size.toArray().map((value) => value.toFixed(3)).join(','),
    ].join('|');

    if (signature !== signatureRef.current) {
      signatureRef.current = signature;
      setGeometryData(next);
    }
  });

  if (!visible || !geometryData) return null;

  const center = geometryData.center.toArray() as Vec3;
  const size = geometryData.size;
  const half = size.clone().multiplyScalar(0.5);
  const radius = Math.max(half.x, half.z, 0.001);
  const sphereRadius = Math.max(half.x, half.y, half.z, 0.001);

  return (
    <group userData={{ isHelper: true }}>
      {physics.colliderType === 'box' && (
        <mesh position={center}>
          <boxGeometry args={[size.x, size.y, size.z]} />
          <meshBasicMaterial color="#34d399" wireframe transparent opacity={0.38} depthWrite={false} />
        </mesh>
      )}
      {physics.colliderType === 'sphere' && (
        <mesh position={center}>
          <sphereGeometry args={[sphereRadius, 24, 12]} />
          <meshBasicMaterial color="#34d399" wireframe transparent opacity={0.38} depthWrite={false} />
        </mesh>
      )}
      {physics.colliderType === 'capsule' && (
        <mesh position={center}>
          <cylinderGeometry args={[radius, radius, Math.max(size.y, 0.001), 24, 1, true]} />
          <meshBasicMaterial color="#34d399" wireframe transparent opacity={0.38} depthWrite={false} />
        </mesh>
      )}
      {physics.colliderType === 'cylinder' && (
        <mesh position={center}>
          <cylinderGeometry args={[radius, radius, Math.max(size.y, 0.001), 24, 1, true]} />
          <meshBasicMaterial color="#34d399" wireframe transparent opacity={0.38} depthWrite={false} />
        </mesh>
      )}
      {(physics.colliderType === 'mesh' || physics.colliderType === 'convexHull') && geometryData.vertices.length > 0 ? (
        <PhysicsMeshWire geometryData={geometryData} />
      ) : null}
      {showDebug && (
        <mesh position={center}>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

export default PhysicsRuntime;
