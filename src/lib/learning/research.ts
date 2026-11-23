import 'server-only';

import type { LearningResearch, LearningResource } from './types';

const RESEARCH_TIMEOUT_MS = 5_000;
const MAX_RESEARCH_RESPONSE_CHARS = 280_000;
const MAX_RESOURCES = 12;
const RESEARCH_CACHE_TTL_MS = 10 * 60_000;
const RESEARCH_CACHE_VERSION = 'v2-youtube-results';
const researchCache = new Map<string, { expiresAt: number; value: LearningResearch }>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : '';

const stripHtml = (value: unknown, maxLength: number) =>
  text(value, maxLength)
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const requestJson = async (url: URL, requestSignal?: AbortSignal, headers?: HeadersInit): Promise<unknown> => {
  const signal = requestSignal
    ? AbortSignal.any([requestSignal, AbortSignal.timeout(RESEARCH_TIMEOUT_MS)])
    : AbortSignal.timeout(RESEARCH_TIMEOUT_MS);
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json', ...headers },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`research_http_${response.status}`);
  const body = await response.text();
  if (body.length > MAX_RESEARCH_RESPONSE_CHARS) throw new Error('research_response_too_large');
  return JSON.parse(body) as unknown;
};

const createResource = (resource: LearningResource): LearningResource => {
  const thumbnailUrl = resource.thumbnailUrl?.trim().slice(0, 700);
  const author = resource.author?.trim().slice(0, 120);
  return {
    ...resource,
    title: resource.title.trim().slice(0, 180),
    description: resource.description.trim().slice(0, 420),
    url: resource.url.trim().slice(0, 700),
    ...(thumbnailUrl && /^https?:\/\//i.test(thumbnailUrl) ? { thumbnailUrl } : {}),
    ...(author ? { author } : {}),
  };
};

const youtubeText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => youtubeText(item)).join('');
  if (!isRecord(value)) return '';
  if (typeof value.simpleText === 'string') return value.simpleText;
  if (typeof value.text === 'string') return value.text;
  if (Array.isArray(value.runs)) return value.runs.map((run) => youtubeText(run)).join('');
  if (isRecord(value.text)) return youtubeText(value.text);
  return '';
};

const youtubeThumbnail = (value: unknown) => {
  if (!isRecord(value) || !Array.isArray(value.thumbnails)) return '';
  return value.thumbnails
    .slice()
    .reverse()
    .map((thumbnail) => isRecord(thumbnail) ? text(thumbnail.url, 700) : '')
    .find((url) => /^https?:\/\//i.test(url)) ?? '';
};

const parseYouTubeInitialData = (html: string): unknown => {
  const marker = 'var ytInitialData = ';
  const markerStart = html.indexOf(marker);
  if (markerStart < 0) return null;
  const start = markerStart + marker.length;
  const end = html.indexOf(';</script>', start);
  if (end < 0) return null;
  try {
    return JSON.parse(html.slice(start, end));
  } catch {
    return null;
  }
};

const extractYouTubeVideos = (payload: unknown, query: string): LearningResource[] => {
  const stack: unknown[] = [payload];
  const videos: LearningResource[] = [];
  const seen = new Set<string>();

  while (stack.length > 0 && videos.length < 5) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      stack.push(...current);
      continue;
    }
    if (!isRecord(current)) continue;

    const renderer = isRecord(current.videoRenderer) ? current.videoRenderer : null;
    if (renderer) {
      const videoId = text(renderer.videoId, 80);
      const title = youtubeText(renderer.title).trim().slice(0, 180);
      if (videoId && title && !seen.has(videoId)) {
        seen.add(videoId);
        const description = youtubeText(renderer.detailedMetadataSnippets)
          || youtubeText(renderer.descriptionSnippet)
          || `Vídeo relacionado a ${query}.`;
        const author = youtubeText(renderer.ownerText).slice(0, 120);
        const thumbnailUrl = youtubeThumbnail(renderer.thumbnail);
        videos.push(createResource({
          id: `youtube-${videoId}`,
          provider: 'YouTube',
          kind: 'video',
          title,
          description: description.slice(0, 420),
          url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
          ...(thumbnailUrl ? { thumbnailUrl } : {}),
          ...(author ? { author } : {}),
        }));
      }
    }

    Object.values(current).forEach((value) => stack.push(value));
  }

  return videos;
};

