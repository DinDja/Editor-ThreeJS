'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const SIM_SIZE = 256;

const waveVertShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const waveFragShader = `
uniform sampler2D tDiffuse;
uniform vec2 texelSize;
uniform float attenuation;
varying vec2 vUv;

void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  vec2 dx = vec2(texelSize.x, 0.0);
  vec2 dy = vec2(0.0, texelSize.y);
  float avg = (
    texture2D(tDiffuse, vUv - dx).r +
    texture2D(tDiffuse, vUv - dy).r +
    texture2D(tDiffuse, vUv + dx).r +
    texture2D(tDiffuse, vUv + dy).r
  ) * 0.25;
  texel.g += (avg - texel.r) * 2.0;
  texel.g *= attenuation;
  texel.r += texel.g;
  gl_FragColor = texel;
}
`;

const normalFragShader = `
uniform sampler2D tDiffuse;
uniform vec2 texelSize;
varying vec2 vUv;

void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  vec3 dx = vec3(
    texelSize.x, 0.0,
    texture2D(tDiffuse, vec2(vUv.x + texelSize.x, vUv.y)).r - texel.r
  );
  vec3 dy = vec3(
    0.0, texelSize.y,
    texture2D(tDiffuse, vec2(vUv.x, vUv.y + texelSize.y)).r - texel.r
  );
  texel.ba = normalize(cross(dx, dy)).xy;
  gl_FragColor = texel;
}
`;

const normapFragShader = `
uniform sampler2D tDiffuse;
varying vec2 vUv;

void main() {
  vec2 n = texture2D(tDiffuse, vUv).ba;
  gl_FragColor = vec4(n * 0.5 + 0.5, 1.0, 1.0);
}
`;

const dropFragShader = `
uniform sampler2D tDiffuse;
uniform float aspectRatio;
uniform vec2 center;
uniform float radius;
uniform float strength;
varying vec2 vUv;

void main() {
  vec4 texel = texture2D(tDiffuse, vUv);
  vec2 p = center * 0.5 + 0.5 - vUv;
  p.x *= aspectRatio;
  float drop = max(0.0, 1.0 - length(p) / radius);
  drop = 0.5 - cos(drop * 3.14159265) * 0.5;
  texel.r += drop * strength;
  gl_FragColor = texel;
}
`;

function createSimMaterial(vert: string, frag: string, uniforms: Record<string, unknown>) {
  return new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: uniforms as Record<string, THREE.IUniform>,
    depthWrite: false,
    depthTest: false,
  });
}

