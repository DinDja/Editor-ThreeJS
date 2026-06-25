import type { InteractionDocument } from '@/lib/interaction-engine/types';
import { type ProjectAsset, type ExportTarget, type PageDocument, type ProjectExperience, type ProjectSettings } from '@/lib/page-builder/types';
import { collectProjectAssets } from '@/lib/project-experience/persistence';
import type { SceneDocument } from '@/lib/scene-engine/types';
import { arrayBufferToBytes, buildZipBlob, stringToBytes, type ZipFile } from './zip';
import type { ExportBundle, ExportFile } from './types';

const asJson = (value: unknown) => JSON.stringify(value, null, 2);

export const createExperienceSnapshot = ({
  page,
  scene,
  interactions,
  settings,
}: {
  page: PageDocument;
  scene: SceneDocument;
  interactions: InteractionDocument[];
  settings: ProjectSettings;
}): ProjectExperience => ({
  id: settings.id,
  name: settings.name,
  page,
  scene,
  interactions,
  settings,
});

const dataFiles = (snapshot: ProjectExperience, basePath: string): ExportFile[] => [
  { path: `${basePath}/scene-data.json`, content: asJson(snapshot.scene), language: 'json' },
  { path: `${basePath}/page-data.json`, content: asJson(snapshot.page), language: 'json' },
  { path: `${basePath}/interactions-data.json`, content: asJson(snapshot.interactions), language: 'json' },
];

const ANIMATION_RUNTIME = `
const sampleTransform = (keyframes, objectId, frame) => {
  const keys = keyframes.filter((k) => k.objectId === objectId).sort((a, b) => a.frame - b.frame);
  if (keys.length === 0) return null;
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (frame <= first.frame) return { position: first.position, rotation: first.rotation, scale: first.scale };
  if (frame >= last.frame) return { position: last.position, rotation: last.rotation, scale: last.scale };
  const nextIdx = keys.findIndex((k) => k.frame >= frame);
  const next = keys[nextIdx];
  const prev = keys[nextIdx - 1] ?? next;
  const span = Math.max(1, next.frame - prev.frame);
  const raw = Math.max(0, Math.min(1, (frame - prev.frame) / span));
  const ease = prev.interpolation === 'hold' ? 0 : prev.interpolation === 'ease' ? raw * raw * (3 - 2 * raw) : raw;
  const lerp = (a, b) => [a[0] + (b[0] - a[0]) * ease, a[1] + (b[1] - a[1]) * ease, a[2] + (b[2] - a[2]) * ease];
  return { position: lerp(prev.position, next.position), rotation: lerp(prev.rotation, next.rotation), scale: lerp(prev.scale, next.scale) };
};
`;