const searchYouTubePage = async (query: string, requestSignal?: AbortSignal): Promise<LearningResource[]> => {
  const url = new URL('https://www.youtube.com/results');
  url.searchParams.set('search_query', query);
  url.searchParams.set('hl', 'pt-BR');
  url.searchParams.set('gl', 'BR');
  const signal = requestSignal
    ? AbortSignal.any([requestSignal, AbortSignal.timeout(RESEARCH_TIMEOUT_MS)])
    : AbortSignal.timeout(RESEARCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal,
      cache: 'no-store',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36',
      },
    });
    if (!response.ok) return [];
    const html = await response.text();
    if (html.length > 2_000_000) return [];
    return extractYouTubeVideos(parseYouTubeInitialData(html), query);
  } catch {
    return [];
  }
};

const fetchWikipediaThumbnails = async (titles: string[], requestSignal?: AbortSignal) => {
  if (titles.length === 0) return new Map<string, string>();
  const url = new URL('https://pt.wikipedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('prop', 'pageimages');
  url.searchParams.set('titles', titles.join('|'));
  url.searchParams.set('piprop', 'thumbnail');
  url.searchParams.set('pithumbsize', '640');
  url.searchParams.set('format', 'json');
  url.searchParams.set('utf8', '1');
  url.searchParams.set('origin', '*');

  try {
    const payload = await requestJson(url, requestSignal);
    if (!isRecord(payload) || !isRecord(payload.query) || !isRecord(payload.query.pages)) return new Map<string, string>();
    return new Map(Object.values(payload.query.pages).flatMap((page) => {
      if (!isRecord(page) || !isRecord(page.thumbnail)) return [];
      const title = text(page.title, 180);
      const source = text(page.thumbnail.source, 700);
      return title && /^https?:\/\//i.test(source) ? [[title, source] as const] : [];
    }));
  } catch {
    return new Map<string, string>();
  }
};

const searchWikipedia = async (query: string, requestSignal?: AbortSignal): Promise<LearningResource[]> => {
  const url = new URL('https://pt.wikipedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'search');
  url.searchParams.set('srsearch', query);
  url.searchParams.set('srlimit', '5');
  url.searchParams.set('format', 'json');
  url.searchParams.set('utf8', '1');
  url.searchParams.set('origin', '*');

  const payload = await requestJson(url, requestSignal);
  if (!isRecord(payload) || !isRecord(payload.query) || !Array.isArray(payload.query.search)) return [];

  const resources = payload.query.search.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const title = text(item.title, 180);
    if (!title) return [];
    const encodedTitle = encodeURIComponent(title.replace(/\s+/g, '_'));
    return [createResource({
      id: `wikipedia-${index + 1}-${encodedTitle.slice(0, 40)}`,
      provider: 'Wikipedia',
      kind: 'reference',
      title,
      description: stripHtml(item.snippet, 420) || 'Artigo de referência para aprofundar o tema.',
      url: `https://pt.wikipedia.org/wiki/${encodedTitle}`,
    })];
  });
  const thumbnails = await fetchWikipediaThumbnails(resources.map((resource) => resource.title), requestSignal);
  return resources.map((resource) => {
    const thumbnailUrl = thumbnails.get(resource.title);
    return thumbnailUrl ? { ...resource, thumbnailUrl } : resource;
  });
};