function FluidSim({ simTargetA, simTargetB, normTarget, attenuation }: {
  simTargetA: THREE.WebGLRenderTarget;
  simTargetB: THREE.WebGLRenderTarget;
  normTarget: THREE.WebGLRenderTarget;
  attenuation: number;
}) {
  const { gl } = useThree();
  const waveMat = useMemo(
    () => createSimMaterial(waveVertShader, waveFragShader, {
      tDiffuse: { value: null },
      texelSize: { value: new THREE.Vector2(1 / SIM_SIZE, 1 / SIM_SIZE) },
      attenuation: { value: attenuation },
    }),
    [attenuation],
  );
  const normalMat = useMemo(
    () => createSimMaterial(waveVertShader, normalFragShader, {
      tDiffuse: { value: null },
      texelSize: { value: new THREE.Vector2(1 / SIM_SIZE, 1 / SIM_SIZE) },
    }),
    [],
  );
  const normapMat = useMemo(
    () => createSimMaterial(waveVertShader, normapFragShader, {
      tDiffuse: { value: null },
    }),
    [],
  );

  const read = useRef(simTargetA);
  const write = useRef(simTargetB);
  const quad = useMemo(() => new THREE.Mesh(new THREE.PlaneGeometry(2, 2), waveMat), []);

  const camera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);

  const addDropFn = useRef<(x: number, y: number, r: number, s: number) => void>(() => {});

  const dropMat = useMemo(
    () => createSimMaterial(waveVertShader, dropFragShader, {
      tDiffuse: { value: null },
      aspectRatio: { value: 1 },
      center: { value: new THREE.Vector2(0, 0) },
      radius: { value: 0.05 },
      strength: { value: 0.5 },
    }),
    [],
  );

  addDropFn.current = (x: number, y: number, r: number, s: number) => {
    dropMat.uniforms.center.value.set(x, y);
    dropMat.uniforms.radius.value = r;
    dropMat.uniforms.strength.value = s;
    dropMat.uniforms.tDiffuse.value = read.current.texture;
    quad.material = dropMat;
    gl.setRenderTarget(write.current);
    gl.render(quad, camera);
    gl.setRenderTarget(null);
    const tmp = read.current;
    read.current = write.current;
    write.current = tmp;
  };

  useEffect(() => {
    return () => {
      quad.geometry.dispose();
      waveMat.dispose();
      normalMat.dispose();
      normapMat.dispose();
      dropMat.dispose();
    };
  }, []);

  useFrame(() => {
    waveMat.uniforms.tDiffuse.value = read.current.texture;
    quad.material = waveMat;
    gl.setRenderTarget(write.current);
    gl.render(quad, camera);

    normalMat.uniforms.tDiffuse.value = write.current.texture;
    quad.material = normalMat;
    gl.setRenderTarget(read.current);
    gl.render(quad, camera);

    normapMat.uniforms.tDiffuse.value = read.current.texture;
    quad.material = normapMat;
    gl.setRenderTarget(normTarget);
    gl.render(quad, camera);
    gl.setRenderTarget(null);

    const tmp = read.current;
    read.current = write.current;
    write.current = tmp;
  });

  return { addDrop: addDropFn };
}

type FluidSurfaceProps = {
  color: string;
  metalness: number;
  roughness: number;
  displacementScale: number;
  rainEnabled: boolean;
  size: [number, number];
  position: [number, number, number];
};

export default function FluidSurface({
  color,
  metalness,
  roughness,
  displacementScale,
  rainEnabled,
  size,
  position,
}: FluidSurfaceProps) {
  const { gl } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const rainTime = useRef(0);

  const simTargetA = useMemo(
    () => new THREE.WebGLRenderTarget(SIM_SIZE, SIM_SIZE, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.FloatType }),
    [],
  );
  const simTargetB = useMemo(
    () => new THREE.WebGLRenderTarget(SIM_SIZE, SIM_SIZE, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.FloatType }),
    [],
  );
  const normTarget = useMemo(
    () => new THREE.WebGLRenderTarget(SIM_SIZE, SIM_SIZE, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.UnsignedByteType }),
    [],
  );

  const envMap = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return env;
  }, [gl]);

  const { addDrop } = FluidSim({
    simTargetA,
    simTargetB,
    normTarget,
    attenuation: 0.995,
  });

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness,
      roughness,
      envMap,
      envMapIntensity: 1,
      normalMap: normTarget.texture,
      normalScale: new THREE.Vector2(1, 1),
    });
    return mat;
  }, [color, metalness, roughness, envMap, normTarget.texture]);

  useEffect(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.color.set(color);
    mat.metalness = metalness;
    mat.roughness = roughness;
    mat.envMap = envMap;
    mat.normalMap = normTarget.texture;
  }, [color, metalness, roughness, envMap, normTarget.texture]);

  useFrame((_, delta) => {
    if (rainEnabled) {
      rainTime.current += delta;
      if (rainTime.current > 0.05) {
        const x = THREE.MathUtils.randFloatSpread(2);
        const y = THREE.MathUtils.randFloatSpread(2);
        const r = THREE.MathUtils.randFloat(0.01, 0.02);
        const s = THREE.MathUtils.randFloat(0.001, 0.005);
        addDrop.current(x, y, r, s);
        rainTime.current = 0;
      }
    }
  });

  useEffect(() => {
    return () => {
      simTargetA.dispose();
      simTargetB.dispose();
      normTarget.dispose();
      material.dispose();
    };
  }, []);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={position} material={material}>
      <planeGeometry args={size} />
    </mesh>
  );
}