const reactSceneCanvas = () => `'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import sceneData from '../data/scene-data.json';

const fps = 30;
const startFrame = 0;
const endFrame = ${'${'}(sceneData.animations && sceneData.animations.length > 0 ? Math.max(...sceneData.animations.map((k) => k.frame)) : 180){'${'}'};

${ANIMATION_RUNTIME}

function Primitive({ object, material, register }) {
  const ref = useRef();
  const color = material?.color ?? '#f8fafc';
  useFrame(() => { if (register) register(object.uuid, ref.current); });
  if (object.kind === 'model' && object.source) return <Model object={object} material={material} register={register} />;
  return (
    <mesh ref={ref} position={object.position} rotation={object.rotation} scale={object.scale} castShadow receiveShadow
      onUpdate={(self) => { if (register) register(object.uuid, self); }}>
      {object.primitive === 'sphere' ? <sphereGeometry args={[object.geometry?.radius ?? 0.75, 48, 32]} /> : null}
      {object.primitive === 'cylinder' ? <cylinderGeometry args={[object.geometry?.radius ?? 0.6, object.geometry?.radius ?? 0.6, object.geometry?.height ?? 1.2, 48]} /> : null}
      {object.primitive === 'plane' ? <planeGeometry args={[object.geometry?.width ?? 3, object.geometry?.height ?? 3]} /> : null}
      {!['sphere', 'cylinder', 'plane'].includes(object.primitive) ? <boxGeometry args={[object.geometry?.width ?? 1, object.geometry?.height ?? 1, object.geometry?.depth ?? 1]} /> : null}
      <meshStandardMaterial color={color} metalness={material?.metalness ?? 0} roughness={material?.roughness ?? 0.55} transparent opacity={material?.opacity ?? 1} flatShading={object.metadata?.flatShading === true} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Model({ object, material, register }) {
  const gltf = useGLTF(object.source);
  const ref = useRef();
  const clone = useRef(gltf.scene.clone(true)).current;
  useFrame(() => { if (register) register(object.uuid, ref.current); });
  return <primitive ref={ref} object={clone} onUpdate={(self) => { if (register) register(object.uuid, self); }} />;
}

function AnimationPlayer({ refs }) {
  useFrame((state) => {
    const animations = sceneData.animations || [];
    if (animations.length === 0) return;
    const frame = (state.clock.elapsedTime * fps) % (endFrame - startFrame + 1);
    const animatedIds = Array.from(new Set(animations.map((k) => k.objectId)));
    animatedIds.forEach((id) => {
      const target = refs.current.get(id);
      const sample = sampleTransform(animations, id, frame);
      if (!target || !sample) return;
      target.position.set(sample.position[0], sample.position[1], sample.position[2]);
      target.rotation.set(sample.rotation[0], sample.rotation[1], sample.rotation[2]);
      target.scale.set(sample.scale[0], sample.scale[1], sample.scale[2]);
    });
  });
  return null;
}

export default function SceneCanvas() {
  const materials = Object.fromEntries(sceneData.materials.map((material) => [material.uuid, material]));
  const objects = sceneData.objects.filter((object) => object.visible !== false && object.kind !== 'light' && object.kind !== 'camera');
  const refs = useRef(new Map());
  const register = (id, obj) => { if (obj) refs.current.set(id, obj); };

  return (
    <Canvas camera={{ position: [4.5, 3.2, 5.8], fov: 45 }} shadows dpr={[1, 2]}>
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 7, 4]} intensity={0.8} castShadow />
      <hemisphereLight args={['#dbeafe', '#1f2937', 0.35]} />
      {objects.map((object) => (
        <Primitive key={object.uuid} object={object} material={materials[object.materialId]} register={register} />
      ))}
      <AnimationPlayer refs={refs} />
      <OrbitControls enableDamping />
    </Canvas>
  );
}
`;

const nextSceneCanvas = () => reactSceneCanvas().replace("import sceneData from '../data/scene-data.json';", "import sceneData from '../lib/scene-data.json';");

const pageExperience = (sceneImportPath = './SceneCanvas') => `'use client';

import SceneCanvas from '${sceneImportPath}';
import pageData from '../data/page-data.json';
import interactionsData from '../data/interactions-data.json';

const mergeStyle = (node) => ({ ...(node.styles?.base ?? {}) });

function ExperienceNode({ node }) {
  const style = mergeStyle(node);
  const dataAttrs = { 'data-experience-node': node.id };
  if (node.type === 'sceneCanvas') return <div {...dataAttrs} style={style}><SceneCanvas /></div>;
  if (node.type === 'text') {
    const Tag = node.props?.as || 'p';
    return <Tag {...dataAttrs} style={style}>{node.props?.text}</Tag>;
  }
  if (node.type === 'button') return <a {...dataAttrs} href={node.props?.href || '#'} style={style}>{node.props?.label || 'Button'}</a>;
  if (node.type === 'image') return <img {...dataAttrs} src={node.props?.src || ''} alt={node.props?.alt || ''} style={style} />;
  if (node.type === 'video') return <video {...dataAttrs} src={node.props?.src || ''} poster={node.props?.poster || ''} controls={node.props?.controls !== false} autoPlay={Boolean(node.props?.autoplay)} muted style={style} />;
  const Tag = node.type === 'navbar' ? 'nav' : node.type === 'footer' ? 'footer' : 'section';
  return (
    <Tag {...dataAttrs} style={style}>
      {node.props?.brand ? <strong>{node.props.brand}</strong> : null}
      {node.props?.title ? <h3>{node.props.title}</h3> : null}
      {node.props?.body ? <p>{node.props.body}</p> : null}
      {(node.children || []).map((child) => <ExperienceNode key={child.id} node={child} />)}
    </Tag>
  );
}

export default function PageExperience() {
  return (
    <main data-interactions={interactionsData.length}>
      {pageData.children.map((node) => <ExperienceNode key={node.id} node={node} />)}
    </main>
  );
}
`;

