import { walkPageNodes } from '@/lib/page-builder/tree';
import type { PageDocument, ProjectSettings } from '@/lib/page-builder/types';
import type { EditorMaterial, PrimitiveGeometry, PrimitiveKind, SceneObject } from '@/store/types';

export type PreviewRuntimeMetrics = {
  objectCount: number;
  visibleObjectCount: number;
  meshCount: number;
  modelCount: number;
  editableMeshCount: number;
  lightCount: number;
  cameraCount: number;
  materialCount: number;
  textureCount: number;
  pageNodeCount: number;
  assetUrlCount: number;
  externalAssetCount: number;
  knownVertexCount: number;
  knownTriangleCount: number;
  unknownGeometryCount: number;
  unknownModelCount: number;
  warnings: string[];
};

export type AssetSizeInfo = {
  url: string;
  bytes: number;
  ok: boolean;
};

export type TextureResolutionInfo = {
  url: string;
  width: number;
  height: number;
};

export type ExtendedPreviewStats = {
  assetSizes: AssetSizeInfo[];
  totalAssetBytes: number;
  textureResolutions: TextureResolutionInfo[];
  largestTextureUrl: string | null;
  largestTexturePixels: number;
  drawCalls: number;
  geometries: number;
  textures: number;
  jsHeapUsedMB: number;
  jsHeapTotalMB: number;
  fps: number;
};

const fetchAssetSize = async (url: string): Promise<number> => {
  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) return -1;
    const buffer = await response.arrayBuffer();
    return buffer.byteLength;
  } catch {
    try {
      const head = await fetch(url, { method: 'HEAD' });
      const length = head.headers.get('content-length');
      if (length) return Number(length);
    } catch {
      // ignore
    }
    return -1;
  }
};

export const collectAssetSizes = async (urls: string[]): Promise<AssetSizeInfo[]> => {
  const unique = Array.from(new Set(urls.filter((url) => url?.trim())));
  const results = await Promise.all(
    unique.map(async (url) => {
      const bytes = await fetchAssetSize(url);
      return { url, bytes, ok: bytes >= 0 };
    }),
  );
  return results;
};

const loadImageSize = (url: string): Promise<TextureResolutionInfo | null> =>
  new Promise((resolve) => {
    if (typeof Image === 'undefined') return resolve(null);
    const img = new Image();
    img.onload = () => resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });

export const collectTextureResolutions = async (urls: string[]): Promise<TextureResolutionInfo[]> => {
  const unique = Array.from(new Set(urls.filter((url) => url?.trim())));
  const results = await Promise.all(unique.map((url) => loadImageSize(url)));
  return results.filter((entry): entry is TextureResolutionInfo => entry !== null);
};

export const collectAllAssetUrls = ({
  page,
  objects,
  materials,
}: {
  page: PageDocument;
  objects: SceneObject[];
  materials: Record<string, EditorMaterial>;
}): { modelUrls: string[]; textureUrls: string[]; imageUrls: string[]; all: string[] } => {
  const modelUrls = new Set<string>();
  const textureUrls = new Set<string>();
  const imageUrls = new Set<string>();

  for (const object of objects) {
    if (object.source) modelUrls.add(object.source);
  }
  for (const material of Object.values(materials)) {
    [material.textureUrl, material.normalMapUrl, material.roughnessMapUrl, material.displacementMapUrl].forEach((url) => {
      if (url?.trim()) textureUrls.add(url);
    });
  }
  walkPageNodes(page.children, (node) => {
    const src = typeof node.props.src === 'string' ? node.props.src : null;
    const poster = typeof node.props.poster === 'string' ? node.props.poster : null;
    if (src) imageUrls.add(src);
    if (poster) imageUrls.add(poster);
  });

  return {
    modelUrls: Array.from(modelUrls),
    textureUrls: Array.from(textureUrls),
    imageUrls: Array.from(imageUrls),
    all: Array.from(new Set([...modelUrls, ...textureUrls, ...imageUrls])),
  };
};

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const segment = (value: number | undefined, fallback: number) =>
  Math.max(1, Math.round(Number.isFinite(value) ? Number(value) : fallback));

