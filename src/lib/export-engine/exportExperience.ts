import type { InteractionDocument } from '@/lib/interaction-engine/types';
import type { DataSchema } from '@/lib/data-model/types';
import type { VariableDocument } from '@/lib/variables/types';
import { type PageNode, type PageStyle, type ProjectAsset, type ExportTarget, type PageDocument, type ProjectExperience, type ProjectSettings } from '@/lib/page-builder/types';
import { collectProjectAssets } from '@/lib/project-experience/persistence';
import type { SceneDocument } from '@/lib/scene-engine/types';
import { generateDatabaseSchema } from './generateSchema';
import { generateApiRouteFiles } from './generateApiRoutes';
import { arrayBufferToBytes, buildZipBlob, stringToBytes, type ZipFile } from './zip';
import type { ExportBundle, ExportFile } from './types';

const asJson = (value: unknown) => JSON.stringify(value, null, 2);

export const createExperienceSnapshot = ({
  page,
  pages,
  activePageId,
  scene,
  interactions,
  settings,
  dataSchema,
  variables,
}: {
  page: PageDocument;
  pages?: PageDocument[];
  activePageId?: string;
  scene: SceneDocument;
  interactions: InteractionDocument[];
  settings: ProjectSettings;
  dataSchema?: DataSchema;
  variables?: VariableDocument;
}): ProjectExperience => ({
  id: settings.id,
  name: settings.name,
  page,
  pages: pages && pages.length > 0 ? pages : [page],
  activePageId: activePageId ?? page.id,
  scene,
  interactions,
  settings,
  dataSchema,
  variables,
});

const dataFiles = (snapshot: ProjectExperience, basePath: string): ExportFile[] => {
  const files: ExportFile[] = [
    { path: `${basePath}/scene-data.json`, content: asJson(snapshot.scene), language: 'json' },
    { path: `${basePath}/page-data.json`, content: asJson(snapshot.page), language: 'json' },
    { path: `${basePath}/pages-data.json`, content: asJson(snapshot.pages ?? [snapshot.page]), language: 'json' },
    { path: `${basePath}/interactions-data.json`, content: asJson(snapshot.interactions), language: 'json' },
  ];
  if (snapshot.dataSchema) {
    files.push({ path: `${basePath}/data-schema.json`, content: asJson(snapshot.dataSchema), language: 'json' });
    if (snapshot.dataSchema.ormTarget !== 'none') {
      files.push({
        path: `${basePath}/${snapshot.dataSchema.ormTarget === 'drizzle' ? 'database-schema.ts' : 'schema.prisma'}`,
        content: generateDatabaseSchema(snapshot.dataSchema),
        language: snapshot.dataSchema.ormTarget === 'drizzle' ? 'ts' : 'prisma',
      });
    }
  }
  if (snapshot.variables) {
    files.push({ path: `${basePath}/variables-data.json`, content: asJson(snapshot.variables), language: 'json' });
  }
  return files;
};

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
import dataSchema from '../data/data-schema.json';
import variablesData from '../data/variables-data.json';

const mergeStyle = (node) => ({ ...(node.styles?.base ?? {}) });
const variableValue = (name) => variablesData.variables?.find((v) => v.name === name)?.value ?? '';
const bind = (value, record = {}) => String(value ?? '').replace(/\\{\\{\\s*([^}]+?)\\s*\\}\\}/g, (_, key) => {
  const k = key.trim();
  if (k.startsWith('record.')) return record[k.slice(7)] ?? '';
  if (k.startsWith('vars.')) return variableValue(k.slice(5));
  return variableValue(k) || record[k] || '';
});
const collectionFor = (ref) => dataSchema.collections?.find((c) => c.id === ref || c.name === ref) || dataSchema.collections?.[0];
const sampleRecords = (collection, count = 4) => Array.from({ length: count }, (_, index) => Object.fromEntries((collection?.fields || []).map((field) => [field.name, field.name === 'id' ? 'rec_' + (index + 1) : field.type === 'number' ? (index + 1) * 10 : field.label + ' ' + (index + 1)])));
const display = (value) => value === undefined || value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);