const nextPageExperience = () =>
  pageExperience('./SceneCanvas')
    .replace("import pageData from '../data/page-data.json';", "import pageData from '../lib/page-data.json';")
    .replace("import interactionsData from '../data/interactions-data.json';", "import interactionsData from '../lib/interactions-data.json';");

const nextFiles = (snapshot: ProjectExperience): ExportFile[] => [
  { path: 'app/page.tsx', content: "import PageExperience from '../components/PageExperience';\n\nexport default function Page() {\n  return <PageExperience />;\n}\n", language: 'tsx' },
  { path: 'components/SceneCanvas.tsx', content: nextSceneCanvas(), language: 'tsx' },
  { path: 'components/Hero3D.tsx', content: "import PageExperience from './PageExperience';\n\nexport default function Hero3D() {\n  return <PageExperience />;\n}\n", language: 'tsx' },
  { path: 'components/PageExperience.tsx', content: nextPageExperience(), language: 'tsx' },
  { path: 'components/sections/SectionRenderer.tsx', content: "export { default } from '../PageExperience';\n", language: 'tsx' },
  ...dataFiles(snapshot, 'lib'),
];

const reactFiles = (snapshot: ProjectExperience, target: 'react' | 'vite'): ExportFile[] => [
  { path: 'src/App.tsx', content: "import PageExperience from './components/PageExperience';\n\nexport default function App() {\n  return <PageExperience />;\n}\n", language: 'tsx' },
  { path: 'src/components/SceneCanvas.tsx', content: reactSceneCanvas(), language: 'tsx' },
  { path: 'src/components/PageExperience.tsx', content: pageExperience('./SceneCanvas'), language: 'tsx' },
  { path: 'src/components/sections/SectionRenderer.tsx', content: "export { default } from '../PageExperience';\n", language: 'tsx' },
  ...(target === 'vite'
    ? [{ path: 'src/main.tsx', content: "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './style.css';\n\ncreateRoot(document.getElementById('root')!).render(<App />);\n", language: 'tsx' as const }]
    : []),
  ...dataFiles(snapshot, 'src/data'),
];

