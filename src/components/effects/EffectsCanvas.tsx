'use client';

import { Suspense, lazy, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { PageEffect } from '@/lib/effects-system/types';
import { usePerformanceProfile } from '@/lib/performance/device';
import ParticleField from './ParticleField';
import {
  AnimatedStars,
  FloatingOrbs,
  GridFloor3D,
  ShaderBackground,
  WebGLHeroScene,
} from './WebglEffects';

type EffectsCanvasProps = {
  effects: PageEffect[];
  /** 0..1 multiplier derived from the linked preset intensity setting. */
  globalIntensity?: number;
};

const prop = (effect: PageEffect, key: string, fallback: unknown): unknown =>
  effect.props[key] ?? fallback;

const num = (effect: PageEffect, key: string, fallback: number): number => {
  const v = prop(effect, key, fallback);
  return typeof v === 'number' ? v : Number(v) || fallback;
};

const str = (effect: PageEffect, key: string, fallback: string): string => {
  const v = prop(effect, key, fallback);
  return typeof v === 'string' ? v : fallback;
};

const bool = (effect: PageEffect, key: string, fallback: boolean): boolean => {
  const v = prop(effect, key, fallback);
  return typeof v === 'boolean' ? v : fallback;
};

const FluidSurface = lazy(() => import('@/lib/fluid'));

function EffectInstance({ effect, profile, intensity }: { effect: PageEffect; profile: ReturnType<typeof usePerformanceProfile>; intensity: number }) {
  switch (effect.type) {
    case 'particleField':
      return (
        <ParticleField
          profile={profile}
          intensity={intensity}
          count={num(effect, 'count', 1800)}
          size={num(effect, 'size', 0.08)}
          speed={num(effect, 'speed', 0.4)}
          color={str(effect, 'color', '#34d399')}
          colorB={str(effect, 'colorB', '#22d3ee')}
          opacity={num(effect, 'opacity', 0.9)}
          connectLines={bool(effect, 'connectLines', true)}
          lineDistance={num(effect, 'lineDistance', 1.4)}
          mouseReact={bool(effect, 'mouseReact', true)}
          shape={str(effect, 'shape', 'cloud') as 'cloud' | 'grid' | 'sphere' | 'flow'}
          depth={num(effect, 'depth', 6)}
        />
      );
    case 'floatingOrbs':
      return (
        <FloatingOrbs
          profile={profile}
          intensity={intensity}
          count={num(effect, 'count', 8)}
          size={num(effect, 'size', 1.2)}
          speed={num(effect, 'speed', 0.25)}
          color={str(effect, 'color', '#7dd3fc')}
          colorB={str(effect, 'colorB', '#a78bfa')}
          opacity={num(effect, 'opacity', 0.55)}
        />
      );
    case 'shaderBackground':
      return (
        <ShaderBackground
          profile={profile}
          color={str(effect, 'color', '#0b1020')}
          colorB={str(effect, 'colorB', '#22d3ee')}
          colorC={str(effect, 'colorC', '#3b82f6')}
          speed={num(effect, 'speed', 0.3)}
          scale={num(effect, 'scale', 2.4)}
          opacity={num(effect, 'opacity', 0.85)}
        />
      );
    case 'gridFloor3D':
      return (
        <GridFloor3D
          profile={profile}
          color={str(effect, 'color', '#22d3ee')}
          colorB={str(effect, 'colorB', '#0b1020')}
          size={num(effect, 'size', 28)}
          speed={num(effect, 'speed', 0.6)}
          opacity={num(effect, 'opacity', 0.8)}
        />
      );
    case 'animatedStars':
      return (
        <AnimatedStars
          profile={profile}
          intensity={intensity}
          count={num(effect, 'count', 1200)}
          size={num(effect, 'size', 0.05)}
          speed={num(effect, 'speed', 0.15)}
          color={str(effect, 'color', '#ffffff')}
          opacity={num(effect, 'opacity', 0.9)}
          twinkle={bool(effect, 'twinkle', true)}
        />
      );
    case 'webglHeroScene':
      return (
        <WebGLHeroScene
          profile={profile}
          shape={str(effect, 'shape', 'torusKnot') as 'torusKnot' | 'icosahedron' | 'sphere' | 'box'}
          color={str(effect, 'color', '#22d3ee')}
          colorB={str(effect, 'colorB', '#0b1020')}
          metalness={num(effect, 'metalness', 0.6)}
          roughness={num(effect, 'roughness', 0.2)}
          speed={num(effect, 'speed', 0.4)}
          scale={num(effect, 'scale', 1.1)}
          wireframe={bool(effect, 'wireframe', false)}
          mouseReact={bool(effect, 'mouseReact', true)}
        />
      );
    case 'liquidSurface':
      return (
        <FluidSurface
          color={str(effect, 'color', '#2dd4bf')}
          metalness={num(effect, 'metalness', 0.72)}
          roughness={num(effect, 'roughness', 0.18)}
          displacementScale={num(effect, 'displacementScale', 2.6) * intensity}
          rainEnabled={bool(effect, 'rainEnabled', true)}
          size={[num(effect, 'sizeX', 14), num(effect, 'sizeY', 8)]}
          position={[0, 0, -0.6]}
          rotation={[0, 0, 0]}
          opacity={num(effect, 'opacity', 0.95)}
        />
      );
    default:
      return null;
  }
}

export default function EffectsCanvas({ effects, globalIntensity = 1 }: EffectsCanvasProps) {
  const profile = usePerformanceProfile();

  const webglEffects = useMemo(
    () =>
      effects
        .filter((effect) => effect.enabled && effect.scope === 'page')
        .sort((a, b) => a.zIndex - b.zIndex),
    [effects],
  );

  if (!profile.webglAvailable || webglEffects.length === 0) return null;

  return (
    <div
      className="pointer-events-none sticky top-0 z-0 w-full"
      style={{ height: '100vh', marginBottom: '-100vh' }}
      aria-hidden
    >
      <Canvas
        flat
        dpr={[1, profile.tier === 'high' ? 2 : 1.5]}
        camera={{ position: [0, 0, 8], fov: 55, near: 0.1, far: 100 }}
        gl={{ antialias: profile.tier !== 'low', alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(0x000000), 0);
        }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 6, 4]} intensity={0.5} />
        <Suspense fallback={null}>
          {webglEffects.map((effect) => (
            <EffectInstance
              key={effect.id}
              effect={effect}
              profile={profile}
              intensity={globalIntensity}
            />
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
}