function ExperienceNode({ node }) {
  const style = mergeStyle(node);
  const dataAttrs = { 'data-experience-node': node.id };
  if (node.type === 'dataTable') {
    const collection = collectionFor(node.props?.collectionId);
    const fields = (collection?.fields || []).filter((f) => !f.system).slice(0, 6);
    const records = sampleRecords(collection, node.props?.limit || 6);
    return <div {...dataAttrs} style={style}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{fields.map((f) => <th key={f.id} style={{ textAlign: 'left', padding: 10 }}>{f.label}</th>)}</tr></thead><tbody>{records.map((r, i) => <tr key={i}>{fields.map((f) => <td key={f.id} style={{ padding: 10, borderTop: '1px solid rgba(255,255,255,.08)' }}>{display(r[f.name])}</td>)}</tr>)}</tbody></table></div>;
  }
  if (node.type === 'dataList') {
    const collection = collectionFor(node.props?.collectionId);
    const records = sampleRecords(collection, node.props?.limit || 6);
    const titleField = node.props?.titleField || 'name';
    const bodyField = node.props?.bodyField || 'message';
    return <div {...dataAttrs} style={style}>{records.map((r, i) => <article key={i}><h3>{display(r[titleField])}</h3><p>{display(r[bodyField])}</p></article>)}</div>;
  }
  if (node.type === 'dataForm') {
    const collection = collectionFor(node.props?.collectionId);
    const fields = (collection?.fields || []).filter((f) => !f.system && f.type !== 'relation');
    return <form {...dataAttrs} style={style} onSubmit={(e) => { e.preventDefault(); alert(node.props?.successMessage || 'Registro salvo'); }}>{fields.map((f) => <label key={f.id}>{f.label}<input name={f.name} required={Boolean(f.required)} /></label>)}<button type="submit">{node.props?.submitLabel || 'Salvar'}</button></form>;
  }
  if (node.type === 'dataChart') {
    const collection = collectionFor(node.props?.collectionId);
    const records = sampleRecords(collection, node.props?.limit || 5);
    return <div {...dataAttrs} style={style}>{records.map((r, i) => <div key={i} style={{ flex: 1, height: ((i + 1) * 18) + '%', background: '#34d399', borderRadius: 6 }} title={display(r[node.props?.labelField || 'name'])} />)}</div>;
  }
  if (node.type === 'dataStat') {
    const collection = collectionFor(node.props?.collectionId);
    return <div {...dataAttrs} style={style}><span>{node.props?.label || collection?.label || 'Total'}</span><strong>{sampleRecords(collection).length}</strong></div>;
  }
  if (node.type === 'sceneCanvas') return <div {...dataAttrs} style={style}><SceneCanvas /></div>;
  if (node.type === 'text') {
    const Tag = node.props?.as || 'p';
    return <Tag {...dataAttrs} style={style}>{bind(node.props?.text)}</Tag>;
  }
  if (node.type === 'button') return <a {...dataAttrs} href={node.props?.href || '#'} style={style}>{bind(node.props?.label || 'Button')}</a>;
  if (node.type === 'image') return <img {...dataAttrs} src={node.props?.src || ''} alt={node.props?.alt || ''} style={style} />;
  if (node.type === 'video') return <video {...dataAttrs} src={node.props?.src || ''} poster={node.props?.poster || ''} controls={node.props?.controls !== false} autoPlay={Boolean(node.props?.autoplay)} muted style={style} />;
  if (node.type === 'input') return <div {...dataAttrs} style={style}><label>{node.props?.label}</label><input name={node.props?.name} type={node.props?.type || 'text'} placeholder={node.props?.placeholder} required={Boolean(node.props?.required)} /></div>;
  if (node.type === 'select') return <div {...dataAttrs} style={style}><label>{node.props?.label}</label><select name={node.props?.name}>{(node.props?.options || []).map((o) => <option key={o} value={o}>{o}</option>)}</select></div>;
  if (node.type === 'textarea') return <div {...dataAttrs} style={style}><label>{node.props?.label}</label><textarea name={node.props?.name} placeholder={node.props?.placeholder} rows={node.props?.rows || 4} /></div>;
  if (node.type === 'label') return <label {...dataAttrs} htmlFor={node.props?.htmlFor} style={style}>{node.props?.text}</label>;
  if (node.type === 'menuitem') return <a {...dataAttrs} href={node.props?.href || '#'} style={style}>{node.props?.label || 'Item'}</a>;
  if (node.type === 'form') return <form {...dataAttrs} name={node.props?.name} action={node.props?.action} method={node.props?.method || 'POST'} style={style}>{(node.children || []).map((child) => <ExperienceNode key={child.id} node={child} />)}</form>;
  const Tag = node.type === 'navbar' ? 'nav' : node.type === 'footer' ? 'footer' : node.type === 'menu' ? 'nav' : 'section';
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
    .replace("import interactionsData from '../data/interactions-data.json';", "import interactionsData from '../lib/interactions-data.json';")
    .replace("import dataSchema from '../data/data-schema.json';", "import dataSchema from '../lib/data-schema.json';")
    .replace("import variablesData from '../data/variables-data.json';", "import variablesData from '../lib/variables-data.json';");

const nextFiles = (snapshot: ProjectExperience): ExportFile[] => [
  { path: 'app/page.tsx', content: "import PageExperience from '../components/PageExperience';\n\nexport default function Page() {\n  return <PageExperience />;\n}\n", language: 'tsx' },
  { path: 'components/SceneCanvas.tsx', content: nextSceneCanvas(), language: 'tsx' },
  { path: 'components/Hero3D.tsx', content: "import PageExperience from './PageExperience';\n\nexport default function Hero3D() {\n  return <PageExperience />;\n}\n", language: 'tsx' },
  { path: 'components/PageExperience.tsx', content: nextPageExperience(), language: 'tsx' },
  { path: 'components/sections/SectionRenderer.tsx', content: "export { default } from '../PageExperience';\n", language: 'tsx' },
  ...dataFiles(snapshot, 'lib'),
  ...generateApiRouteFiles(snapshot.dataSchema),
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

const escapeHtml = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const camelToKebab = (str: string) => str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

const unitlessProps = new Set(['zIndex', 'opacity', 'lineHeight', 'fontWeight', 'flex', 'flexGrow', 'flexShrink', 'order']);

const stylePropToCss = (key: string, value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null;
  const prop = camelToKebab(key);
  if (typeof value === 'number' && !unitlessProps.has(key)) return `${prop}: ${value}px`;
  return `${prop}: ${value}`;
};

const styleBlockToCss = (style: PageStyle): string => {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(style)) {
    const decl = stylePropToCss(key, value);
    if (decl) lines.push(`  ${decl};`);
  }
  return lines.join('\n');
};

const collectAllNodes = (nodes: PageNode[]): PageNode[] => {
  const result: PageNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children) result.push(...collectAllNodes(node.children));
  }
  return result;
};

