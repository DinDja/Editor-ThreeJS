import { create } from 'zustand';
import type { Vec3 } from './types';

export type PhysicsSimulationMode = 'edit' | 'simulation';
export type PhysicsPlaybackState = 'stopped' | 'playing' | 'paused';

export type PhysicsImpulseRequest = {
  version: number;
  objectId: string;
  impulse: Vec3;
};

export type PhysicsContactDebugPoint = {
  id: string;
  position: Vec3;
};

type PhysicsState = {
  mode: PhysicsSimulationMode;
  playback: PhysicsPlaybackState;
  gravityEnabled: boolean;
  showColliders: boolean;
  showDebug: boolean;
  sessionId: number;
  stopVersion: number;
  resetVersion: number;
  stepVersion: number;
  applyVersion: number;
  hasSimulationResult: boolean;
  impulseRequest: PhysicsImpulseRequest | null;
  contactPoints: PhysicsContactDebugPoint[];
  playSimulation: () => void;
  pauseSimulation: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  stepSimulation: () => void;
  requestApplySimulation: () => void;
  finalizeApplySimulation: () => void;
  markSimulationResult: () => void;
  toggleGravity: () => void;
  setGravityEnabled: (enabled: boolean) => void;
  setShowColliders: (show: boolean) => void;
  setShowDebug: (show: boolean) => void;
  requestImpulse: (objectId: string, impulse?: Vec3) => void;
  setContactPoints: (points: PhysicsContactDebugPoint[]) => void;
};

export const usePhysicsStore = create<PhysicsState>((set, get) => ({
  mode: 'edit',
  playback: 'stopped',
  gravityEnabled: true,
  showColliders: false,
  showDebug: false,
  sessionId: 0,
  stopVersion: 0,
  resetVersion: 0,
  stepVersion: 0,
  applyVersion: 0,
  hasSimulationResult: false,
  impulseRequest: null,
  contactPoints: [],

  playSimulation: () =>
    set((state) => ({
      mode: 'simulation',
      playback: 'playing',
      sessionId: state.mode === 'edit' || state.playback === 'stopped' ? state.sessionId + 1 : state.sessionId,
      hasSimulationResult: state.mode === 'edit' || state.playback === 'stopped' ? false : state.hasSimulationResult,
      contactPoints: state.mode === 'edit' || state.playback === 'stopped' ? [] : state.contactPoints,
    })),

  pauseSimulation: () =>
    set((state) => (state.mode === 'simulation' ? { playback: 'paused' } : state)),

  stopSimulation: () =>
    set((state) => ({
      mode: 'edit',
      playback: 'stopped',
      stopVersion: state.stopVersion + 1,
      hasSimulationResult: false,
      contactPoints: [],
    })),

  resetSimulation: () =>
    set((state) => ({
      mode: 'simulation',
      playback: 'paused',
      sessionId: state.mode === 'edit' || state.playback === 'stopped' ? state.sessionId + 1 : state.sessionId,
      resetVersion: state.resetVersion + 1,
      hasSimulationResult: false,
      contactPoints: [],
    })),

  stepSimulation: () =>
    set((state) => ({
      mode: 'simulation',
      playback: 'paused',
      sessionId: state.mode === 'edit' || state.playback === 'stopped' ? state.sessionId + 1 : state.sessionId,
      stepVersion: state.stepVersion + 1,
    })),

  requestApplySimulation: () =>
    set((state) => (state.hasSimulationResult ? { applyVersion: state.applyVersion + 1 } : state)),

  finalizeApplySimulation: () =>
    set({
      mode: 'edit',
      playback: 'stopped',
      hasSimulationResult: false,
      contactPoints: [],
    }),

  markSimulationResult: () =>
    set((state) => (state.hasSimulationResult ? state : { hasSimulationResult: true })),

  toggleGravity: () => set((state) => ({ gravityEnabled: !state.gravityEnabled })),
  setGravityEnabled: (gravityEnabled) => set({ gravityEnabled }),
  setShowColliders: (showColliders) => set({ showColliders }),
  setShowDebug: (showDebug) => set({ showDebug }),

  requestImpulse: (objectId, impulse = [2.5, 2.5, -2.5]) =>
    set({
      impulseRequest: {
        version: (get().impulseRequest?.version ?? 0) + 1,
        objectId,
        impulse,
      },
    }),

  setContactPoints: (contactPoints) => set({ contactPoints }),
}));

