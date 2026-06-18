'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneObject, Script } from '@/store/types';

type ScriptContext = {
  object: SceneObject;
  group: THREE.Group;
  delta: number;
  elapsed: number;
  THREE: typeof THREE;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  console: Pick<Console, 'log' | 'warn' | 'error'>;
};

type ScriptApi = ScriptContext & {
  update?: (ctx: ScriptContext) => void;
};

type ScriptInstance = {
  setup: Function;
  update: ((ctx: ScriptContext) => void) | null;
  codeHash: string;
};

const scriptInstances = new Map<string, ScriptInstance>();
const logsRef: Pick<Console, 'log' | 'warn' | 'error'> = {
  log: (...args: unknown[]) => console.log('[Script]', ...args),
  warn: (...args: unknown[]) => console.warn('[Script]', ...args),
  error: (...args: unknown[]) => console.error('[Script]', ...args),
};

const compileScript = (id: string, code: string): Function | null => {
  try {
    return new Function('api', code);
  } catch {
    return null;
  }
};

const getOrCreateInstance = (script: Script): ScriptInstance | null => {
  if (!script.enabled || !script.code.trim()) return null;

  const existing = scriptInstances.get(script.id);
  const hash = script.code;

  if (existing && existing.codeHash === hash) return existing;

  const setup = compileScript(script.id, script.code);
  if (!setup) return null;

  const instance: ScriptInstance = { setup, update: null, codeHash: hash };
  scriptInstances.set(script.id, instance);
  return instance;
};

const clearInstance = (id: string) => {
  scriptInstances.delete(id);
};

export function ScriptEngine({ object, groupRef }: { object: SceneObject; groupRef: React.RefObject<THREE.Group | null> }) {
  const ctxRef = useRef<ScriptContext | null>(null);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const scripts = object.scripts;
    if (!scripts || scripts.length === 0) return;

    const ctx: ScriptContext = {
      object,
      group,
      delta,
      elapsed: state.clock.elapsedTime,
      THREE,
      position: group.position,
      rotation: group.rotation,
      scale: group.scale,
      console: logsRef,
    };

    ctxRef.current = ctx;

    for (const script of scripts) {
      if (!script.enabled || !script.code.trim()) continue;

      const instance = getOrCreateInstance(script);
      if (!instance) continue;

      try {
        if (instance.update) {
          instance.update(ctx);
        } else {
          const api: ScriptApi = { ...ctx };
          instance.setup(api);
          if (typeof api.update === 'function') {
            instance.update = api.update;
            instance.update(ctx);
          }
        }
      } catch (err) {
        console.error(`[Script ${script.name}]`, err);
      }
    }
  });

  return null;
}
