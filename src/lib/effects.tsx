'use client';

/* eslint-disable react-hooks/immutability, react-hooks/purity */

import { Suspense, lazy, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { EffectConfig, EffectKind } from '@/store/types';

export const EFFECT_PRESETS: Record<EffectKind, EffectConfig> = {
  fireworks: { kind: 'fireworks', color: '#ff6b35', intensity: 1.15, size: 0.16, count: 180 },
  fire: { kind: 'fire', color: '#ff7a1a', intensity: 1.25, size: 0.18, count: 180 },
  smoke: { kind: 'smoke', color: '#8b8f92', intensity: 0.8, size: 0.46, count: 130 },
  sparkle: { kind: 'sparkle', color: '#ffe08a', intensity: 0.95, size: 0.08, count: 120 },
  lightGlow: { kind: 'lightGlow', color: '#66c7ff', intensity: 1.1, size: 0.72, count: 1 },
  fluid: { kind: 'fluid', color: '#4a90d9', intensity: 1, size: 5, count: 1 },
};

export const EFFECT_KINDS: EffectKind[] = ['fireworks', 'fire', 'smoke', 'sparkle', 'lightGlow', 'fluid'];

export const EFFECT_LABELS: Record<EffectKind, string> = {
  fireworks: 'Fogos',
  fire: 'Fogo',
  smoke: 'Fumaca',
  sparkle: 'Brilho',
  lightGlow: 'Luz',
  fluid: 'Superficie Liquida',
};

type ParticleBuffers = {
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  alphas: Float32Array;
  ages: Float32Array;
  lifetimes: Float32Array;
  seeds: Float32Array;
};

const PARTICLE_VERTEX_SHADER = `
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(1.0, aSize * (260.0 / max(0.35, -mvPosition.z)));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv) * 2.0;
    float soft = smoothstep(1.0, 0.0, d);
    float core = smoothstep(0.42, 0.0, d);
    vec3 color = mix(vColor * 0.45, vColor * 1.45, core);
    gl_FragColor = vec4(color, vAlpha * soft);
  }
`;

const scratchColor = new THREE.Color();
const warmColor = new THREE.Color('#ffd08a');
const emberColor = new THREE.Color('#ff3d00');
const smokeColor = new THREE.Color('#575b5f');

const randomRange = (min: number, max: number) => min + Math.random() * (max - min);

const particleCount = (count: number) => Math.max(1, Math.floor(count));

const writeColor = (colors: Float32Array, index: number, color: THREE.Color, scale = 1) => {
  colors[index * 3] = color.r * scale;
  colors[index * 3 + 1] = color.g * scale;
  colors[index * 3 + 2] = color.b * scale;
};

const markAttributes = (points: THREE.Points | null, names: string[]) => {
  if (!points) return;
  names.forEach((name) => {
    const attribute = points.geometry.getAttribute(name);
    if (attribute) attribute.needsUpdate = true;
  });
};

const createParticleBuffers = (count: number): ParticleBuffers => ({
  positions: new Float32Array(count * 3),
  velocities: new Float32Array(count * 3),
  colors: new Float32Array(count * 3),
  sizes: new Float32Array(count),
  alphas: new Float32Array(count),
  ages: new Float32Array(count),
  lifetimes: new Float32Array(count),
  seeds: new Float32Array(count),
});

function useGlowTexture() {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const context = canvas.getContext('2d');
    if (!context) return null;

    const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.72)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.18)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 96, 96);

    const nextTexture = new THREE.CanvasTexture(canvas);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, []);

  useEffect(() => () => texture?.dispose(), [texture]);

  return texture;
}

