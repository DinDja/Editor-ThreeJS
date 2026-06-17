import { NextResponse } from 'next/server';

const ALLOWED_HOST = 'dl.polyhaven.org';
const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
};

async function handleProxy(request: Request, method: 'GET' | 'HEAD') {
  try {
    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get('url');

    if (!urlParam) {
      return NextResponse.json({ error: 'URL do asset ausente.' }, { status: 400 });
    }

    const assetUrl = new URL(urlParam);
    if (assetUrl.hostname !== ALLOWED_HOST) {
      return NextResponse.json({ error: 'Origem de asset nao permitida.' }, { status: 403 });
    }

    const response = await fetch(assetUrl.toString(), {
      method,
      next: { revalidate: 86400 },
    });

    if (!response.ok || !response.body) {
      return NextResponse.json({ error: 'Falha ao carregar arquivo do asset.' }, { status: response.status });
    }

    const headers = new Headers(CACHE_HEADERS);
    headers.set('Content-Type', response.headers.get('content-type') ?? 'application/octet-stream');
    const contentLength = response.headers.get('content-length');
    const acceptRanges = response.headers.get('accept-ranges');
    const lastModified = response.headers.get('last-modified');
    const etag = response.headers.get('etag');
    if (contentLength) headers.set('Content-Length', contentLength);
    if (acceptRanges) headers.set('Accept-Ranges', acceptRanges);
    if (lastModified) headers.set('Last-Modified', lastModified);
    if (etag) headers.set('ETag', etag);

    return new Response(method === 'HEAD' ? null : response.body, {
      status: response.status,
      headers,
    });
  } catch {
    return NextResponse.json({ error: 'Falha ao fazer proxy do asset.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleProxy(request, 'GET');
}

export async function HEAD(request: Request) {
  return handleProxy(request, 'HEAD');
}
