'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BehaviorConfig, BehaviorKind, SceneObject } from '@/store/types';

export const BEHAVIOR_KINDS: BehaviorKind[] = ['jump', 'walk', 'accelerate', 'roll', 'gravity', 'bubble', 'massDeform'];

export const BEHAVIOR_LABELS: Record<BehaviorKind, string> = {
  jump: 'Pular',
  walk: 'Andar',
  accelerate: 'Acelerar',
  roll: 'Rolar',
  gravity: 'Gravidade',
  bubble: 'Bolha',
  massDeform: 'Massa (Deformar)',
};

export const BEHAVIOR_DEFAULTS: Record<BehaviorKind, BehaviorConfig> = {
  jump: { type: 'jump', enabled: false, jumpHeight: 1.5, jumpCooldown: 1.2 },
  walk: { type: 'walk', enabled: false, walkSpeed: 1.5, walkAmplitude: 0.15, walkFrequency: 4 },
  accelerate: { type: 'accelerate', enabled: false, acceleration: 1.5, maxSpeed: 5 },
  roll: { type: 'roll', enabled: false, rollSpeed: 2, rollAxis: 'z' },
  gravity: { type: 'gravity', enabled: false, gravityStrength: 9.8, groundY: 0 },
  bubble: { type: 'bubble', enabled: false, bubbleAmplitude: 0.3, bubbleFrequency: 1.2 },
  massDeform: { type: 'massDeform', enabled: false, deformStrength: 0.3, deformReturnSpeed: 5 },
};

type BehaviorState = {
  jumpElapsed: number;
  jumpStartY: number | null;
  velocityY: number;
  velocityX: number;
  velocityZ: number;
  bubbleOffset: number;
  deformSquash: number;
};

function createState(): BehaviorState {
  return {
    jumpElapsed: 999,
    jumpStartY: null,
    velocityY: 0,
    velocityX: 0,
    velocityZ: 0,
    bubbleOffset: Math.random() * Math.PI * 2,
    deformSquash: 0,
  };
}

function applyJump(group: THREE.Group, config: BehaviorConfig, state: BehaviorState, delta: number) {
  const height = config.jumpHeight ?? 1.5;
  const cooldown = config.jumpCooldown ?? 1.2;
  const duration = cooldown * 0.6;

  state.jumpElapsed += delta;

  if (state.jumpElapsed > cooldown) {
    state.jumpElapsed = 0;
    state.jumpStartY = group.position.y;
  }

  if (state.jumpElapsed < duration && state.jumpStartY !== null) {
    const t = state.jumpElapsed / duration;
    group.position.y = state.jumpStartY + Math.sin(t * Math.PI) * height;
  }
}

function applyWalk(group: THREE.Group, config: BehaviorConfig, _state: BehaviorState, delta: number, elapsed: number) {
  const amplitude = config.walkAmplitude ?? 0.15;
  const frequency = config.walkFrequency ?? 4;
  const speed = config.walkSpeed ?? 1.5;

  const phase = elapsed * frequency;
  group.position.y += Math.abs(Math.sin(phase)) * amplitude;
  group.rotation.z = Math.sin(phase * 2) * amplitude * 0.5;
  group.position.x += Math.sin(phase * 0.5) * speed * delta * 0.3;
}

function applyAccelerate(group: THREE.Group, config: BehaviorConfig, state: BehaviorState, delta: number) {
  const accel = config.acceleration ?? 1.5;
  const maxSpeed = config.maxSpeed ?? 5;

  state.velocityZ += accel * delta;
  state.velocityZ = Math.min(state.velocityZ, maxSpeed);

  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyQuaternion(group.quaternion);
  group.position.add(forward.multiplyScalar(state.velocityZ * delta));
}

function applyRoll(group: THREE.Group, config: BehaviorConfig, _state: BehaviorState, delta: number) {
  const speed = config.rollSpeed ?? 2;
  const axis = config.rollAxis ?? 'z';
  const dir = new THREE.Vector3(axis === 'x' ? 1 : 0, 0, axis === 'z' ? 1 : 0);
  group.rotateOnWorldAxis(dir, speed * delta);
}