function GlowSprite({
  color,
  opacity,
  size,
  pulseSpeed,
}: {
  color: string;
  opacity: number;
  size: number;
  pulseSpeed: number;
}) {
  const texture = useGlowTexture();
  const spriteRef = useRef<THREE.Sprite>(null);

  useFrame((state) => {
    if (!spriteRef.current) return;
    const pulse = 0.88 + Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.12;
    spriteRef.current.scale.setScalar(size * pulse);
    (spriteRef.current.material as THREE.SpriteMaterial).opacity = opacity * pulse;
  });

  return (
    <sprite ref={spriteRef} scale={[size, size, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} color={color} opacity={opacity} />
    </sprite>
  );
}

function FireEffect({ config }: { config: EffectConfig }) {
  const count = particleCount(config.count);
  const pointsRef = useRef<THREE.Points>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const baseColor = useMemo(() => new THREE.Color(config.color), [config.color]);
  const buffers = useMemo(() => {
    const next = createParticleBuffers(count);

    for (let i = 0; i < count; i++) {
      const radius = Math.sqrt(Math.random()) * 0.28;
      const angle = Math.random() * Math.PI * 2;
      next.positions[i * 3] = Math.cos(angle) * radius;
      next.positions[i * 3 + 1] = randomRange(0, 0.55);
      next.positions[i * 3 + 2] = Math.sin(angle) * radius;
      next.velocities[i * 3] = randomRange(-0.16, 0.16);
      next.velocities[i * 3 + 1] = randomRange(0.72, 1.85);
      next.velocities[i * 3 + 2] = randomRange(-0.16, 0.16);
      next.ages[i] = Math.random();
      next.lifetimes[i] = randomRange(0.85, 1.45);
      next.seeds[i] = Math.random() * Math.PI * 2;
    }

    return next;
  }, [count]);

  useFrame((state, delta) => {
    for (let i = 0; i < count; i++) {
      buffers.ages[i] += delta / buffers.lifetimes[i];

      if (buffers.ages[i] >= 1) {
        const radius = Math.sqrt(Math.random()) * 0.3;
        const angle = Math.random() * Math.PI * 2;
        buffers.positions[i * 3] = Math.cos(angle) * radius;
        buffers.positions[i * 3 + 1] = 0;
        buffers.positions[i * 3 + 2] = Math.sin(angle) * radius;
        buffers.velocities[i * 3] = randomRange(-0.18, 0.18);
        buffers.velocities[i * 3 + 1] = randomRange(0.82, 1.9);
        buffers.velocities[i * 3 + 2] = randomRange(-0.18, 0.18);
        buffers.ages[i] = 0;
        buffers.lifetimes[i] = randomRange(0.82, 1.5);
      }

      const age = buffers.ages[i];
      const swirl = Math.sin(state.clock.elapsedTime * 5 + buffers.seeds[i]) * 0.018;
      buffers.positions[i * 3] += (buffers.velocities[i * 3] + swirl) * delta;
      buffers.positions[i * 3 + 1] += buffers.velocities[i * 3 + 1] * delta * config.intensity;
      buffers.positions[i * 3 + 2] += (buffers.velocities[i * 3 + 2] - swirl) * delta;

      buffers.sizes[i] = config.size * (38 + age * 110);
      buffers.alphas[i] = Math.sin(age * Math.PI) * 0.72 * config.intensity;

      scratchColor.copy(age < 0.26 ? warmColor : age < 0.68 ? baseColor : emberColor).lerp(smokeColor, Math.max(0, age - 0.72) * 1.9);
      writeColor(buffers.colors, i, scratchColor, 1.35);
    }

    if (lightRef.current) {
      lightRef.current.intensity = (1.8 + Math.sin(state.clock.elapsedTime * 13) * 0.35) * config.intensity;
    }

    markAttributes(pointsRef.current, ['position', 'color', 'aSize', 'aAlpha']);
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[buffers.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[buffers.sizes, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[buffers.alphas, 1]} />
        </bufferGeometry>
        <shaderMaterial
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={PARTICLE_VERTEX_SHADER}
          fragmentShader={PARTICLE_FRAGMENT_SHADER}
        />
      </points>
      <pointLight ref={lightRef} color={config.color} distance={4.2} decay={2} intensity={1.8 * config.intensity} />
      <GlowSprite color={config.color} opacity={0.32 * config.intensity} size={config.size * 8.5} pulseSpeed={9} />
    </group>
  );
}

function SmokeEffect({ config }: { config: EffectConfig }) {
  const count = particleCount(config.count);
  const pointsRef = useRef<THREE.Points>(null);
  const baseColor = useMemo(() => new THREE.Color(config.color), [config.color]);
  const buffers = useMemo(() => {
    const next = createParticleBuffers(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * 0.34;
      next.positions[i * 3] = Math.cos(angle) * radius;
      next.positions[i * 3 + 1] = Math.random() * 2.8;
      next.positions[i * 3 + 2] = Math.sin(angle) * radius;
      next.velocities[i * 3] = randomRange(-0.06, 0.06);
      next.velocities[i * 3 + 1] = randomRange(0.24, 0.58);
      next.velocities[i * 3 + 2] = randomRange(-0.06, 0.06);
      next.ages[i] = Math.random();
      next.lifetimes[i] = randomRange(3.0, 5.2);
      next.seeds[i] = Math.random() * Math.PI * 2;
      writeColor(next.colors, i, baseColor, randomRange(0.72, 1.08));
    }

    return next;
  }, [baseColor, count]);

  useFrame((state, delta) => {
    for (let i = 0; i < count; i++) {
      buffers.ages[i] += delta / buffers.lifetimes[i];

      if (buffers.ages[i] >= 1) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * 0.32;
        buffers.positions[i * 3] = Math.cos(angle) * radius;
        buffers.positions[i * 3 + 1] = 0;
        buffers.positions[i * 3 + 2] = Math.sin(angle) * radius;
        buffers.ages[i] = 0;
        buffers.lifetimes[i] = randomRange(3.0, 5.5);
      }

      const age = buffers.ages[i];
      const drift = Math.sin(state.clock.elapsedTime * 0.8 + buffers.seeds[i]) * 0.05;
      buffers.positions[i * 3] += (buffers.velocities[i * 3] + drift) * delta;
      buffers.positions[i * 3 + 1] += buffers.velocities[i * 3 + 1] * delta * config.intensity;
      buffers.positions[i * 3 + 2] += (buffers.velocities[i * 3 + 2] + drift * 0.55) * delta;
      buffers.sizes[i] = config.size * (75 + age * 220);
      buffers.alphas[i] = Math.sin(age * Math.PI) * 0.28 * config.intensity;
      writeColor(buffers.colors, i, baseColor, 0.72 + age * 0.22);
    }

    markAttributes(pointsRef.current, ['position', 'color', 'aSize', 'aAlpha']);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[buffers.colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[buffers.sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[buffers.alphas, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        vertexShader={PARTICLE_VERTEX_SHADER}
        fragmentShader={PARTICLE_FRAGMENT_SHADER}
      />
    </points>
  );
}

function FireworksEffect({ config }: { config: EffectConfig }) {
  const count = particleCount(config.count);
  const pointsRef = useRef<THREE.Points>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const elapsedRef = useRef(0);
  const baseColor = useMemo(() => new THREE.Color(config.color), [config.color]);
  const buffers = useMemo(() => {
    const next = createParticleBuffers(count);

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = randomRange(1.2, 4.2) * config.intensity;
      next.velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      next.velocities[i * 3 + 1] = Math.abs(Math.sin(phi) * Math.sin(theta) * speed) + randomRange(0.2, 1.2);
      next.velocities[i * 3 + 2] = Math.cos(phi) * speed;
      next.seeds[i] = Math.random();
      next.sizes[i] = config.size * randomRange(55, 95);
      writeColor(next.colors, i, scratchColor.copy(baseColor).offsetHSL(randomRange(-0.08, 0.08), 0, randomRange(-0.08, 0.1)));
    }

    return next;
  }, [baseColor, config.intensity, config.size, count]);

  useFrame((_, delta) => {
    elapsedRef.current += delta;
    if (elapsedRef.current > 2.6) elapsedRef.current = 0;

    const burstAge = elapsedRef.current;
    for (let i = 0; i < count; i++) {
      const delay = buffers.seeds[i] * 0.28;
      const age = Math.max(0, burstAge - delay);
      const fade = Math.max(0, 1 - age / 1.75);
      buffers.positions[i * 3] = buffers.velocities[i * 3] * age;
      buffers.positions[i * 3 + 1] = 0.8 + buffers.velocities[i * 3 + 1] * age - 2.4 * age * age;
      buffers.positions[i * 3 + 2] = buffers.velocities[i * 3 + 2] * age;
      buffers.alphas[i] = fade * fade * config.intensity;
      buffers.sizes[i] = config.size * (45 + 60 * fade);
    }

    if (lightRef.current) {
      lightRef.current.intensity = Math.max(0, 3.5 * (1 - burstAge / 0.75)) * config.intensity;
    }

    markAttributes(pointsRef.current, ['position', 'aSize', 'aAlpha']);
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[buffers.colors, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[buffers.sizes, 1]} />
          <bufferAttribute attach="attributes-aAlpha" args={[buffers.alphas, 1]} />
        </bufferGeometry>
        <shaderMaterial
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={PARTICLE_VERTEX_SHADER}
          fragmentShader={PARTICLE_FRAGMENT_SHADER}
        />
      </points>
      <pointLight ref={lightRef} color={config.color} distance={6} decay={2} intensity={2.5 * config.intensity} />
    </group>
  );
}

function SparkleEffect({ config }: { config: EffectConfig }) {
  const count = particleCount(config.count);
  const pointsRef = useRef<THREE.Points>(null);
  const baseColor = useMemo(() => new THREE.Color(config.color), [config.color]);
  const buffers = useMemo(() => {
    const next = createParticleBuffers(count);

    for (let i = 0; i < count; i++) {
      const radius = randomRange(0.25, 1.7);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      next.positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      next.positions[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * radius;
      next.positions[i * 3 + 2] = Math.cos(phi) * radius;
      next.seeds[i] = Math.random() * Math.PI * 2;
      next.lifetimes[i] = randomRange(1.4, 2.4);
      next.sizes[i] = config.size * randomRange(45, 90);
      writeColor(next.colors, i, baseColor, randomRange(0.82, 1.3));
    }

    return next;
  }, [baseColor, config.size, count]);

  useFrame((state) => {
    for (let i = 0; i < count; i++) {
      const pulse = Math.max(0, Math.sin(state.clock.elapsedTime * buffers.lifetimes[i] + buffers.seeds[i]));
      buffers.alphas[i] = pulse * pulse * config.intensity;
      buffers.sizes[i] = config.size * (38 + pulse * 80);
    }

    markAttributes(pointsRef.current, ['aSize', 'aAlpha']);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[buffers.colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[buffers.sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[buffers.alphas, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexColors
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={PARTICLE_VERTEX_SHADER}
        fragmentShader={PARTICLE_FRAGMENT_SHADER}
      />
    </points>
  );
}

function LightGlowEffect({ config }: { config: EffectConfig }) {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!lightRef.current) return;
    const pulse = 0.85 + Math.sin(state.clock.elapsedTime * 2.4) * 0.15;
    lightRef.current.intensity = config.intensity * 2.2 * pulse;
  });

  return (
    <group>
      <pointLight ref={lightRef} color={config.color} distance={7} decay={2} intensity={config.intensity * 2.2} />
      <GlowSprite color={config.color} opacity={0.58 * config.intensity} size={config.size * 4.8} pulseSpeed={2.4} />
      <GlowSprite color={config.color} opacity={0.18 * config.intensity} size={config.size * 8.6} pulseSpeed={1.3} />
    </group>
  );
}

function FluidEffect({ config }: { config: EffectConfig }) {
  const FluidSurface = lazy(() => import('@/lib/fluid').then((m) => ({ default: m.default })));
  return (
    <Suspense fallback={null}>
      <FluidSurface
        color={config.color}
        metalness={0.75}
        roughness={0.25}
        displacementScale={config.intensity * 3}
        rainEnabled={true}
        size={[config.size, config.size]}
        position={[0, 0, 0]}
      />
    </Suspense>
  );
}

export function EffectAsset({ effect }: { effect: EffectConfig }) {
  switch (effect.kind) {
    case 'fireworks':
      return <FireworksEffect config={effect} />;
    case 'fire':
      return <FireEffect config={effect} />;
    case 'smoke':
      return <SmokeEffect config={effect} />;
    case 'sparkle':
      return <SparkleEffect config={effect} />;
    case 'lightGlow':
      return <LightGlowEffect config={effect} />;
    case 'fluid':
      return <FluidEffect config={effect} />;
    default:
      return null;
  }
}