const STANDALONE_RUNTIME = `
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/loaders/GLTFLoader.js';

const sceneData = window.__SCENE_DATA__;
const pageData = window.__PAGE_DATA__;
const interactionsData = window.__INTERACTIONS_DATA__;

${ANIMATION_RUNTIME}

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
camera.position.set(4.5, 3.2, 5.8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const materials = Object.fromEntries(sceneData.materials.map((m) => [m.uuid, m]));
const objectRoots = new Map();
const objectNodes = new Map();
const root = new THREE.Group();
scene.add(root);

function makeMaterial(mat) {
  const m = new THREE.MeshStandardMaterial({
    color: mat?.color ?? '#f8fafc',
    metalness: mat?.metalness ?? 0,
    roughness: mat?.roughness ?? 0.55,
    transparent: (mat?.opacity ?? 1) < 1,
    opacity: mat?.opacity ?? 1,
    side: THREE.DoubleSide,
  });
  return m;
}

function buildPrimitive(object) {
  const g = object.geometry || {};
  let geo;
  if (object.primitive === 'sphere') geo = new THREE.SphereGeometry(g.radius ?? 0.75, 48, 32);
  else if (object.primitive === 'cylinder') geo = new THREE.CylinderGeometry(g.radius ?? 0.6, g.radius ?? 0.6, g.height ?? 1.2, 48);
  else if (object.primitive === 'cone') geo = new THREE.ConeGeometry(g.radiusBottom ?? 0.6, g.height ?? 1.2, 48);
  else if (object.primitive === 'torus') geo = new THREE.TorusGeometry(g.radius ?? 1, g.tube ?? 0.3, 32, 96);
  else if (object.primitive === 'plane') geo = new THREE.PlaneGeometry(g.width ?? 3, g.height ?? 3);
  else geo = new THREE.BoxGeometry(g.width ?? 1, g.height ?? 1, g.depth ?? 1);
  const mesh = new THREE.Mesh(geo, makeMaterial(materials[object.materialId]));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildObject(object) {
  const group = new THREE.Group();
  group.position.fromArray(object.position);
  group.rotation.fromArray(object.rotation);
  group.scale.fromArray(object.scale);
  group.name = object.name;
  if (object.lightConfig) {
    const lc = object.lightConfig;
    let light;
    if (lc.kind === 'ambient') light = new THREE.AmbientLight(lc.color, lc.intensity);
    else if (lc.kind === 'point') light = new THREE.PointLight(lc.color, lc.intensity, lc.distance, lc.decay);
    else if (lc.kind === 'directional') light = new THREE.DirectionalLight(lc.color, lc.intensity);
    else light = new THREE.SpotLight(lc.color, lc.intensity, lc.distance, lc.decay, lc.angle, lc.penumbra);
    if (light.castShadow !== undefined) light.castShadow = lc.castShadow;
    group.add(light);
    group.userData.isLight = true;
    group.userData.baseIntensity = lc.intensity;
  } else if (object.kind === 'model' && object.source) {
    const loader = new GLTFLoader();
    loader.load(object.source, (gltf) => {
      const clone = gltf.scene.clone(true);
      clone.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
      group.add(clone);
    });
  } else {
    const mesh = buildPrimitive(object);
    group.add(mesh);
  }
  objectRoots.set(object.uuid, group);
  objectNodes.set(object.uuid, group);
  return group;
}

sceneData.objects.filter((o) => o.visible !== false).forEach((object) => {
  root.add(buildObject(object));
});

if (!sceneData.objects.some((o) => o.lightConfig)) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const d = new THREE.DirectionalLight(0xffffff, 0.65);
  d.position.set(5, 7, 4);
  scene.add(d);
}

function mountScene(canvasHost) {
  if (!canvasHost) return;
  canvasHost.innerHTML = '';
  canvasHost.appendChild(renderer.domElement);
  const resize = () => {
    const w = canvasHost.clientWidth || window.innerWidth;
    const h = canvasHost.clientHeight || 360;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  new ResizeObserver(resize).observe(canvasHost);
  const clock = new THREE.Clock();
  let scrollProgress = 0;
  const activeInteractions = new Set();
  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    controls.update();
    const animations = sceneData.animations || [];
    if (animations.length > 0) {
      const frame = (clock.elapsedTime * 30) % (Math.max(...animations.map((k) => k.frame)) + 1);
      Array.from(new Set(animations.map((k) => k.objectId))).forEach((id) => {
        const target = objectRoots.get(id);
        const s = sampleTransform(animations, id, frame);
        if (target && s) {
          target.position.fromArray(s.position);
          target.rotation.fromArray(s.rotation);
          target.scale.fromArray(s.scale);
        }
      });
    }
    interactionsData.forEach((interaction) => {
      if (!interaction.enabled) return;
      const target = interaction.targetId === 'current-scene' ? root : objectRoots.get(interaction.targetId);
      const alpha = Math.min(0.18, 1 / Math.max(interaction.duration ?? 0.35, 0.05) / 60);
      const runScroll = interaction.trigger === 'scroll' || interaction.trigger === 'mouseMove' || interaction.trigger === 'pageLoad' || activeInteractions.has(interaction.id);
      if (!runScroll) return;
      if (interaction.action === 'rotateObject3D' && target) {
        const base = interaction.params.rotation || [0, 0.35, 0];
        target.rotation.y = THREE.MathUtils.lerp(target.rotation.y, base[1], alpha);
      }
      if (interaction.action === 'moveObject3D' && target) {
        const dest = new THREE.Vector3(...(interaction.params.position || [0, 0.4, 0]));
        target.position.lerp(dest, alpha);
      }
      if (interaction.action === 'scaleObject3D' && target) {
        const dest = new THREE.Vector3(...(interaction.params.scale || [1.08, 1.08, 1.08]));
        target.scale.lerp(dest, alpha);
      }
      if ((interaction.action === 'changeColor' || interaction.action === 'changeMaterial') && target) {
        target.traverse((c) => { if (c.isMesh && c.material && c.material.color) c.material.color.set(interaction.params.color || '#00ffcc'); });
      }
      if (interaction.action === 'changeOpacity' && target) {
        target.traverse((c) => { if (c.isMesh && c.material) { c.material.transparent = true; c.material.opacity = interaction.params.opacity ?? 0.65; } });
      }
      if (interaction.action === 'toggleLight' && target) {
        const enabled = interaction.params.enabled ?? true;
        target.traverse((c) => { if (c.isLight) c.intensity = enabled ? (target.userData.baseIntensity ?? c.intensity) : 0; });
      }
      if ((interaction.action === 'moveCamera' || interaction.action === 'animateCamera') && interaction.trigger === 'scroll') {
        const base = interaction.params.position || [4.5, 3.2, 5.8];
        camera.position.set(base[0], base[1] + scrollProgress * 2.4, base[2] - scrollProgress * 2.8);
        camera.lookAt(0, 0.6, 0);
      }
    });
    renderer.render(scene, camera);
  }
  animate();
  window.addEventListener('scroll', () => {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    scrollProgress = window.scrollY / max;
  }, { passive: true });
  window.__experience = {
    activate: (id) => activeInteractions.add(id),
    deactivate: (id) => activeInteractions.delete(id),
    scrollProgress: () => scrollProgress,
  };
}

function applyDomAction(interaction, active) {
  if (!active) return;
  const target = document.querySelector('[data-experience-node="' + interaction.targetId + '"]');
  if (!target) return;
  if (interaction.action === 'showElement') target.style.display = '';
  if (interaction.action === 'hideElement') target.style.display = 'none';
  if (interaction.action === 'changeText') target.textContent = interaction.params.text || '';
  if (interaction.action === 'openModal') alert([interaction.params.title, interaction.params.body].filter(Boolean).join('\\\\n\\\\n'));
  if (interaction.action === 'navigateToLink') window.location.href = interaction.params.href || '#';
}

function wireInteractions() {
  interactionsData.forEach((interaction) => {
    if (!interaction.enabled) return;
    const source = document.querySelector('[data-experience-node="' + interaction.sourceId + '"]');
    if (!source) return;
    const trigger = (active) => {
      window.__experience?.activate?.(interaction.id);
      applyDomAction(interaction, active);
      if (!active) window.__experience?.deactivate?.(interaction.id);
    };
    if (interaction.trigger === 'pageLoad') setTimeout(() => trigger(true), 200);
    if (interaction.trigger === 'click') source.addEventListener('click', () => { trigger(true); setTimeout(() => trigger(false), 360); });
    if (interaction.trigger === 'hover') { source.addEventListener('mouseenter', () => trigger(true)); source.addEventListener('mouseleave', () => trigger(false)); }
    if (interaction.trigger === 'doubleClick') source.addEventListener('dblclick', () => { trigger(true); setTimeout(() => trigger(false), 360); });
    if (interaction.trigger === 'focus') { source.addEventListener('focus', () => trigger(true)); source.addEventListener('blur', () => trigger(false)); }
  });
}

function renderPage() {
  const root = document.getElementById('experience-root');
  const applyStyle = (el, styles = {}) => { for (const [k, v] of Object.entries(styles)) el.style[k] = typeof v === 'number' ? v + 'px' : v; };
  const build = (node) => {
    const tag = node.type === 'navbar' ? 'nav' : node.type === 'footer' ? 'footer' : node.type === 'button' ? 'a' : node.type === 'text' ? (node.props.as || 'p') : 'section';
    const el = document.createElement(tag);
    el.dataset.experienceNode = node.id;
    applyStyle(el, node.styles?.base || {});
    if (node.type === 'sceneCanvas') { el.className = 'scene-canvas'; mountScene(el); }
    else if (node.type === 'button') { el.href = node.props.href || '#'; el.textContent = node.props.label || 'Button'; }
    else if (node.type === 'text') el.textContent = node.props.text || '';
    else if (node.type === 'image') { const img = document.createElement('img'); img.src = node.props.src || ''; img.alt = node.props.alt || ''; img.style.width = '100%'; el.appendChild(img); }
    else if (node.type === 'video') { const v = document.createElement('video'); v.src = node.props.src || ''; v.controls = node.props.controls !== false; v.muted = true; el.appendChild(v); }
    else {
      if (node.props.brand) { const b = document.createElement('strong'); b.textContent = node.props.brand; el.appendChild(b); }
      if (node.props.title) { const t = document.createElement('h3'); t.textContent = node.props.title; el.appendChild(t); }
      if (node.props.body) { const p = document.createElement('p'); p.textContent = node.props.body; el.appendChild(p); }
      (node.children || []).forEach((c) => el.appendChild(build(c)));
    }
    return el;
  };
  pageData.children.forEach((node) => root.appendChild(build(node)));
}

renderPage();
wireInteractions();
`;