const estimatePrimitiveGeometry = (primitive: PrimitiveKind | undefined, geometry: PrimitiveGeometry | undefined) => {
  const widthSegments = segment(geometry?.widthSegments, 1);
  const heightSegments = segment(geometry?.heightSegments, 1);
  const depthSegments = segment(geometry?.depthSegments, 1);
  const radialSegments = segment(geometry?.radialSegments, 32);
  const tubularSegments = segment(geometry?.tubularSegments, 48);

  if (primitive === 'plane') {
    return {
      vertices: (widthSegments + 1) * (heightSegments + 1),
      triangles: widthSegments * heightSegments * 2,
    };
  }

  if (primitive === 'sphere') {
    return {
      vertices: (radialSegments + 1) * (heightSegments + 1),
      triangles: radialSegments * heightSegments * 2,
    };
  }

  if (primitive === 'cylinder' || primitive === 'cone') {
    return {
      vertices: (radialSegments + 1) * (heightSegments + 3),
      triangles: radialSegments * heightSegments * 2 + radialSegments * 2,
    };
  }

  if (primitive === 'torus') {
    return {
      vertices: (radialSegments + 1) * (tubularSegments + 1),
      triangles: radialSegments * tubularSegments * 2,
    };
  }

  return {
    vertices: (widthSegments + 1) * (heightSegments + 1) * (depthSegments + 1),
    triangles: 4 * (widthSegments * heightSegments + widthSegments * depthSegments + heightSegments * depthSegments),
  };
};

const textureUrlsForMaterial = (material: EditorMaterial) =>
  [
    material.textureUrl,
    material.normalMapUrl,
    material.roughnessMapUrl,
    material.displacementMapUrl,
  ].filter((url): url is string => Boolean(url?.trim()));

const isExternalAsset = (url: string) => /^https?:\/\//i.test(url);

export const computePreviewRuntimeMetrics = ({
  page,
  objects,
  materials,
  settings,
}: {
  page: PageDocument;
  objects: SceneObject[];
  materials: Record<string, EditorMaterial>;
  settings: ProjectSettings;
}): PreviewRuntimeMetrics => {
  let pageNodeCount = 0;
  const assetUrls = new Set<string>();

  walkPageNodes(page.children, (node) => {
    pageNodeCount += 1;
    for (const key of ['src', 'poster']) {
      const value = node.props[key];
      if (typeof value === 'string' && value.trim()) assetUrls.add(value.trim());
    }
  });

  let knownVertexCount = 0;
  let knownTriangleCount = 0;
  let unknownGeometryCount = 0;
  let unknownModelCount = 0;

  for (const object of objects) {
    if (object.source) assetUrls.add(object.source);

    if (object.editableMesh) {
      knownVertexCount += object.editableMesh.vertices.length;
      knownTriangleCount += Math.floor(object.editableMesh.indices.length / 3);
      continue;
    }

    if (object.kind === 'primitive') {
      const estimate = estimatePrimitiveGeometry(object.primitive, object.geometry);
      knownVertexCount += estimate.vertices;
      knownTriangleCount += estimate.triangles;
      continue;
    }

    if (object.kind === 'model') {
      unknownModelCount += 1;
      unknownGeometryCount += 1;
      continue;
    }

    if (object.kind === 'svg' || object.kind === 'text' || object.kind === 'mesh') {
      unknownGeometryCount += 1;
    }
  }

  const textureUrls = new Set<string>();
  for (const material of Object.values(materials)) {
    for (const url of textureUrlsForMaterial(material)) {
      textureUrls.add(url);
      assetUrls.add(url);
    }
  }

  const warnings = [
    unknownModelCount > 0 ? `${unknownModelCount} modelo(s) GLB/GLTF ainda precisam de estatistica carregada para vertices/triangulos exatos.` : null,
    textureUrls.size > 6 ? 'Ha muitas texturas ativas; considere atlas, compressao ou lazy loading.' : null,
    objects.length > 80 ? 'Cena com muitos objetos; agrupe, instancie ou reduza draw calls antes de exportar.' : null,
    assetUrls.size > 0 ? `Validar o budget de ${settings.performanceBudget.maxModelMb} MB com o tamanho real dos arquivos no empacotamento.` : null,
    Array.from(assetUrls).some((url) => url.startsWith('blob:')) ? 'Alguns assets sao blob/local e precisam ser empacotados no export final.' : null,
  ].filter((warning): warning is string => Boolean(warning));

  return {
    objectCount: objects.length,
    visibleObjectCount: objects.filter((object) => object.visible !== false).length,
    meshCount: objects.filter((object) => ['mesh', 'primitive', 'model', 'svg', 'text'].includes(object.kind)).length,
    modelCount: objects.filter((object) => object.kind === 'model').length,
    editableMeshCount: objects.filter((object) => Boolean(object.editableMesh)).length,
    lightCount: objects.filter((object) => object.kind === 'light' || object.type === 'Light').length,
    cameraCount: objects.filter((object) => object.kind === 'camera' || object.type === 'Camera').length,
    materialCount: Object.keys(materials).length,
    textureCount: textureUrls.size,
    pageNodeCount,
    assetUrlCount: assetUrls.size,
    externalAssetCount: Array.from(assetUrls).filter(isExternalAsset).length,
    knownVertexCount,
    knownTriangleCount,
    unknownGeometryCount,
    unknownModelCount,
    warnings,
  };
};
