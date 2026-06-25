'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { PerformanceProfile } from '@/lib/performance/device';
import { scaleParticleCount } from '@/lib/performance/device';

export type ParticleFieldProps = {
  count?: number;
  size?: number;
  speed?: number;
  color?: string;
  colorB?: string;
  opacity?: number;
  connectLines?: boolean;
  lineDistance?: number;
  mouseReact?: boolean;
  shape?: 'cloud' | 'grid' | 'sphere' | 'flow';
  depth?: number;
  profile: PerformanceProfile;
  intensity?: number;
};

type ParticleData = {
  velocity: Float32Array;
  base: Float32Array;
};

const generatePositions = (
  count: number,
  shape: ParticleFieldProps['shape'],
  depth: number,
): Float32Array => {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    if (shape === 'grid') {
      const side = Math.ceil(Math.cbrt(count));
      const x = (i % side) / side - 0.5;
      const y = (Math.floor(i / side) % side) / side - 0.5;
      const z = Math.floor(i / (side * side)) / side - 0.5;
      positions[i3] = x * depth * 2;
      positions[i3 + 1] = y * depth * 2;
      positions[i3 + 2] = z * depth * 2;
    } else if (shape === 'sphere') {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = depth * (0.6 + Math.random() * 0.4);
      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);
    } else if (shape === 'flow') {
      const t = (i / count) * Math.PI * 6;
      positions[i3] = Math.cos(t) * depth * (0.6 + Math.random() * 0.3);
      positions[i3 + 1] = (Math.random() - 0.5) * depth * 2;
      positions[i3 + 2] = Math.sin(t) * depth * (0.6 + Math.random() * 0.3);
    } else {
      positions[i3] = (Math.random() - 0.5) * depth * 2;
      positions[i3 + 1] = (Math.random() - 0.5) * depth * 2;
      positions[i3 + 2] = (Math.random() - 0.5) * depth * 2;
    }
  }
  return positions;
};

const buildCircleTexture = (): THREE.Texture => {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};

export default function ParticleField({
  count = 1800,
  size = 0.08,
  speed = 0.4,
  color = '#34d399',
  colorB = '#22d3ee',
  opacity = 0.9,
  connectLines = true,
  lineDistance = 1.4,
  mouseReact = true,
  shape = 'cloud',
  depth = 6,
  profile,
  intensity = 1,
}: ParticleFieldProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const { mouse } = useThree();

  const actualCount = scaleParticleCount(Math.round(count * intensity), profile);
  const paused = profile.reducedMotion;

  const texture = useMemo(() => buildCircleTexture(), []);

  const { geometry, colors, data, lineGeometry } = useMemo(() => {
    const positions = generatePositions(actualCount, shape, depth);
    const velocity = new Float32Array(actualCount * 3);
    const base = new Float32Array(positions);
    for (let i = 0; i < actualCount; i += 1) {
      velocity[i * 3] = (Math.random() - 0.5) * 0.02;
      velocity[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocity[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const colA = new THREE.Color(color);
    const colB = new THREE.Color(colorB);
    const colorArr = new Float32Array(actualCount * 3);
    for (let i = 0; i < actualCount; i += 1) {
      const t = Math.random();
      const mix = colA.clone().lerp(colB, t);
      colorArr[i * 3] = mix.r;
      colorArr[i * 3 + 1] = mix.g;
      colorArr[i * 3 + 2] = mix.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));

    const maxLines = Math.min(actualCount * 6, 2400);
    const linePos = new Float32Array(maxLines * 6);
    const lineCol = new Float32Array(maxLines * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCol, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setDrawRange(0, 0);

    return { geometry: geo, colors: colorArr, data: { velocity, base }, lineGeometry: lineGeo };
  }, [actualCount, shape, depth, color, colorB]);

  useFrame((_, delta) => {
    if (paused || !pointsRef.current) return;
    const dt = Math.min(delta, 0.05);
    pointer.current.x += (mouse.x - pointer.current.x) * 0.08;
    pointer.current.y += (mouse.y - pointer.current.y) * 0.08;

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const vel = data.velocity;
    const spd = speed;
    const mouseActive = mouseReact;
    const mx = pointer.current.x * depth;
    const my = pointer.current.y * depth;

    for (let i = 0; i < actualCount; i += 1) {
      const i3 = i * 3;
      arr[i3] += vel[i3] * spd;
      arr[i3 + 1] += vel[i3 + 1] * spd;
      arr[i3 + 2] += vel[i3 + 2] * spd;

      // Bounds recycling
      const limit = depth;
      if (Math.abs(arr[i3]) > limit) vel[i3] *= -1;
      if (Math.abs(arr[i3 + 1]) > limit) vel[i3 + 1] *= -1;
      if (Math.abs(arr[i3 + 2]) > limit) vel[i3 + 2] *= -1;

      if (mouseActive) {
        const dx = arr[i3] - mx;
        const dy = arr[i3 + 1] - my;
        const distSq = dx * dx + dy * dy;
        if (distSq < 4) {
          const f = 0.04 / (distSq + 0.5);
          arr[i3] += dx * f;
          arr[i3 + 1] += dy * f;
        }
      }
    }
    posAttr.needsUpdate = true;

    if (connectLines && linesRef.current && profile.tier !== 'low') {
      const linePos = (lineGeometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const lineCol = (lineGeometry.attributes.color as THREE.BufferAttribute).array as Float32Array;
      const maxDist = lineDistance;
      const maxDistSq = maxDist * maxDist;
      let lineIdx = 0;
      const step = actualCount > 1400 ? 3 : 1;
      const colArr = colors;
      for (let i = 0; i < actualCount && lineIdx < linePos.length - 6; i += step) {
        const i3 = i * 3;
        const ax = arr[i3], ay = arr[i3 + 1], az = arr[i3 + 2];
        for (let j = i + 1; j < actualCount && lineIdx < linePos.length - 6; j += step) {
          const j3 = j * 3;
          const dx = ax - arr[j3];
          const dy = ay - arr[j3 + 1];
          const dz = az - arr[j3 + 2];
          const dSq = dx * dx + dy * dy + dz * dz;
          if (dSq < maxDistSq) {
            const alpha = 1 - Math.sqrt(dSq) / maxDist;
            linePos[lineIdx] = ax;
            linePos[lineIdx + 1] = ay;
            linePos[lineIdx + 2] = az;
            linePos[lineIdx + 3] = arr[j3];
            linePos[lineIdx + 4] = arr[j3 + 1];
            linePos[lineIdx + 5] = arr[j3 + 2];
            const cR = colArr[i3] * alpha;
            const cG = colArr[i3 + 1] * alpha;
            const cB = colArr[i3 + 2] * alpha;
            lineCol[lineIdx] = cR; lineCol[lineIdx + 1] = cG; lineCol[lineIdx + 2] = cB;
            lineCol[lineIdx + 3] = cR; lineCol[lineIdx + 4] = cG; lineCol[lineIdx + 5] = cB;
            lineIdx += 6;
          }
        }
      }
      lineGeometry.setDrawRange(0, lineIdx / 3);
      (lineGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (lineGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }

    if (groupRef.current && !mouseReact) {
      groupRef.current.rotation.y += dt * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          size={size}
          map={texture}
          vertexColors
          transparent
          opacity={opacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
      {connectLines && profile.tier !== 'low' && (
        <lineSegments ref={linesRef} geometry={lineGeometry}>
          <lineBasicMaterial vertexColors transparent opacity={opacity * 0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
        </lineSegments>
      )}
    </group>
  );
}