const htmlFiles = (snapshot: ProjectExperience): ExportFile[] => {
  const sceneJson = asJson(snapshot.scene);
  const pageJson = asJson(snapshot.page);
  const interactionsJson = asJson(snapshot.interactions);
  return [
    {
      path: 'index.html',
      language: 'html',
      content: `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${snapshot.name}</title>
    <link rel="stylesheet" href="./style.css" />
    <script>
      window.__SCENE_DATA__ = ${sceneJson};
      window.__PAGE_DATA__ = ${pageJson};
      window.__INTERACTIONS_DATA__ = ${interactionsJson};
    </script>
  </head>
  <body>
    <main id="experience-root"></main>
    <script type="module" src="./main.js"></script>
  </body>
</html>
`,
    },
    {
      path: 'style.css',
      language: 'css',
      content: `* { box-sizing: border-box; }
body { margin: 0; background: #101214; color: #f5f5f4; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
a { text-decoration: none; }
.scene-canvas { min-height: 360px; background: #0f1214; position: relative; }
.scene-canvas canvas { display: block; width: 100% !important; height: 100% !important; }
`,
    },
    {
      path: 'main.js',
      language: 'js',
      content: STANDALONE_RUNTIME,
    },
  ];
};

export const generateExportBundle = (snapshot: ProjectExperience, target: ExportTarget): ExportBundle => {
  if (target === 'next') return { target, files: nextFiles(snapshot) };
  if (target === 'react' || target === 'vite') return { target, files: reactFiles(snapshot, target) };
  if (target === 'html') return { target, files: htmlFiles(snapshot) };
  return { target, files: dataFiles(snapshot, 'data') };
};