const resolveBindings = (value: string, variables?: VariableDocument): string => {
  if (!value) return '';
  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
    const k = key.trim();
    if (k.startsWith('vars.') && variables?.variables) {
      const v = variables.variables.find((v) => v.name === k.slice(5));
      return v ? String(v.value) : '';
    }
    return '';
  });
};

const sampleRecordsForExport = (collection: { fields?: { name: string; type: string; label: string; system?: boolean }[] } | undefined, count = 4) =>
  Array.from({ length: count }, (_, i) =>
    Object.fromEntries((collection?.fields || []).map((f) => [f.name, f.name === 'id' ? `rec_${i + 1}` : f.type === 'number' ? (i + 1) * 10 : `${f.label} ${i + 1}`])),
  );

const collectionForExport = (ref: string, dataSchema?: DataSchema) =>
  dataSchema?.collections?.find((c) => c.id === ref || c.name === ref) || dataSchema?.collections?.[0];

const displayValue = (value: unknown) =>
  value === undefined || value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);

const tagForNode = (node: PageNode): string => {
  switch (node.type) {
    case 'navbar': return 'nav';
    case 'footer': return 'footer';
    case 'menu': return 'nav';
    case 'menuitem': return 'a';
    case 'button': return 'a';
    case 'text': return String(node.props.as || 'p');
    case 'image': return 'img';
    case 'video': return 'video';
    case 'input': return 'div';
    case 'select': return 'div';
    case 'textarea': return 'div';
    case 'label': return 'label';
    case 'form': return 'form';
    case 'dataForm': return 'form';
    case 'sceneCanvas': return 'div';
    case 'card': return 'article';
    case 'dataTable': return 'div';
    case 'dataList': return 'div';
    case 'dataChart': return 'div';
    case 'dataStat': return 'div';
    case 'modal': return 'div';
    case 'container': return 'div';
    default: return 'section';
  }
};

