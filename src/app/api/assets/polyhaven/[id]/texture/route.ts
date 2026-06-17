import { NextResponse } from 'next/server';

const POLYHAVEN_FILES_URL = 'https://api.polyhaven.com/files';
const RESOLUTIONS = ['1k', '2k', '4k', '8k'] as const;
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
};

type TextureFile = {
  url?: string;
};

type TextureResolutionSet = Partial<Record<'jpg' | 'png' | 'exr', TextureFile>>;
type TextureMapSet = Partial<Record<(typeof RESOLUTIONS)[number], TextureResolutionSet>>;
type PolyHavenTextureFiles = Partial<Record<'Diffuse' | 'nor_gl' | 'Rough' | 'Displacement', TextureMapSet>>;

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

const pickTextureUrl = (mapSet: TextureMapSet | undefined, requestedResolution: string | null) => {
  if (!mapSet) return null;

  const preferredResolution = RESOLUTIONS.includes(requestedResolution as (typeof RESOLUTIONS)[number])
    ? (requestedResolution as (typeof RESOLUTIONS)[number])
    : '1k';
  const resolution = mapSet[preferredResolution] ? preferredResolution : RESOLUTIONS.find((item) => mapSet[item]);
  if (!resolution) return null;

  return mapSet[resolution]?.jpg?.url ?? mapSet[resolution]?.png?.url ?? null;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const id = decodeURIComponent(params.id);
    const { searchParams } = new URL(request.url);

    const response = await fetch(`${POLYHAVEN_FILES_URL}/${encodeURIComponent(id)}`, {
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Textura nao encontrada na Poly Haven.' }, { status: response.status });
    }

    const files = (await response.json()) as PolyHavenTextureFiles;
    const resolution = searchParams.get('resolution');
    const maps = {
      diffuse: pickTextureUrl(files.Diffuse, resolution),
      normal: pickTextureUrl(files.nor_gl, resolution),
      roughness: pickTextureUrl(files.Rough, resolution),
      displacement: pickTextureUrl(files.Displacement, resolution),
    };

    if (!maps.diffuse) {
      return NextResponse.json({ error: 'Esta textura nao possui mapa diffuse em JPG ou PNG.' }, { status: 404 });
    }

    return NextResponse.json({ maps }, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: 'Falha ao preparar textura da Poly Haven.' }, { status: 500 });
  }
}
