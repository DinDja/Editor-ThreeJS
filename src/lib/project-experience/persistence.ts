import type { InteractionDocument } from '@/lib/interaction-engine/types';
import { createDefaultProjectSettings } from '@/lib/page-builder/defaults';
import { walkPageNodes } from '@/lib/page-builder/tree';
import type {
  PageDocument,
  ProjectAsset,
  ProjectAssetKind,
  ProjectAssetSource,
  ProjectExperience,
  ProjectRendererSettings,
  ProjectSeoSettings,
  ProjectSettings,
} from '@/lib/page-builder/types';
import type { SceneDocument } from '@/lib/scene-engine/types';
import { createExperienceSnapshot } from '@/lib/export-engine/exportExperience';

export const PROJECT_EXPERIENCE_SCHEMA_VERSION = 1;
export const PROJECT_EXPERIENCE_EDITOR_VERSION = 'brain-app-web3d-builder';

export type ProjectExperienceFile = ProjectExperience & {
  schemaVersion: typeof PROJECT_EXPERIENCE_SCHEMA_VERSION;
  savedAt: string;
  editorVersion: string;
  assets: ProjectAsset[];
  seo: ProjectSeoSettings;
  renderer: ProjectRendererSettings;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const stringProp = (value: Record<string, unknown>, key: string) =>
  isString(value[key]) ? value[key] : undefined;

const getNodeAssetKind = (type: string, prop: string): ProjectAssetKind => {
  if (type === 'image') return 'image';
  if (type === 'video' || prop === 'poster') return 'video';
  return 'unknown';
};

export const collectProjectAssets = (page: PageDocument, scene: SceneDocument): ProjectAsset[] => {
  const assets: ProjectAsset[] = [];
  const seen = new Set<string>();

  const addAsset = (
    kind: ProjectAssetKind,
    source: ProjectAssetSource,
    url: unknown,
    details: Omit<ProjectAsset, 'id' | 'kind' | 'source' | 'url'> = {},
  ) => {
    if (!isString(url) || !url.trim()) return;
    const cleanUrl = url.trim();
    const key = `${kind}:${source}:${cleanUrl}`;
    if (seen.has(key)) return;
    seen.add(key);
    assets.push({
      id: `asset-${assets.length + 1}`,
      kind,
      source,
      url: cleanUrl,
      ...details,
    });
  };

  for (const object of scene.objects) {
    addAsset(object.kind === 'model' ? 'model' : 'unknown', 'scene', object.source, {
      name: object.name,
      objectId: object.uuid,
    });
  }

  for (const material of scene.materials) {
    addAsset('texture', 'material', material.textureUrl, {
      name: material.textureName ?? material.name,
      materialId: material.uuid,
      objectId: material.objectId,
    });
    addAsset('texture', 'material', material.normalMapUrl, {
      name: `${material.name} normal`,
      materialId: material.uuid,
      objectId: material.objectId,
    });
    addAsset('texture', 'material', material.roughnessMapUrl, {
      name: `${material.name} roughness`,
      materialId: material.uuid,
      objectId: material.objectId,
    });
    addAsset('texture', 'material', material.displacementMapUrl, {
      name: `${material.name} displacement`,
      materialId: material.uuid,
      objectId: material.objectId,
    });
  }

  for (const reference of scene.referenceImages) {
    addAsset('reference', 'reference', reference.imageUrl, {
      name: reference.name,
    });
  }

  walkPageNodes(page.children, (node) => {
    addAsset(getNodeAssetKind(node.type, 'src'), 'page', node.props.src, {
      name: node.name,
      pageNodeId: node.id,
    });
    addAsset(getNodeAssetKind(node.type, 'poster'), 'page', node.props.poster, {
      name: `${node.name} poster`,
      pageNodeId: node.id,
    });
  });

  return assets;
};

const normalizeSettings = (settings: unknown): ProjectSettings => {
  const defaults = createDefaultProjectSettings();
  if (!isRecord(settings)) return defaults;
  const budget = isRecord(settings.performanceBudget) ? settings.performanceBudget : {};

  return {
    ...defaults,
    ...(settings as Partial<ProjectSettings>),
    performanceBudget: {
      ...defaults.performanceBudget,
      ...(budget as Partial<ProjectSettings['performanceBudget']>),
    },
  };
};

const normalizeSeo = (seo: unknown, projectName: string): ProjectSeoSettings => {
  if (!isRecord(seo)) {
    return {
      title: projectName,
      description: '',
      lang: 'pt-BR',
    };
  }

  return {
    title: stringProp(seo, 'title') ?? projectName,
    description: stringProp(seo, 'description') ?? '',
    lang: stringProp(seo, 'lang') ?? 'pt-BR',
  };
};

const normalizeRenderer = (renderer: unknown): ProjectRendererSettings => {
  if (!isRecord(renderer)) {
    return {
      shadows: true,
      dpr: [1, 2],
      background: null,
      toneMapping: 'default',
    };
  }

  const rawDpr = Array.isArray(renderer.dpr) ? renderer.dpr : [1, 2];
  const minDpr = Number(rawDpr[0]);
  const maxDpr = Number(rawDpr[1]);
  const toneMapping = renderer.toneMapping === 'aces' || renderer.toneMapping === 'none' ? renderer.toneMapping : 'default';

  return {
    shadows: renderer.shadows !== false,
    dpr: [
      Number.isFinite(minDpr) ? minDpr : 1,
      Number.isFinite(maxDpr) ? maxDpr : 2,
    ],
    background: isString(renderer.background) ? renderer.background : null,
    toneMapping,
  };
};

export const createProjectExperienceFile = ({
  page,
  scene,
  interactions,
  settings,
  seo,
  renderer,
}: {
  page: PageDocument;
  scene: SceneDocument;
  interactions: InteractionDocument[];
  settings: ProjectSettings;
  seo?: Partial<ProjectSeoSettings>;
  renderer?: Partial<ProjectRendererSettings>;
}): ProjectExperienceFile => {
  const snapshot = createExperienceSnapshot({ page, scene, interactions, settings });
  const normalizedSeo = normalizeSeo(seo ?? {}, snapshot.name);
  const normalizedRenderer = normalizeRenderer(renderer ?? {});

  return {
    ...snapshot,
    schemaVersion: PROJECT_EXPERIENCE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    editorVersion: PROJECT_EXPERIENCE_EDITOR_VERSION,
    assets: collectProjectAssets(page, scene),
    seo: normalizedSeo,
    renderer: normalizedRenderer,
  };
};

export const parseProjectExperienceFile = (content: string): ProjectExperienceFile => {
  const parsed = JSON.parse(content) as unknown;
  if (!isRecord(parsed)) throw new Error('Arquivo de projeto invalido.');

  const rawVersion = Number(parsed.schemaVersion ?? 0);
  if (rawVersion > PROJECT_EXPERIENCE_SCHEMA_VERSION) {
    throw new Error(`Este projeto usa schema ${rawVersion}, mas o editor suporta ate ${PROJECT_EXPERIENCE_SCHEMA_VERSION}.`);
  }

  if (!isRecord(parsed.page) || !isRecord(parsed.scene) || !Array.isArray(parsed.interactions)) {
    throw new Error('O arquivo nao contem page, scene e interactions validos.');
  }

  const settings = normalizeSettings(parsed.settings);
  const name = stringProp(parsed, 'name') ?? settings.name;
  const page = parsed.page as PageDocument;
  const scene = parsed.scene as SceneDocument;
  const interactions = parsed.interactions as InteractionDocument[];

  return {
    id: stringProp(parsed, 'id') ?? settings.id,
    name,
    page,
    scene,
    interactions,
    settings: { ...settings, name },
    schemaVersion: PROJECT_EXPERIENCE_SCHEMA_VERSION,
    savedAt: stringProp(parsed, 'savedAt') ?? new Date().toISOString(),
    editorVersion: stringProp(parsed, 'editorVersion') ?? PROJECT_EXPERIENCE_EDITOR_VERSION,
    assets: Array.isArray(parsed.assets) ? (parsed.assets as ProjectAsset[]) : collectProjectAssets(page, scene),
    seo: normalizeSeo(parsed.seo, name),
    renderer: normalizeRenderer(parsed.renderer),
  };
};

export const serializeProjectExperienceFile = (project: ProjectExperienceFile) =>
  JSON.stringify(project, null, 2);

export const downloadProjectExperienceFile = (project: ProjectExperienceFile) => {
  const blob = new Blob([serializeProjectExperienceFile(project)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'web-3d-project'}.web3d.json`;
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