const searchYouTube = async (query: string, requestSignal?: AbortSignal): Promise<LearningResource[]> => {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    return searchYouTubeWithoutApiKey(query, requestSignal);
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('order', 'relevance');
  url.searchParams.set('maxResults', '5');
  url.searchParams.set('q', query);
  url.searchParams.set('relevanceLanguage', 'pt');
  url.searchParams.set('regionCode', 'BR');
  url.searchParams.set('safeSearch', 'strict');
  url.searchParams.set('videoEmbeddable', 'true');
  url.searchParams.set('key', apiKey);

  const payload = await requestJson(url, requestSignal);
  if (!isRecord(payload) || !Array.isArray(payload.items)) return [];

  const videos = payload.items.flatMap((item, index) => {
    if (!isRecord(item) || !isRecord(item.id) || !isRecord(item.snippet)) return [];
    const videoId = text(item.id.videoId, 80);
    const title = stripHtml(item.snippet.title, 180);
    if (!videoId || !title) return [];
    const thumbnails = isRecord(item.snippet.thumbnails) ? item.snippet.thumbnails : {};
    const medium = isRecord(thumbnails.medium) ? text(thumbnails.medium.url, 700) : '';
    return [createResource({
      id: `youtube-${videoId || index}`,
      provider: 'YouTube',
      kind: 'video',
      title,
      description: stripHtml(item.snippet.description, 420) || 'Vídeo relacionado ao tema da aula.',
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
      ...(medium ? { thumbnailUrl: medium } : {}),
      author: stripHtml(item.snippet.channelTitle, 120),
    })];
  });

  return videos.length > 0 ? videos : searchYouTubeWithoutApiKey(query, requestSignal);
};

const searchYouTubeWithoutApiKey = async (query: string, requestSignal?: AbortSignal): Promise<LearningResource[]> => {
  const videos = await searchYouTubePage(query, requestSignal);
  return videos.length > 0 ? videos : [createResource({
    id: 'youtube-search',
    provider: 'YouTube',
    kind: 'search',
    title: `Pesquisar vídeos sobre “${query}”`,
    description: 'Abra uma busca pronta no YouTube para encontrar explicações, aulas e demonstrações.',
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
  })];
};

const searchWeb = async (query: string, requestSignal?: AbortSignal): Promise<LearningResource[]> => {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!apiKey) return [];

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', '4');
  url.searchParams.set('search_lang', 'pt-br');
  url.searchParams.set('country', 'br');
  const payload = await requestJson(url, requestSignal, { 'X-Subscription-Token': apiKey });
  if (!isRecord(payload) || !isRecord(payload.web) || !Array.isArray(payload.web.results)) return [];

  return payload.web.results.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const title = text(item.title, 180);
    const resourceUrl = text(item.url, 700);
    if (!title || !/^https?:\/\//i.test(resourceUrl)) return [];
    return [createResource({
      id: `web-${index + 1}-${encodeURIComponent(resourceUrl).slice(0, 40)}`,
      provider: 'Web',
      kind: 'reference',
      title,
      description: stripHtml(item.description, 420) || 'Fonte externa relacionada ao tema.',
      url: resourceUrl,
      author: text(item.profile && isRecord(item.profile) ? item.profile.long_name : '', 120),
      thumbnailUrl: text(
        item.thumbnail && isRecord(item.thumbnail) ? item.thumbnail.src : item.image,
        700,
      ),
    })];
  });
};

export async function researchLearningTopic(
  topic: string,
  subjectName: string,
  requestSignal?: AbortSignal,
): Promise<LearningResearch> {
  const query = [subjectName, topic].filter((value) => value && value !== 'A combinar').join(': ').slice(0, 180);
  const cacheKey = `${RESEARCH_CACHE_VERSION}:${query.toLocaleLowerCase('pt-BR')}`;
  const cached = researchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const results = await Promise.allSettled([
    searchYouTube(query, requestSignal),
    searchWikipedia(query, requestSignal),
    searchWeb(query, requestSignal),
  ]);

  if (requestSignal?.aborted) {
    throw new DOMException('Pesquisa cancelada.', 'AbortError');
  }

  const resources = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const uniqueResources = Array.from(new Map(resources.map((resource) => [resource.url, resource])).values()).slice(0, MAX_RESOURCES);

  const research = {
    query,
    searchedAt: new Date().toISOString(),
    providers: Array.from(new Set(uniqueResources.map((resource) => resource.provider))),
    resources: uniqueResources,
  };
  if (!resources.some((resource) => resource.kind === 'search')) {
    researchCache.set(cacheKey, { expiresAt: Date.now() + RESEARCH_CACHE_TTL_MS, value: research });
  }
  if (researchCache.size > 100) {
    for (const [key, value] of researchCache) {
      if (value.expiresAt <= Date.now()) researchCache.delete(key);
    }
  }
  return research;
}