export const exportTargetLabel: Record<ExportTarget, string> = {
  next: 'Next.js',
  react: 'React',
  vite: 'Vite',
  html: 'HTML/CSS/JS',
  json: 'JSON',
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const downloadExportManifest = (bundle: ExportBundle) => {
  const manifest = {
    target: bundle.target,
    files: bundle.files,
  };
  downloadBlob(new Blob([asJson(manifest)], { type: 'application/json' }), `web-3d-export-${bundle.target}.json`);
};

export const downloadSingleExportFile = (file: ExportFile) => {
  const mime =
    file.language === 'json'
      ? 'application/json'
      : file.language === 'html'
        ? 'text/html'
        : file.language === 'css'
          ? 'text/css'
          : 'text/plain';
  downloadBlob(new Blob([file.content], { type: mime }), file.path.split('/').pop() ?? 'export.txt');
};

const assetFolderForKind = (kind: ProjectAsset['kind']): string => {
  if (kind === 'model') return 'public/models';
  if (kind === 'texture') return 'public/textures';
  if (kind === 'image') return 'public/images';
  if (kind === 'video') return 'public/videos';
  if (kind === 'reference') return 'public/images';
  return 'public/assets';
};

const extensionForKind = (kind: ProjectAsset['kind']): string => {
  if (kind === 'model') return 'glb';
  if (kind === 'texture') return 'png';
  if (kind === 'image') return 'png';
  if (kind === 'video') return 'mp4';
  return 'bin';
};

const deriveAssetFileName = (asset: ProjectAsset, index: number, usedNames: Set<string>): string => {
  const rawName = asset.name?.trim() || asset.url.split('/').pop()?.split('?')[0] || `${asset.kind}-${index}`;
  const sanitized = rawName.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  let candidate = sanitized || `${asset.kind}-${index}`;
  if (!/\.[a-z0-9]+$/i.test(candidate)) candidate = `${candidate}.${extensionForKind(asset.kind)}`;
  let unique = candidate;
  let counter = 1;
  while (usedNames.has(unique)) {
    const dot = candidate.lastIndexOf('.');
    unique = dot > 0 ? `${candidate.slice(0, dot)}-${counter}${candidate.slice(dot)}` : `${candidate}-${counter}`;
    counter += 1;
  }
  usedNames.add(unique);
  return unique;
};

const fetchAssetBytes = async (url: string): Promise<Uint8Array | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return arrayBufferToBytes(buffer);
  } catch {
    return null;
  }
};

