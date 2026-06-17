import { NextResponse } from 'next/server';

const POLYHAVEN_FILES_URL = 'https://api.polyhaven.com/files';
const RESOLUTIONS = ['1k', '2k', '4k', '8k'] as const;
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
};

type PolyHavenFile = {
  url?: string;
  include?: Record<string, { url?: string }>;
};

type PolyHavenFilesResponse = {
  gltf?: Partial<Record<(typeof RESOLUTIONS)[number], { gltf?: PolyHavenFile }>>;
};

type GltfJson = Record<string, unknown> & {
  buffers?: Array<Record<string, unknown> & { uri?: string }>;
  images?: Array<Record<string, unknown> & { uri?: string }>;
};

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const basename = (value: string) =>
  value
    .split(/[?#]/)[0]
    .replaceAll('\\', '/')
    .split('/')
    .pop()
    ?.toLowerCase() ?? '';

const normalizePath = (value: string) =>
  value
    .split(/[?#]/)[0]
    .replaceAll('\\', '/')
    .replace(/^\.\//, '')
    .toLowerCase();

const proxyUrl = (url: string) => `/api/assets/proxy?url=${encodeURIComponent(url)}`;

const selectGltfFile = (files: PolyHavenFilesResponse, requestedResolution: string | null) => {
  const resolution = RESOLUTIONS.includes(requestedResolution as (typeof RESOLUTIONS)[number])
    ? (requestedResolution as (typeof RESOLUTIONS)[number])
    : '1k';

  return files.gltf?.[resolution]?.gltf ?? RESOLUTIONS.map((item) => files.gltf?.[item]?.gltf).find(Boolean) ?? null;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const id = decodeURIComponent(params.id);
    const { searchParams } = new URL(request.url);

    const filesResponse = await fetch(`${POLYHAVEN_FILES_URL}/${encodeURIComponent(id)}`, {
      next: { revalidate: 86400 },
    });

    if (!filesResponse.ok) {
      return NextResponse.json({ error: 'Asset nao encontrado na Poly Haven.' }, { status: filesResponse.status });
    }

    const files = (await filesResponse.json()) as PolyHavenFilesResponse;
    const useProxy = searchParams.get('delivery') === 'proxy';
    const gltfFile = selectGltfFile(files, searchParams.get('resolution'));

    if (!gltfFile?.url) {
      return NextResponse.json({ error: 'Este asset nao possui versao GLTF disponivel.' }, { status: 404 });
    }

    const gltfResponse = await fetch(gltfFile.url, {
      next: { revalidate: 86400 },
    });

    if (!gltfResponse.ok) {
      return NextResponse.json({ error: 'Falha ao carregar o GLTF da Poly Haven.' }, { status: gltfResponse.status });
    }

    const gltf = (await gltfResponse.json()) as GltfJson;
    const includeByPath = new Map<string, string>();
    const includeByName = new Map<string, string>();

    Object.entries(gltfFile.include ?? {}).forEach(([path, file]) => {
      if (!file.url) return;
      includeByPath.set(normalizePath(path), file.url);
      includeByName.set(basename(path), file.url);
      includeByName.set(basename(file.url), file.url);
    });

    const rewriteUri = (uri: string | undefined) => {
      if (!uri || uri.startsWith('data:')) return uri;
      const includeUrl = includeByPath.get(normalizePath(uri)) ?? includeByName.get(basename(uri));
      if (!includeUrl) return uri;
      return useProxy ? proxyUrl(includeUrl) : includeUrl;
    };

    if (Array.isArray(gltf.buffers)) {
      gltf.buffers = gltf.buffers.map((buffer) => ({ ...buffer, uri: rewriteUri(buffer.uri) }));
    }

    if (Array.isArray(gltf.images)) {
      gltf.images = gltf.images.map((image) => ({ ...image, uri: rewriteUri(image.uri) }));
    }

    return NextResponse.json(gltf, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: 'Falha ao preparar o asset da Poly Haven.' }, { status: 500 });
  }
}