const buildHtmlNode = (node: PageNode, snapshot: ProjectExperience): string => {
  if (node.hidden) return '';
  const tag = tagForNode(node);
  const attrs: string[] = [`data-experience-node="${node.id}"`];
  const responsive = node.responsive;
  if (responsive?.tablet?.visible === false) attrs.push('data-hide-tablet');
  if (responsive?.mobile?.visible === false) attrs.push('data-hide-mobile');

  let inner = '';
  const props = node.props;

  switch (node.type) {
    case 'button':
      attrs.push(`href="${escapeHtml(String(props.href || '#'))}"`);
      inner = escapeHtml(resolveBindings(String(props.label || 'Button'), snapshot.variables));
      break;
    case 'text':
      inner = escapeHtml(resolveBindings(String(props.text || ''), snapshot.variables));
      break;
    case 'image':
      attrs.push(`src="${escapeHtml(String(props.src || ''))}"`);
      attrs.push(`alt="${escapeHtml(String(props.alt || ''))}"`);
      attrs.push(`loading="lazy"`);
      return `<${tag} ${attrs.join(' ')} />`;
    case 'video':
      attrs.push(`src="${escapeHtml(String(props.src || ''))}"`);
      if (props.poster) attrs.push(`poster="${escapeHtml(String(props.poster))}"`);
      if (props.controls !== false) attrs.push('controls');
      if (props.autoplay) { attrs.push('autoplay'); attrs.push('muted'); attrs.push('playsinline'); }
      return `<${tag} ${attrs.join(' ')}></${tag}>`;
    case 'sceneCanvas':
      attrs.push('class="scene-canvas"');
      return `<${tag} ${attrs.join(' ')}></${tag}>`;
    case 'input': {
      if (props.label) inner += `<label>${escapeHtml(String(props.label))}</label>`;
      const inpAttrs = [`name="${escapeHtml(String(props.name || ''))}"`, `type="${escapeHtml(String(props.type || 'text'))}"`];
      if (props.placeholder) inpAttrs.push(`placeholder="${escapeHtml(String(props.placeholder))}"`);
      if (props.required) inpAttrs.push('required');
      inner += `<input ${inpAttrs.join(' ')} />`;
      break;
    }
    case 'select': {
      if (props.label) inner += `<label>${escapeHtml(String(props.label))}</label>`;
      const opts = (props.options as string[] || []).map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
      inner += `<select name="${escapeHtml(String(props.name || ''))}">${opts}</select>`;
      break;
    }
    case 'textarea': {
      if (props.label) inner += `<label>${escapeHtml(String(props.label))}</label>`;
      inner += `<textarea name="${escapeHtml(String(props.name || ''))}" placeholder="${escapeHtml(String(props.placeholder || ''))}" rows="${props.rows || 4}"></textarea>`;
      break;
    }
    case 'label':
      if (props.htmlFor) attrs.push(`for="${escapeHtml(String(props.htmlFor))}"`);
      inner = escapeHtml(String(props.text || ''));
      break;
    case 'menuitem':
      attrs.push(`href="${escapeHtml(String(props.href || '#'))}"`);
      inner = escapeHtml(String(props.label || 'Item'));
      break;
    case 'form':
      if (props.name) attrs.push(`name="${escapeHtml(String(props.name))}"`);
      if (props.action) attrs.push(`action="${escapeHtml(String(props.action))}"`);
      attrs.push(`method="${escapeHtml(String(props.method || 'POST'))}"`);
      break;
    case 'dataForm': {
      attrs.push('method="POST"');
      const collection = collectionForExport(String(props.collectionId), snapshot.dataSchema);
      const fields = (collection?.fields || []).filter((f) => !f.system && f.type !== 'relation');
      fields.forEach((f) => {
        inner += `<label>${escapeHtml(f.label)}<input name="${escapeHtml(f.name)}"${f.required ? ' required' : ''} /></label>`;
      });
      inner += `<button type="submit">${escapeHtml(String(props.submitLabel || 'Salvar'))}</button>`;
      break;
    }
    case 'dataTable': {
      const collection = collectionForExport(String(props.collectionId), snapshot.dataSchema);
      const fields = (collection?.fields || []).filter((f) => !f.system).slice(0, 6);
      const rows = sampleRecordsForExport(collection, Number(props.limit) || 6);
      inner += '<table><thead><tr>';
      fields.forEach((f) => { inner += `<th>${escapeHtml(f.label)}</th>`; });
      inner += '</tr></thead><tbody>';
      rows.forEach((r) => {
        inner += '<tr>';
        fields.forEach((f) => { inner += `<td>${escapeHtml(displayValue(r[f.name]))}</td>`; });
        inner += '</tr>';
      });
      inner += '</tbody></table>';
      break;
    }
    case 'dataList': {
      const collection = collectionForExport(String(props.collectionId), snapshot.dataSchema);
      const records = sampleRecordsForExport(collection, Number(props.limit) || 6);
      const titleField = String(props.titleField || 'name');
      const bodyField = String(props.bodyField || 'message');
      records.forEach((r) => {
        inner += `<article><h3>${escapeHtml(displayValue(r[titleField]))}</h3><p>${escapeHtml(displayValue(r[bodyField]))}</p></article>`;
      });
      break;
    }
    case 'dataChart': {
      const collection = collectionForExport(String(props.collectionId), snapshot.dataSchema);
      const records = sampleRecordsForExport(collection, Number(props.limit) || 5);
      records.forEach((_r, i) => {
        inner += `<div class="chart-bar" style="flex:1;height:${(i + 1) * 18}%;background:#34d399;border-radius:6px"></div>`;
      });
      break;
    }
    case 'dataStat': {
      const collection = collectionForExport(String(props.collectionId), snapshot.dataSchema);
      inner += `<span>${escapeHtml(String(props.label || collection?.label || 'Total'))}</span>`;
      inner += `<strong>${sampleRecordsForExport(collection).length}</strong>`;
      break;
    }
    default:
      if (props.brand) inner += `<strong>${escapeHtml(String(props.brand))}</strong>`;
      if (props.title) inner += `<h3>${escapeHtml(String(props.title))}</h3>`;
      if (props.body) inner += `<p>${escapeHtml(String(props.body))}</p>`;
      break;
  }

  if (node.children) {
    inner += node.children.map((child) => buildHtmlNode(child, snapshot)).join('');
  }

  return `<${tag} ${attrs.join(' ')}>\n${inner}\n</${tag}>`;
};