export const buildExportZipFiles = async (
  bundle: ExportBundle,
  assets: ProjectAsset[],
): Promise<{ files: ZipFile[]; remap: Map<string, string>; failed: string[] }> => {
  const files: ZipFile[] = [];
  const remap = new Map<string, string>();
  const failed: string[] = [];
  const usedNames = new Set<string>();

  const seenUrls = new Set<string>();
  const uniqueAssets = assets.filter((asset) => {
    if (seenUrls.has(asset.url)) return false;
    seenUrls.add(asset.url);
    return true;
  });

  for (let index = 0; index < uniqueAssets.length; index += 1) {
    const asset = uniqueAssets[index];
    const bytes = await fetchAssetBytes(asset.url);
    if (!bytes) {
      failed.push(asset.url);
      continue;
    }
    const folder = assetFolderForKind(asset.kind);
    const fileName = deriveAssetFileName(asset, index, usedNames);
    const path = `${folder}/${fileName}`;
    files.push({ path, data: bytes });
    remap.set(asset.url, `/${path.replace(/^public\//, '')}`);
  }

  for (const file of bundle.files) {
    let content = file.content;
    if (file.language === 'json' && remap.size > 0) {
      remap.forEach((relative, original) => {
        content = content.split(JSON.stringify(original)).join(JSON.stringify(relative));
      });
    }
    files.push({ path: file.path, data: stringToBytes(content) });
  }

  if (failed.length > 0) {
    files.push({
      path: 'MISSING-ASSETS.txt',
      data: stringToBytes(
        `Os seguintes assets nao puderam ser baixados (CORS/offline) e precisam ser adicionados manualmente:\n\n${failed.join('\n')}`,
      ),
    });
  }

  return { files, remap, failed };
};

export const downloadExportZip = async (bundle: ExportBundle, assets: ProjectAsset[]) => {
  const { files } = await buildExportZipFiles(bundle, assets);
  const blob = buildZipBlob(files);
  downloadBlob(blob, `web-3d-export-${bundle.target}.zip`);
};

export const getExportAssets = (snapshot: ProjectExperience): ProjectAsset[] =>
  snapshot.assets ?? collectProjectAssets(snapshot.page, snapshot.scene);