function applyGravity(group: THREE.Group, config: BehaviorConfig, state: BehaviorState, delta: number) {
  const strength = config.gravityStrength ?? 9.8;
  const groundY = config.groundY ?? 0;

  state.velocityY -= strength * delta;
  const nextY = group.position.y + state.velocityY * delta;

  if (nextY <= groundY) {
    group.position.y = groundY;
    state.velocityY = 0;
  } else {
    group.position.y = nextY;
  }
}

function applyBubble(group: THREE.Group, config: BehaviorConfig, state: BehaviorState, delta: number, elapsed: number) {
  const amplitude = config.bubbleAmplitude ?? 0.3;
  const frequency = config.bubbleFrequency ?? 1.2;

  state.bubbleOffset += delta;
  const phase = state.bubbleOffset * frequency;

  group.position.x += Math.sin(elapsed * 0.7 + phase) * amplitude * delta;
  group.position.y += Math.sin(elapsed * 1.1 + phase * 0.8) * amplitude * delta * 0.5;
  group.position.z += Math.cos(elapsed * 0.5 + phase * 1.3) * amplitude * delta;
  group.rotation.x = Math.sin(elapsed * 0.9 + phase) * amplitude * 0.3;
  group.rotation.z = Math.cos(elapsed * 0.6 + phase * 0.7) * amplitude * 0.3;

  group.position.y += 0.15 * delta;
}

function applyMassDeform(group: THREE.Group, config: BehaviorConfig, state: BehaviorState, delta: number) {
  const strength = config.deformStrength ?? 0.3;
  const returnSpeed = config.deformReturnSpeed ?? 5;

  state.deformSquash += (0 - state.deformSquash) * Math.min(1, returnSpeed * delta);

  const velocityMag = Math.abs(state.velocityY) + Math.abs(state.velocityX) + Math.abs(state.velocityZ);
  if (velocityMag > 0.1) {
    state.deformSquash += velocityMag * strength * delta;
  }

  if (state.velocityY === 0) {
    state.deformSquash += 0.15;
  }

  const squash = Math.max(-0.5, Math.min(0.5, state.deformSquash));
  const stretch = squash * 0.5;
  const origScale = group.userData.origScale as THREE.Vector3;

  group.scale.set(
    origScale.x + stretch,
    origScale.y - squash,
    origScale.z + stretch,
  );
}

export function BehaviorEngine({ object, groupRef }: { object: SceneObject; groupRef: React.RefObject<THREE.Group | null> }) {
  const stateRef = useRef<BehaviorState>(createState());

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const behaviors = object.behaviors;
    if (!behaviors || behaviors.length === 0) return;

    const enabledBehaviors = behaviors.filter((b) => b.enabled);
    if (enabledBehaviors.length === 0) return;

    if (!group.userData.origScale) {
      group.userData.origScale = group.scale.clone();
    }

    const elapsed = state.clock.elapsedTime;
    const st = stateRef.current;

    for (const behavior of enabledBehaviors) {
      switch (behavior.type) {
        case 'jump':
          applyJump(group, behavior, st, delta);
          break;
        case 'walk':
          applyWalk(group, behavior, st, delta, elapsed);
          break;
        case 'accelerate':
          applyAccelerate(group, behavior, st, delta);
          break;
        case 'roll':
          applyRoll(group, behavior, st, delta);
          break;
        case 'gravity':
          applyGravity(group, behavior, st, delta);
          break;
        case 'bubble':
          applyBubble(group, behavior, st, delta, elapsed);
          break;
        case 'massDeform':
          applyMassDeform(group, behavior, st, delta);
          break;
      }
    }

    const hasJump = enabledBehaviors.some((b) => b.type === 'jump');
    const hasAccel = enabledBehaviors.some((b) => b.type === 'accelerate');
    const hasGravity = enabledBehaviors.some((b) => b.type === 'gravity');
    const hasMass = enabledBehaviors.some((b) => b.type === 'massDeform');

    if (!hasJump) {
      st.jumpStartY = null;
      st.jumpElapsed = 999;
    }
    if (!hasAccel) {
      st.velocityX = 0;
      st.velocityZ = 0;
    }
    if (!hasGravity) {
      st.velocityY = 0;
    }
    if (!hasMass) {
      const origScale = group.userData.origScale as THREE.Vector3;
      group.scale.copy(origScale);
    }
  });

  return null;
}
