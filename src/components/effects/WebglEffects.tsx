'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { PerformanceProfile } from '@/lib/performance/device';
import { scaleParticleCount } from '@/lib/performance/device';

/* ----------------------------- Floating Orbs ----------------------------- */

export type FloatingOrbsProps = {
  count?: number;
  size?: number;
  speed?: number;
  color?: string;
  colorB?: string;
  opacity?: number;
  profile: PerformanceProfile;
  intensity?: number;
};

export function FloatingOrbs({
  count = 8,
  size = 1.2,
  speed = 0.25,
  color = '#7dd3fc',
  colorB = '#a78bfa',
  opacity = 0.55,
  profile,
  intensity = 1,
}: FloatingOrbsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const n = Math.max(1, Math.round(count * intensity * (profile.tier === 'low' ? 0.5 : 1)));

  const seeds = useMemo(
    () => Array.from({ length: n }, () => ({
      x: (Math.random() - 0.5) * 14,
      y: (Math.random() - 0.5) * 8,
      z: (Math.random() - 0.5) * 8,
      phase: Math.random() * Math.PI * 2,
      freq: 0.3 + Math.random() * 0.6,
      sx: 0.6 + Math.random() * 0.8,
    })),
    [n],
  );

  const colorObj = useMemo(() => {
    const a = new THREE.Color(color);
    const b = new THREE.Color(colorB);
    return seeds.map((_, i) => a.clone().lerp(b, (i % seeds.length) / Math.max(seeds.length, 1)));
  }, [color, colorB, seeds]);

  useFrame((state) => {
    if (!meshRef.current || profile.reducedMotion) return;
    const t = state.clock.elapsedTime * speed;
    for (let i = 0; i < n; i += 1) {
      const s = seeds[i];
      dummy.position.set(
        s.x + Math.cos(t * s.freq + s.phase) * 1.6,
        s.y + Math.sin(t * s.freq * 0.8 + s.phase) * 1.4,
        s.z + Math.sin(t * s.freq + s.phase) * 1.2,
      );
      const scaleVal = size * s.sx * (0.85 + Math.sin(t * 1.2 + s.phase) * 0.15);
      dummy.scale.setScalar(scaleVal);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      meshRef.current.setColorAt(i, colorObj[i]);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, n]}>
      <sphereGeometry args={[1, 24, 24]} />
      <meshStandardMaterial
        color={color}
        emissive={colorB}
        emissiveIntensity={0.4}
        transparent
        opacity={opacity}
        roughness={0.4}
        metalness={0.1}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/* ----------------------------- Grid Floor 3D ----------------------------- */

export type GridFloor3DProps = {
  color?: string;
  colorB?: string;
  size?: number;
  speed?: number;
  opacity?: number;
  profile: PerformanceProfile;
};

export function GridFloor3D({
  color = '#22d3ee',
  colorB = '#0891b2',
  size = 28,
  speed = 0.6,
  opacity = 0.8,
  profile,
}: GridFloor3DProps) {
  const ref = useRef<THREE.GridHelper>(null);
  const matRef = useRef<THREE.Material>(null);

  useFrame((state) => {
    if (!ref.current || profile.reducedMotion) return;
    const z = (state.clock.elapsedTime * speed) % 2;
    ref.current.position.z = z;
  });

  return (
    <group rotation={[-Math.PI / 2.4, 0, 0]} position={[0, -3.2, 0]}>
      <gridHelper
        ref={ref}
        args={[size, size, color, color]}
      >
        <lineBasicMaterial ref={matRef} color={color} transparent opacity={opacity} />
      </gridHelper>
      <mesh rotation={[0, 0, 0]} position={[0, 0, -0.01]}>
        <planeGeometry args={[size * 1.5, size * 1.5]} />
        <meshBasicMaterial color={colorB} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/* ----------------------------- Animated Stars ----------------------------- */

export type AnimatedStarsProps = {
  count?: number;
  size?: number;
  speed?: number;
  color?: string;
  opacity?: number;
  twinkle?: boolean;
  profile: PerformanceProfile;
  intensity?: number;
};

export function AnimatedStars({
  count = 1200,
  size = 0.05,
  speed = 0.15,
  color = '#ffffff',
  opacity = 0.9,
  twinkle = true,
  profile,
  intensity = 1,
}: AnimatedStarsProps) {
  const ref = useRef<THREE.Points>(null);
  const n = scaleParticleCount(Math.round(count * intensity), profile);

  const geometry = useMemo(() => {
    const positions = new Float32Array(n * 3);
    const phases = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      phases[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    return geo;
  }, [n]);

  useFrame((state, delta) => {
    if (!ref.current || profile.reducedMotion) return;
    ref.current.rotation.y += delta * speed * 0.1;
    if (twinkle) {
      const mat = ref.current.material as THREE.PointsMaterial;
      mat.opacity = opacity * (0.7 + Math.sin(state.clock.elapsedTime * 2) * 0.3);
    }
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial color={color} size={size} sizeAttenuation transparent opacity={opacity} depthWrite={false} />
    </points>
  );
}

/* --------------------------- Shader Background --------------------------- */

export type ShaderBackgroundProps = {
  color?: string;
  colorB?: string;
  colorC?: string;
  speed?: number;
  scale?: number;
  opacity?: number;
  profile: PerformanceProfile;
};

const shaderVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const shaderFragment = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uScale;

  // Simplex-ish noise (Ashima)
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
  float snoise(vec2 v){
    const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.0245906768219459);
    vec2 i=floor(v+dot(v,C.yy));
    vec2 x0=v-i+dot(i,C.xx);
    vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
    vec4 x12=x0.xyxy+C.xxzz;
    x12.xy-=i1;
    i=mod289(i);
    vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
    vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
    m=m*m;m=m*m;
    vec3 x=2.0*fract(p*C.www)-1.0;
    vec3 h=abs(x)-0.5;
    vec3 ox=floor(x+0.5);
    vec3 a0=x-ox;
    m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
    vec3 g;
    g.x=a0.x*x0.x+h.x*x0.y;
    g.yz=a0.yz*x12.xz+h.yz*x12.yw;
    return 130.0*dot(m,g);
  }

  void main() {
    vec2 uv = vUv * uScale;
    float t = uTime * 0.15;
    float n1 = snoise(uv + vec2(t, 0.0));
    float n2 = snoise(uv * 1.7 + vec2(0.0, t * 1.3));
    float n = (n1 + n2) * 0.5;
    vec3 col = mix(uColorA, uColorB, smoothstep(-0.4, 0.6, n));
    col = mix(col, uColorC, smoothstep(0.2, 0.9, n2));
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function ShaderBackground({
  color = '#0b1020',
  colorB = '#22d3ee',
  colorC = '#3b82f6',
  speed = 0.3,
  scale = 2.4,
  opacity = 0.85,
  profile,
}: ShaderBackgroundProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color(color) },
          uColorB: { value: new THREE.Color(colorB) },
          uColorC: { value: new THREE.Color(colorC) },
          uScale: { value: scale },
        },
        vertexShader: shaderVertex,
        fragmentShader: shaderFragment,
        transparent: true,
        depthWrite: false,
      }),
    [color, colorB, colorC, scale],
  );

  useFrame((_, delta) => {
    if (profile.reducedMotion) return;
    material.uniforms.uTime.value += delta * speed;
  });

  return (
    <mesh position={[0, 0, -8]} scale={[40, 24, 1]}>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

/* ----------------------------- WebGL Hero Scene ----------------------------- */

export type WebGLHeroSceneProps = {
  shape?: 'torusKnot' | 'icosahedron' | 'sphere' | 'box';
  color?: string;
  colorB?: string;
  metalness?: number;
  roughness?: number;
  speed?: number;
  scale?: number;
  wireframe?: boolean;
  mouseReact?: boolean;
  profile: PerformanceProfile;
};

export function WebGLHeroScene({
  shape = 'torusKnot',
  color = '#22d3ee',
  colorB = '#0b1020',
  metalness = 0.6,
  roughness = 0.2,
  speed = 0.4,
  scale = 1.1,
  wireframe = false,
  mouseReact = true,
  profile,
}: WebGLHeroSceneProps) {
  const ref = useRef<THREE.Mesh>(null);
  const target = useRef({ x: 0, y: 0 });
  const { mouse } = useThree();

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (mouseReact) {
      target.current.x += (mouse.y * 0.6 - target.current.x) * 0.06;
      target.current.y += (mouse.x * 0.8 - target.current.y) * 0.06;
    }
    if (!profile.reducedMotion) {
      ref.current.rotation.x += delta * speed * (mouseReact ? 0.4 : 1);
      ref.current.rotation.y += delta * speed * (mouseReact ? 0.6 : 1);
      ref.current.rotation.x += (target.current.x - ref.current.rotation.x) * 0.04;
      ref.current.rotation.y += (target.current.y - ref.current.rotation.y) * 0.04;
    }
  });

  const geometry = useMemo(() => {
    if (shape === 'icosahedron') return new THREE.IcosahedronGeometry(1, 1);
    if (shape === 'sphere') return new THREE.SphereGeometry(1, 48, 48);
    if (shape === 'box') return new THREE.BoxGeometry(1.4, 1.4, 1.4);
    return new THREE.TorusKnotGeometry(0.8, 0.28, 180, 32);
  }, [shape]);

  return (
    <group position={[0, 0.2, 0]} scale={scale}>
      <mesh ref={ref} geometry={geometry}>
        <meshStandardMaterial
          color={color}
          emissive={colorB}
          emissiveIntensity={0.3}
          metalness={metalness}
          roughness={roughness}
          wireframe={wireframe}
        />
      </mesh>
      <pointLight color={color} intensity={6} distance={12} position={[3, 2, 3]} />
      <pointLight color={colorB} intensity={4} distance={10} position={[-3, -1, 2]} />
    </group>
  );
}
