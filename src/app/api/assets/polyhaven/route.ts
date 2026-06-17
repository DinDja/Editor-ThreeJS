import { NextResponse } from 'next/server';

const POLYHAVEN_ASSETS_URL = 'https://api.polyhaven.com/assets';
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
};

type PolyHavenAsset = {
  name?: string;
  categories?: string[];
  tags?: string[];
  polycount?: number;
  dimensions?: number[];
  description?: string;
  download_count?: number;
  thumbnail_url?: string;
};

const clampLimit = (value: string | null) => {
  const parsed = Number.parseInt(value ?? '36', 10);
  if (Number.isNaN(parsed)) return 36;
  return Math.min(Math.max(parsed, 1), 80);
};

const normalize = (value: string) => value.trim().toLowerCase();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assetType = searchParams.get('type') === 'textures' ? 'textures' : 'models';
    const query = normalize(searchParams.get('q') ?? '');
    const category = normalize(searchParams.get('category') ?? '');
    const limit = clampLimit(searchParams.get('limit'));

    const response = await fetch(`${POLYHAVEN_ASSETS_URL}?type=${assetType}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Falha ao carregar assets da Poly Haven.' }, { status: response.status });
    }

    const payload = (await response.json()) as Record<string, PolyHavenAsset>;
    const entries = Object.entries(payload);
    const categories = Array.from(
      new Set(entries.flatMap(([, asset]) => asset.categories ?? []).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    const assets = entries
      .map(([id, asset]) => ({
        id,
        name: asset.name ?? id.replace(/[_-]+/g, ' '),
        categories: asset.categories ?? [],
        tags: asset.tags ?? [],
        polycount: asset.polycount ?? null,
        dimensions: asset.dimensions ?? null,
        description: asset.description ?? '',
        downloadCount: asset.download_count ?? 0,
        thumbnailUrl: asset.thumbnail_url ?? null,
        assetType,
      }))
      .filter((asset) => {
        const matchesCategory = !category || asset.categories.some((item) => normalize(item) === category);
        if (!matchesCategory) return false;
        if (!query) return true;

        const searchable = [asset.id, asset.name, asset.description, ...asset.categories, ...asset.tags].join(' ').toLowerCase();
        return searchable.includes(query);
      })
      .sort((a, b) => b.downloadCount - a.downloadCount || a.name.localeCompare(b.name))
      .slice(0, limit);

    return NextResponse.json({ assets, categories }, { headers: CACHE_HEADERS });
  } catch {
    return NextResponse.json({ error: 'Falha ao consultar a biblioteca Poly Haven.' }, { status: 500 });
  }
}