const buildHtmlTree = (nodes: PageNode[], snapshot: ProjectExperience): string =>
  nodes.map((node) => buildHtmlNode(node, snapshot)).join('\n');

const buildCssFromPage = (page: PageDocument): string => {
  const allNodes = collectAllNodes(page.children);
  const breakpoints = page.responsive || [
    { name: 'desktop', width: 1280 },
    { name: 'tablet', width: 820 },
    { name: 'mobile', width: 390 },
  ];
  const tabletWidth = breakpoints.find((b) => b.name === 'tablet')?.width ?? 820;
  const mobileWidth = breakpoints.find((b) => b.name === 'mobile')?.width ?? 390;

  const lines: string[] = [
    '/* Base Reset */',
    '*, *::before, *::after { box-sizing: border-box; margin: 0; }',
    'body { margin: 0; background: #101214; color: #f5f5f4; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }',
    'a { text-decoration: none; color: inherit; }',
    'img, video { max-width: 100%; display: block; }',
    'table { width: 100%; border-collapse: collapse; }',
    'th, td { text-align: left; padding: 10px; }',
    '',
    '/* 3D Scene Canvas */',
    '.scene-canvas { min-height: 360px; background: #0f1214; position: relative; }',
    '.scene-canvas canvas { display: block; width: 100% !important; height: 100% !important; }',
    '',
    '/* Component Styles */',
  ];

  for (const node of allNodes) {
    if (node.hidden) continue;
    const baseCss = styleBlockToCss(node.styles.base);
    if (baseCss) {
      lines.push(`[data-experience-node="${node.id}"] {`);
      lines.push(baseCss);
      lines.push('}');
    }
  }

  const tabletRules: string[] = [];
  const mobileRules: string[] = [];
  for (const node of allNodes) {
    if (node.hidden) continue;
    if (node.styles.tablet && Object.keys(node.styles.tablet).length > 0) {
      const css = styleBlockToCss(node.styles.tablet);
      if (css) tabletRules.push(`[data-experience-node="${node.id}"] {\n${css}\n}`);
    }
    if (node.styles.mobile && Object.keys(node.styles.mobile).length > 0) {
      const css = styleBlockToCss(node.styles.mobile);
      if (css) mobileRules.push(`[data-experience-node="${node.id}"] {\n${css}\n}`);
    }
  }

  if (tabletRules.length > 0) {
    lines.push('');
    lines.push(`/* Tablet (max-width: ${tabletWidth}px) */`);
    lines.push(`@media (max-width: ${tabletWidth}px) {`);
    lines.push(tabletRules.join('\n'));
    lines.push('}');
  }

  if (mobileRules.length > 0) {
    lines.push('');
    lines.push(`/* Mobile (max-width: ${mobileWidth}px) */`);
    lines.push(`@media (max-width: ${mobileWidth}px) {`);
    lines.push(mobileRules.join('\n'));
    lines.push('}');
  }

  const hasHideTablet = allNodes.some((n) => n.responsive?.tablet?.visible === false);
  const hasHideMobile = allNodes.some((n) => n.responsive?.mobile?.visible === false);

  if (hasHideTablet) {
    lines.push('');
    lines.push(`@media (max-width: ${tabletWidth}px) {`);
    lines.push('  [data-hide-tablet] { display: none !important; }');
    lines.push('}');
  }
  if (hasHideMobile) {
    lines.push('');
    lines.push(`@media (max-width: ${mobileWidth}px) {`);
    lines.push('  [data-hide-mobile] { display: none !important; }');
    lines.push('}');
  }

  const pseudoRules: string[] = [];
  for (const node of allNodes) {
    if (node.hidden || !node.pseudo) continue;
    for (const [pseudo, bpStyles] of Object.entries(node.pseudo)) {
      const baseStyle = bpStyles?.base;
      if (baseStyle && Object.keys(baseStyle).length > 0) {
        const css = styleBlockToCss(baseStyle);
        if (css) pseudoRules.push(`[data-experience-node="${node.id}"]:${pseudo} {\n${css}\n}`);
      }
    }
  }
  if (pseudoRules.length > 0) {
    lines.push('');
    lines.push('/* Pseudo-class Styles */');
    lines.push(pseudoRules.join('\n'));
  }

  return lines.join('\n');
};

const STANDALONE_RUNTIME = `
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/loaders/GLTFLoader.js';

const sceneData = window.__SCENE_DATA__;
const interactionsData = window.__INTERACTIONS_DATA__;
const variablesData = window.__VARIABLES_DATA__ || { variables: [] };

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
  const needsDomTarget = ['showElement', 'hideElement', 'changeText', 'openModal', 'navigateToLink'].includes(interaction.action);
  if (!target && needsDomTarget) return;
  if (interaction.action === 'showElement' && target) target.style.display = '';
  if (interaction.action === 'hideElement' && target) target.style.display = 'none';
  if (interaction.action === 'changeText' && target) target.textContent = interaction.params.text || '';
  if (interaction.action === 'openModal') alert([interaction.params.title, interaction.params.body].filter(Boolean).join('\\\\n\\\\n'));
  if (interaction.action === 'navigateToLink') window.location.href = interaction.params.href || '#';
  if (interaction.action === 'setVariable') {
    const v = variablesData.variables?.find((item) => item.name === interaction.params.variableName);
    if (v) v.value = interaction.params.value;
  }
  if (interaction.action === 'toggleVariable') {
    const v = variablesData.variables?.find((item) => item.name === interaction.params.variableName);
    if (v) v.value = !Boolean(v.value);
  }
  if (interaction.action === 'incrementVariable') {
    const v = variablesData.variables?.find((item) => item.name === interaction.params.variableName);
    if (v) v.value = Number(v.value || 0) + Number(interaction.params.amount || 1);
  }
  if (interaction.action === 'showToast') alert(interaction.params.message || 'Acao executada');
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

document.querySelectorAll('.scene-canvas').forEach((el) => mountScene(el));
wireInteractions();
`;

const htmlFiles = (snapshot: ProjectExperience): ExportFile[] => {
  const sceneJson = asJson(snapshot.scene);
  const interactionsJson = asJson(snapshot.interactions);
  const dataSchemaJson = asJson(snapshot.dataSchema ?? null);
  const variablesJson = asJson(snapshot.variables ?? null);
  const htmlBody = buildHtmlTree(snapshot.page.children, snapshot);
  const cssContent = buildCssFromPage(snapshot.page);
  return [
    {
      path: 'index.html',
      language: 'html',
      content: `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(snapshot.name)}</title>
    <meta name="description" content="${escapeHtml(snapshot.page.description || '')}" />
    <link rel="stylesheet" href="./style.css" />
    <script>
      window.__SCENE_DATA__ = ${sceneJson};
      window.__INTERACTIONS_DATA__ = ${interactionsJson};
      window.__DATA_SCHEMA__ = ${dataSchemaJson};
      window.__VARIABLES_DATA__ = ${variablesJson};
    </script>
  </head>
  <body>
    <main>
${htmlBody}
    </main>
    <script type="module" src="./main.js"></script>
  </body>
</html>
`,
    },
    {
      path: 'style.css',
      language: 'css',
      content: cssContent,
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
  snapshot.assets ?? collectProjectAssets(snapshot.page, snapshot.scene, snapshot.pages);
