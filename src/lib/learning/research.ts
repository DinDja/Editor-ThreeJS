import 'server-only';

import type {
  LearningResearch,
  LearningResource,
  LearningWikipediaArticle,
  LearningWikipediaImage,
} from './types';

const RESEARCH_TIMEOUT_MS = 5_000;
const MAX_RESEARCH_RESPONSE_CHARS = 280_000;
const MAX_WIKIPEDIA_PARSE_RESPONSE_CHARS = 480_000;
const MAX_RESOURCES = 12;
const RESEARCH_CACHE_TTL_MS = 10 * 60_000;
const RESEARCH_CACHE_VERSION = 'v7-reliable-media-curation';
const MAX_WIKIPEDIA_IMAGES = 8;
const MAX_WIKIPEDIA_IMAGE_CANDIDATES = 24;
const MAX_WIKIPEDIA_IMAGE_BATCH_SIZE = 6;
const MAX_WIKIPEDIA_IMAGE_RESPONSE_CHARS = 500_000;
const MAX_WIKIPEDIA_EXCERPT_CHARS = 12_000;
const WIKIPEDIA_USER_AGENT = 'Editor-ThreeJS-Learning/1.0 (https://github.com/DinDja/Editor-ThreeJS)';
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

const requestJson = async (
  url: URL,
  requestSignal?: AbortSignal,
  headers?: HeadersInit,
  maxResponseChars = MAX_RESEARCH_RESPONSE_CHARS,
): Promise<unknown> => {
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
  if (body.length > maxResponseChars) throw new Error('research_response_too_large');
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

const isYouTubeVideoId = (value: string) => /^[A-Za-z0-9_-]{11}$/.test(value);

const youtubeVideoIdFromUrl = (value: string): string => {
  const normalizedValue = value.startsWith('//')
    ? 'https:' + value
    : value.startsWith('/')
      ? 'https://duckduckgo.com' + value
      : value;
  try {
    const url = new URL(normalizedValue);
    const host = url.hostname.replace(/^www\./i, '').replace(/^m\./i, '').toLowerCase();
    let videoId = '';
    if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? '';
    } else if (host === 'youtube.com') {
      if (url.pathname === '/watch') videoId = url.searchParams.get('v') ?? '';
      else if (['embed', 'shorts', 'live', 'v'].includes(url.pathname.split('/').filter(Boolean)[0] ?? '')) {
        videoId = url.pathname.split('/').filter(Boolean)[1] ?? '';
      }
    }
    if (isYouTubeVideoId(videoId)) return videoId;

    const redirectedUrl = url.searchParams.get('uddg') || url.searchParams.get('url') || url.searchParams.get('q');
    if (!redirectedUrl || redirectedUrl === value) return '';
    const directVideoId = youtubeVideoIdFromUrl(redirectedUrl);
    if (directVideoId) return directVideoId;
    try {
      const decodedRedirect = decodeURIComponent(redirectedUrl);
      return decodedRedirect !== redirectedUrl ? youtubeVideoIdFromUrl(decodedRedirect) : '';
    } catch {
      return '';
    }
  } catch {
    try {
      const decodedValue = decodeURIComponent(normalizedValue);
      return decodedValue !== normalizedValue ? youtubeVideoIdFromUrl(decodedValue) : '';
    } catch {
      return '';
    }
  }
};
const createYouTubeVideoResource = (
  videoId: string,
  title: string,
  description: string,
  author = '',
  thumbnailUrl = '',
) => createResource({
  id: `youtube-${videoId}`,
  provider: 'YouTube',
  kind: 'video',
  title,
  description: description || 'Vídeo relacionado ao tema da aula.',
  url: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
  ...(thumbnailUrl ? { thumbnailUrl } : {}),
  ...(author ? { author } : {}),
});

const parseJsonValueAt = (source: string, position: number): unknown => {
  let start = position;
  while (/\s/.test(source[start] ?? '')) start += 1;
  if (source[start] !== '{' && source[start] !== '[') return null;

  const expectedClosers: string[] = [];
  let insideString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (insideString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') insideString = false;
      continue;
    }
    if (character === '"') {
      insideString = true;
      continue;
    }
    if (character === '{') expectedClosers.push('}');
    else if (character === '[') expectedClosers.push(']');
    else if (character === '}' || character === ']') {
      if (expectedClosers.pop() !== character) return null;
      if (expectedClosers.length === 0) {
        try {
          return JSON.parse(source.slice(start, index + 1)) as unknown;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

const parseYouTubeInitialData = (html: string): unknown => {
  const markerPatterns = [
    /(?:var\s+)?ytInitialData\s*=\s*/g,
    /window\[['"]ytInitialData['"]\]\s*=\s*/g,
  ];
  for (const markerPattern of markerPatterns) {
    let marker: RegExpExecArray | null;
    while ((marker = markerPattern.exec(html))) {
      const payload = parseJsonValueAt(html, markerPattern.lastIndex);
      if (payload) return payload;
    }
  }
  return null;
};

const extractYouTubeVideos = (payload: unknown, query: string): LearningResource[] => {
  const stack: unknown[] = [payload];
  const videos: LearningResource[] = [];
  const seen = new Set<string>();

  while (stack.length > 0 && videos.length < 5) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      for (let index = current.length - 1; index >= 0; index -= 1) stack.push(current[index]);
      continue;
    }
    if (!isRecord(current)) continue;

    const renderer = [
      current.videoRenderer,
      current.gridVideoRenderer,
      current.compactVideoRenderer,
      current.playlistVideoRenderer,
      current.playlistPanelVideoRenderer,
      current.reelItemRenderer,
    ].find((item): item is Record<string, unknown> => isRecord(item));
    if (renderer) {
      const videoId = text(renderer.videoId, 80);
      const title = youtubeText(renderer.title ?? renderer.headline).trim().slice(0, 180);
      if (isYouTubeVideoId(videoId) && title && !seen.has(videoId)) {
        seen.add(videoId);
        const description = youtubeText(renderer.detailedMetadataSnippets)
          || youtubeText(renderer.descriptionSnippet)
          || ('V\u00eddeo relacionado a ' + query + '.');
        const author = youtubeText(renderer.ownerText ?? renderer.shortBylineText ?? renderer.longBylineText).slice(0, 120);
        const thumbnailUrl = youtubeThumbnail(renderer.thumbnail ?? renderer.thumbnailRenderer);
        videos.push(createYouTubeVideoResource(videoId, title, description.slice(0, 420), author, thumbnailUrl));
      }
    }

    const values = Object.values(current);
    for (let index = values.length - 1; index >= 0; index -= 1) stack.push(values[index]);
  }

  return videos;
};

const searchYouTubePage = async (query: string, requestSignal?: AbortSignal): Promise<LearningResource[]> => {
  for (const host of ['www.youtube.com', 'm.youtube.com']) {
    if (requestSignal?.aborted) return [];
    const url = new URL('https://' + host + '/results');
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
      if (!response.ok) continue;
      const html = await response.text();
      if (html.length > 2_000_000) continue;
      const videos = extractYouTubeVideos(parseYouTubeInitialData(html), query);
      if (videos.length > 0) return videos;
    } catch {
      if (requestSignal?.aborted) return [];
    }
  }
  return [];
};

const extractYouTubeVideosFromSearchHtml = (html: string, query: string): LearningResource[] => {
  const videos: LearningResource[] = [];
  const seen = new Set<string>();
  const anchors = html.matchAll(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi);
  for (const anchor of anchors) {
    const href = (anchor[1] ?? anchor[2] ?? anchor[3] ?? '').replace(/&amp;/g, '&');
    const videoId = youtubeVideoIdFromUrl(href);
    if (!videoId || seen.has(videoId)) continue;
    const title = stripHtml((anchor[4] ?? '').replace(/<[^>]*>/g, ''), 180);
    if (!title || /^(?:youtube|watch|sign in|entrar)$/i.test(title)) continue;
    seen.add(videoId);
    videos.push(createYouTubeVideoResource(
      videoId,
      title,
      'V\u00eddeo relacionado a ' + query + '.',
      '',
      'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg',
    ));
    if (videos.length >= 5) break;
  }
  return videos;
};

const searchYouTubeFromDuckDuckGo = async (query: string, requestSignal?: AbortSignal) => {
  const url = new URL('https://html.duckduckgo.com/html/');
  url.searchParams.set('q', 'site:youtube.com/watch ' + query);
  url.searchParams.set('kl', 'br-pt');
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
    return html.length <= 2_000_000 ? extractYouTubeVideosFromSearchHtml(html, query) : [];
  } catch {
    return [];
  }
};

const searchYouTubeFromWeb = async (query: string, requestSignal?: AbortSignal) => {
  try {
    const results = await searchWeb(query + ' site:youtube.com/watch', requestSignal);
    const videos = results.flatMap((result) => {
      const videoId = youtubeVideoIdFromUrl(result.url);
      return videoId
        ? [createYouTubeVideoResource(
            videoId,
            result.title,
            result.description,
            result.author,
            result.thumbnailUrl || 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg',
          )]
        : [];
    });
    return Array.from(new Map(videos.map((video) => [video.url, video])).values()).slice(0, 5);
  } catch {
    return [];
  }
};

const decodeWikiEntities = (value: string) => {
  const namedEntities: Record<string, string> = {
    amp: '&', apos: "'", quot: '"', nbsp: ' ', lt: '<', gt: '>',
    aacute: 'á', Aacute: 'Á', acirc: 'â', Acirc: 'Â', atilde: 'ã', Atilde: 'Ã',
    agrave: 'à', Agrave: 'À', eacute: 'é', Eacute: 'É', ecirc: 'ê', Ecirc: 'Ê',
    iacute: 'í', Iacute: 'Í', oacute: 'ó', Oacute: 'Ó', ocirc: 'ô', Ocirc: 'Ô',
    otilde: 'õ', Otilde: 'Õ', uacute: 'ú', Uacute: 'Ú', ccedil: 'ç', Ccedil: 'Ç',
    ndash: '–', mdash: '—', hellip: '…',
  };
  return value
    .replace(/&([a-zA-Z]+);/g, (entity, name: string) => namedEntities[name] ?? entity)
    .replace(/&#(\d+);/g, (entity, code: string) => {
      const point = Number(code);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    })
    .replace(/&#x([\da-f]+);/gi, (entity, code: string) => {
      const point = Number.parseInt(code, 16);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : entity;
    });
};

const removeWikiElements = (
  html: string,
  shouldRemove: (tagName: string, attributes: string) => boolean,
) => {
  const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const openingTagPattern = /<([a-z][a-z\d:-]*)\b([^>]*)>/gi;
  const output: string[] = [];
  let cursor = 0;
  let openingTag: RegExpExecArray | null;

  while ((openingTag = openingTagPattern.exec(html))) {
    const tagName = openingTag[1].toLocaleLowerCase('en-US');
    const attributes = openingTag[2];
    const rawTag = openingTag[0];
    if (voidElements.has(tagName) || /\/\s*>$/.test(rawTag) || !shouldRemove(tagName, attributes)) continue;

    const matchingTags = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
    matchingTags.lastIndex = openingTagPattern.lastIndex;
    let depth = 1;
    let closingEnd = -1;
    let matchingTag: RegExpExecArray | null;
    while ((matchingTag = matchingTags.exec(html))) {
      if (matchingTag[0].startsWith('</')) {
        depth -= 1;
      } else if (!/\/\s*>$/.test(matchingTag[0])) {
        depth += 1;
      }
      if (depth === 0) {
        closingEnd = matchingTags.lastIndex;
        break;
      }
    }
    if (closingEnd < 0) continue;

    output.push(html.slice(cursor, openingTag.index));
    cursor = closingEnd;
    openingTagPattern.lastIndex = cursor;
  }

  output.push(html.slice(cursor));
  return output.join('');
};

const cleanWikipediaArticleHtml = (html: string) => removeWikiElements(
  html.replace(/<!--[^]*?-->/g, ''),
  (tagName, attributes) => {
    if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') return true;
    const classes = attributes.match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const classNames = classes?.[1] ?? classes?.[2] ?? classes?.[3] ?? '';
    return /(?:^|\s)(?:navbox|vertical-navbox|infobox|sidebar|metadata|ambox|ombox|sistersitebox|authority-control|mw-editsection|mw-references-wrap|reflist|reference|toc|portal|hatnote|shortdescription|noprint|nomobile|mw-empty-elt)(?:\s|$)/i.test(classNames)
      || /\bid\s*=\s*["'](?:toc|catlinks|mw-navigation|mw-panel)["']/i.test(attributes);
  },
);

const canonicalWikipediaFileTitle = (title: string) => {
  const filename = title.replace(/^(?:File|Ficheiro|Arquivo):/i, '').trim().replace(/_/g, ' ');
  return filename ? `File:${filename}` : '';
};

const wikipediaImageMarker = (title: string) => {
  const fileTitle = canonicalWikipediaFileTitle(title);
  return fileTitle ? `[[WIKI_IMAGE:${encodeURIComponent(fileTitle)}]]` : '';
};

const wikipediaFileTitleFromHref = (href: string) => {
  const safeHref = href.replace(/&amp;/g, '&');
  let decodedHref = safeHref;
  try {
    decodedHref = decodeURIComponent(safeHref);
  } catch {
    // Keep the original href if a page contains a malformed escape sequence.
  }
  const match = decodedHref.match(/(?:^|\/)(?:File|Ficheiro|Arquivo):([^/?#]+)/i);
  return match ? canonicalWikipediaFileTitle(match[0].replace(/^\//, '')) : '';
};

const replaceWikipediaImagesWithMarkers = (html: string) => {
  const markerFromAnchor = (anchor: string) => {
    const href = anchor.match(/\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    return href ? wikipediaImageMarker(wikipediaFileTitleFromHref(href[1] ?? href[2] ?? href[3] ?? '')) : '';
  };
  return html
    .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, (figure) => {
      const imageAnchor = figure.match(/<a\b[^>]*>[\s\S]*?<img\b[^>]*>[\s\S]*?<\/a>/i)?.[0];
      const marker = imageAnchor ? markerFromAnchor(imageAnchor) : '';
      const caption = figure.match(/<figcaption\b[^>]*>([^]*?)<\/figcaption>/i)?.[1] ?? '';
      return marker ? `\n\n${marker}${caption ? `\n\n${caption}` : ''}\n\n` : figure;
    })
    .replace(/<a\b[^>]*>[\s\S]*?<img\b[^>]*>[\s\S]*?<\/a>/gi, (anchor) => {
      const marker = markerFromAnchor(anchor);
      return marker ? `\n\n${marker}\n\n` : anchor;
    });
};

const wikipediaImageTitlesInExcerpt = (excerpt: string) => Array.from(excerpt.matchAll(/\[\[WIKI_IMAGE:([^\]]+)\]\]/g))
  .flatMap((match) => {
    try {
      const title = decodeURIComponent(match[1]);
      return title ? [canonicalWikipediaFileTitle(title)] : [];
    } catch {
      return [];
    }
  });

const insertRepresentativeWikipediaImage = (excerpt: string, pageImage: string) => {
  if (!pageImage || isWikipediaInterfaceImage(pageImage)) return excerpt;
  const marker = wikipediaImageMarker(pageImage);
  if (!marker || excerpt.includes(marker)) return excerpt;
  const firstParagraphEnd = excerpt.indexOf('\n\n');
  if (firstParagraphEnd < 0) return excerpt ? `${excerpt}\n\n${marker}` : marker;
  return `${excerpt.slice(0, firstParagraphEnd)}\n\n${marker}\n\n${excerpt.slice(firstParagraphEnd + 2)}`;
};

const wikipediaTableCellToMarkdown = (html: string) => replaceWikipediaImagesWithMarkers(cleanWikipediaArticleHtml(html))
  .replace(/<(?:b|strong)\b[^>]*>([^]*?)<\/(?:b|strong)>/gi, '**$1**')
  .replace(/<(?:i|em)\b[^>]*>([^]*?)<\/(?:i|em)>/gi, '*$1*')
  .replace(/<sup\b[^>]*>([^]*?)<\/sup>/gi, '^$1')
  .replace(/<sub\b[^>]*>([^]*?)<\/sub>/gi, '$1')
  .replace(/<a\b[^>]*>([^]*?)<\/a>/gi, '$1')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<li\b[^>]*>/gi, '; ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .replace(/\|/g, '\\|')
  .trim();

const wikipediaTableToMarkdown = (tableHtml: string) => {
  const rows = Array.from(tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi))
    .map((rowMatch) => ({
      cells: Array.from(rowMatch[1].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi))
        .map((cellMatch) => ({
          header: cellMatch[1].toLowerCase() === 'th',
          value: wikipediaTableCellToMarkdown(cellMatch[2]),
        })),
    }))
    .filter((row) => row.cells.length > 0);

  if (rows.length === 0) return tableHtml;

  const columnCount = Math.max(...rows.map((row) => row.cells.length));
  const headerRowIndex = rows.findIndex((row) => row.cells.length === columnCount && row.cells.some((cell) => cell.header));
  const resolvedHeaderIndex = headerRowIndex >= 0 ? headerRowIndex : 0;
  const headerCells = rows[resolvedHeaderIndex].cells;
  const captionMatch = tableHtml.match(/<caption\b[^>]*>([^]*?)<\/caption>/i);
  const caption = captionMatch ? wikipediaTableCellToMarkdown(captionMatch[1]) : '';
  const formatRow = (cells: typeof headerCells, isHeader = false) => {
    const values = Array.from({ length: columnCount }, (_, index) => {
      const value = cells[index]?.value ?? '';
      return value || (isHeader ? `Coluna ${index + 1}` : '');
    });
    return `| ${values.join(' | ')} |`;
  };
  const markdownRows = [
    formatRow(headerCells, true),
    `| ${Array.from({ length: columnCount }, () => '---').join(' | ')} |`,
    ...rows.filter((_, index) => index !== resolvedHeaderIndex).map((row) => formatRow(row.cells)),
  ];

  return `\n\n${caption ? `**${caption}**\n\n` : ''}${markdownRows.join('\n')}\n\n`;
};

const wikiHtmlToMarkdown = (value: unknown, maxLength = MAX_WIKIPEDIA_EXCERPT_CHARS) => {
  if (typeof value !== 'string') return '';
  const articleHtml = replaceWikipediaImagesWithMarkers(cleanWikipediaArticleHtml(value.slice(0, MAX_WIKIPEDIA_PARSE_RESPONSE_CHARS)))
    .replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, wikipediaTableToMarkdown);
  return decodeWikiEntities(articleHtml
    .replace(/<h([2-6])\b[^>]*>([^]*?)<\/h\1>/gi, (_, level: string, content: string) => `\n\n${'#'.repeat(Math.min(Number(level), 5))} ${content}\n\n`)
    .replace(/<(?:b|strong)\b[^>]*>([^]*?)<\/(?:b|strong)>/gi, '**$1**')
    .replace(/<(?:i|em)\b[^>]*>([^]*?)<\/(?:i|em)>/gi, '*$1*')
    .replace(/<sup\b[^>]*>([^]*?)<\/sup>/gi, '^$1')
    .replace(/<sub\b[^>]*>([^]*?)<\/sub>/gi, '$1')
    .replace(/<a\b[^>]*>([^]*?)<\/a>/gi, '$1')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/(?:ul|ol)>/gi, '\n')
    .replace(/<tr\b[^>]*>/gi, '\n')
    .replace(/<\/(?:tr|table)>/gi, '\n')
    .replace(/<\/(?:th|td)>/gi, ' | ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(?:p|div|section|article|blockquote|dl|dd|dt)\b[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
};

const wikipediaTextKey = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const wikipediaTitleKey = (value: string) => wikipediaTextKey(value.replace(/^(?:File|Ficheiro|Arquivo):/i, '').replace(/_/g, ' '));

const WIKIPEDIA_RELEVANCE_STOPWORDS = new Set([
  'a', 'ao', 'aos', 'as', 'com', 'como', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'entre', 'essa', 'esse', 'esta', 'este',
  'mais', 'na', 'nas', 'no', 'nos', 'o', 'os', 'ou', 'para', 'por', 'que', 'se', 'sem', 'sobre', 'um', 'uma', 'umas', 'uns',
  'the', 'and', 'for', 'from', 'into', 'its', 'of', 'on', 'or', 'the', 'to', 'with',
]);

const wikipediaTerms = (value: string) => Array.from(new Set(wikipediaTextKey(value)
  .split(' ')
  .filter((term) => term.length >= 3 && !WIKIPEDIA_RELEVANCE_STOPWORDS.has(term))));

const matchingWikipediaTerms = (value: string, terms: string[]) => {
  const key = ` ${wikipediaTextKey(value)} `;
  return terms.reduce((score, term) => score + (key.includes(` ${term} `) ? 1 : 0), 0);
};

const wikipediaTopicTerms = (query: string) => {
  const topic = query.split(':').slice(1).join(':').trim() || query;
  return wikipediaTerms(topic);
};

const WIKIPEDIA_NON_ARTICLE_SECTIONS = [
  'bibliografia', 'fontes', 'leitura complementar', 'notas', 'referencias', 'ver tambem', 'ligacoes externas',
  'further reading', 'bibliography', 'references', 'notes', 'see also', 'external links', 'sources',
];

const curateWikipediaExcerpt = (html: string, query: string, articleTitle: string, pageImage: string) => {
  const cleanedHtml = cleanWikipediaArticleHtml(html);
  const headings = Array.from(cleanedHtml.matchAll(/<h2\b[^>]*>([^]*?)<\/h2>/gi));
  if (headings.length === 0) {
    return insertRepresentativeWikipediaImage(wikiHtmlToMarkdown(cleanedHtml, MAX_WIKIPEDIA_EXCERPT_CHARS), pageImage);
  }

  const firstHeadingIndex = headings[0].index ?? cleanedHtml.length;
  const lead = wikiHtmlToMarkdown(cleanedHtml.slice(0, firstHeadingIndex), 3_500);
  const topicTerms = wikipediaTopicTerms(query);
  const articleTerms = wikipediaTerms(articleTitle);
  const sections = headings.flatMap((heading, index) => {
    const start = heading.index ?? 0;
    const end = headings[index + 1]?.index ?? cleanedHtml.length;
    const sectionTitle = stripHtml(heading[1], 180);
    const sectionKey = wikipediaTextKey(sectionTitle);
    if (!sectionTitle || WIKIPEDIA_NON_ARTICLE_SECTIONS.some((name) => sectionKey.includes(wikipediaTextKey(name)))) return [];
    const markdown = wikiHtmlToMarkdown(cleanedHtml.slice(start, end), 4_500);
    if (!markdown) return [];
    const headingTopicMatches = matchingWikipediaTerms(sectionTitle, topicTerms);
    const bodyTopicMatches = matchingWikipediaTerms(markdown.slice(0, 2_000), topicTerms);
    const headingArticleMatches = matchingWikipediaTerms(sectionTitle, articleTerms);
    const bodyArticleMatches = matchingWikipediaTerms(markdown.slice(0, 2_000), articleTerms);
    const imageCount = wikipediaImageTitlesInExcerpt(markdown).length;
    return [{
      index,
      markdown,
      score: headingTopicMatches * 5 + bodyTopicMatches * 2 + headingArticleMatches + bodyArticleMatches * 0.25 + imageCount * 2,
    }];
  });

  const matchedSections = sections.filter((section) => section.score > 0);
  const selectedSections = (matchedSections.length > 0
    ? matchedSections.slice().sort((a, b) => b.score - a.score).slice(0, 6)
    : sections.slice(0, 6))
    .sort((a, b) => a.index - b.index);
  const chunks = lead ? [lead] : [];
  let totalChars = lead.length;
  for (const section of selectedSections) {
    const remaining = MAX_WIKIPEDIA_EXCERPT_CHARS - totalChars - 2;
    if (remaining <= 0) break;
    const excerpt = section.markdown.slice(0, Math.min(2_800, remaining)).trim();
    if (!excerpt) continue;
    chunks.push(excerpt);
    totalChars += excerpt.length + 2;
  }
  return insertRepresentativeWikipediaImage(chunks.join('\n\n').slice(0, MAX_WIKIPEDIA_EXCERPT_CHARS), pageImage);
};

const isWikipediaInterfaceImage = (title: string) =>
  /(?:commons[ _-]?logo|(?:wikimedia|mediawiki|wikipedia)[ _-](?:logo|icon|wordmark|button|search|menu)|(?:^|[\s_.-])(?:menu|toolbar|search|edit|upload|pencil|cursor|button|navigation|navbar|favicon)(?:[\s_.-]|$))/i.test(title);

const scoreWikipediaImageTitle = (title: string, query: string, articleTitle: string, pageImage: string) => {
  const imageName = title.replace(/^(?:File|Ficheiro):/i, '').replace(/[_-]/g, ' ');
  const topicMatches = matchingWikipediaTerms(imageName, wikipediaTopicTerms(query));
  const articleMatches = matchingWikipediaTerms(imageName, wikipediaTerms(articleTitle));
  const representativeImage = pageImage && wikipediaTitleKey(title) === wikipediaTitleKey(pageImage) ? 4 : 0;
  return topicMatches * 4 + articleMatches + representativeImage;
};

const scoreWikipediaImage = (image: LearningWikipediaImage, query: string, articleTitle: string, pageImage: string) =>
  scoreWikipediaImageTitle(`${image.fileTitle} ${image.caption}`, query, articleTitle, pageImage);

const mediaWikiUserAgentHeaders = { 'User-Agent': WIKIPEDIA_USER_AGENT };

const imageMetadataValue = (value: unknown, maxLength: number) => {
  const metadata = isRecord(value) && 'value' in value ? value.value : value;
  return stripHtml(typeof metadata === 'string' ? decodeWikiEntities(metadata) : metadata, maxLength);
};

const fetchWikipediaImageBatch = async (
  apiRoot: string,
  titles: string[],
  requestSignal?: AbortSignal,
): Promise<Map<string, LearningWikipediaImage>> => {
  if (titles.length === 0) return new Map<string, LearningWikipediaImage>();
  const url = new URL('/w/api.php', apiRoot);
  url.searchParams.set('action', 'query');
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('titles', titles.join('|'));
  url.searchParams.set('iiprop', 'url|size|extmetadata');
  url.searchParams.set('iiurlwidth', '960');
  url.searchParams.set('iiextmetadatalanguage', 'pt');
  url.searchParams.set('iiextmetadatafilter', 'ImageDescription|Artist|Credit|LicenseShortName|LicenseUrl');
  url.searchParams.set('format', 'json');
  url.searchParams.set('utf8', '1');

  try {
    const payload = await requestJson(
      url,
      requestSignal,
      mediaWikiUserAgentHeaders,
      MAX_WIKIPEDIA_IMAGE_RESPONSE_CHARS,
    );
    if (!isRecord(payload) || !isRecord(payload.query) || !isRecord(payload.query.pages)) {
      return new Map<string, LearningWikipediaImage>();
    }
    return new Map(Object.values(payload.query.pages).flatMap((page) => {
      if (!isRecord(page) || !Array.isArray(page.imageinfo) || !isRecord(page.imageinfo[0])) return [];
      const image = page.imageinfo[0];
      const fileTitle = text(page.title, 180);
      const imageUrl = text(image.url, 700);
      const thumbnailUrl = text(image.thumburl, 700) || imageUrl;
      const width = Number(image.width);
      const height = Number(image.height);
      if (!fileTitle || !/^https?:\/\//i.test(imageUrl) || !/^https?:\/\//i.test(thumbnailUrl)) return [];
      if ((Number.isFinite(width) && width > 0 && width < 180) || (Number.isFinite(height) && height > 0 && height < 120)) return [];

      const metadata = isRecord(image.extmetadata) ? image.extmetadata : {};
      const filename = fileTitle.replace(/^(?:File|Ficheiro|Arquivo):/i, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ');
      const caption = imageMetadataValue(metadata.ImageDescription, 320) || filename;
      const artist = imageMetadataValue(metadata.Artist, 180) || imageMetadataValue(metadata.Credit, 180);
      const license = imageMetadataValue(metadata.LicenseShortName, 80);
      const licenseUrl = text(isRecord(metadata.LicenseUrl) ? metadata.LicenseUrl.value : '', 700);
      const filePageUrl = apiRoot + '/wiki/' + encodeURIComponent(fileTitle.replace(/\s+/g, '_'));
      const result: LearningWikipediaImage = {
        fileTitle,
        url: imageUrl,
        thumbnailUrl,
        filePageUrl,
        caption,
        ...(artist ? { artist } : {}),
        ...(license ? { license } : {}),
        ...(licenseUrl && /^https?:\/\//i.test(licenseUrl) ? { licenseUrl } : {}),
      };
      return [[wikipediaTitleKey(fileTitle), result] as const];
    }));
  } catch {
    return new Map<string, LearningWikipediaImage>();
  }
};

const fetchWikipediaImages = async (titles: string[], requestSignal?: AbortSignal) => {
  const uniqueByKey = new Map<string, string>();
  for (const title of titles) {
    const canonicalTitle = canonicalWikipediaFileTitle(title);
    const key = wikipediaTitleKey(canonicalTitle);
    if (key && !uniqueByKey.has(key)) uniqueByKey.set(key, canonicalTitle);
  }
  const uniqueTitles = Array.from(uniqueByKey.values()).slice(0, MAX_WIKIPEDIA_IMAGE_CANDIDATES);
  const results = new Map<string, LearningWikipediaImage>();

  for (let offset = 0; offset < uniqueTitles.length; offset += MAX_WIKIPEDIA_IMAGE_BATCH_SIZE) {
    if (requestSignal?.aborted) break;
    const batch = uniqueTitles.slice(offset, offset + MAX_WIKIPEDIA_IMAGE_BATCH_SIZE);
    const localTitles = batch.map((title) => 'Ficheiro:' + title.replace(/^(?:File|Ficheiro|Arquivo):/i, ''));
    const localDetails = await fetchWikipediaImageBatch('https://pt.wikipedia.org', localTitles, requestSignal);
    localDetails.forEach((image, key) => results.set(key, image));

    const missingTitles = batch.filter((title) => !results.has(wikipediaTitleKey(title)));
    if (missingTitles.length > 0 && !requestSignal?.aborted) {
      const commonsTitles = missingTitles.map((title) => canonicalWikipediaFileTitle(title));
      const commonsDetails = await fetchWikipediaImageBatch('https://commons.wikimedia.org', commonsTitles, requestSignal);
      commonsDetails.forEach((image, key) => results.set(key, image));
    }
  }

  return results;
};

const fetchWikipediaArticleHtml = async (title: string, requestSignal?: AbortSignal) => {
  const url = new URL('https://pt.wikipedia.org/w/api.php');
  url.searchParams.set('action', 'parse');
  url.searchParams.set('page', title);
  url.searchParams.set('prop', 'text');
  url.searchParams.set('disabletoc', '1');
  url.searchParams.set('disableeditsection', '1');
  url.searchParams.set('disablelimitreport', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  url.searchParams.set('utf8', '1');

  try {
    const payload = await requestJson(url, requestSignal, mediaWikiUserAgentHeaders, MAX_WIKIPEDIA_PARSE_RESPONSE_CHARS);
    if (!isRecord(payload) || !isRecord(payload.parse)) return '';
    const parsedText = payload.parse.text;
    if (typeof parsedText === 'string') return parsedText;
    if (isRecord(parsedText) && typeof parsedText['*'] === 'string') return parsedText['*'];
    return '';
  } catch {
    return '';
  }
};

type WikipediaSearchResult = {
  resources: LearningResource[];
  articles: LearningWikipediaArticle[];
};

const searchWikipedia = async (query: string, requestSignal?: AbortSignal): Promise<WikipediaSearchResult> => {
  const url = new URL('https://pt.wikipedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'search');
  url.searchParams.set('srsearch', query.replace(/:\s*/g, ' '));
  url.searchParams.set('srlimit', '5');
  url.searchParams.set('format', 'json');
  url.searchParams.set('utf8', '1');
  url.searchParams.set('origin', '*');

  const payload = await requestJson(url, requestSignal, mediaWikiUserAgentHeaders);
  if (!isRecord(payload) || !isRecord(payload.query) || !Array.isArray(payload.query.search)) return { resources: [], articles: [] };

  const candidates = payload.query.search.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const title = text(item.title, 180);
    if (!title) return [];
    const encodedTitle = encodeURIComponent(title.replace(/\s+/g, '_'));
    const description = stripHtml(item.snippet, 420) || 'Artigo de referência para aprofundar o tema.';
    return [{
      title,
      description,
      url: `https://pt.wikipedia.org/wiki/${encodedTitle}`,
      rank: index,
      resource: createResource({
        id: `wikipedia-${index + 1}-${encodedTitle.slice(0, 40)}`,
        provider: 'Wikipedia',
        kind: 'reference',
        title,
        description,
        url: `https://pt.wikipedia.org/wiki/${encodedTitle}`,
      }),
    }];
  });
  if (candidates.length === 0) return { resources: [], articles: [] };
  const primaryCandidate = candidates[0];
  const fallbackArticles = [{
    title: primaryCandidate.title,
    url: primaryCandidate.resource.url,
    excerpt: primaryCandidate.description,
    images: [] as LearningWikipediaImage[],
  }];

  const pageUrl = new URL('https://pt.wikipedia.org/w/api.php');
  pageUrl.searchParams.set('action', 'query');
  pageUrl.searchParams.set('prop', 'extracts|pageimages');
  pageUrl.searchParams.set('titles', primaryCandidate.title);
  pageUrl.searchParams.set('exchars', String(MAX_WIKIPEDIA_EXCERPT_CHARS + 2_000));
  pageUrl.searchParams.set('piprop', 'thumbnail|name');
  pageUrl.searchParams.set('pithumbsize', '800');
  pageUrl.searchParams.set('format', 'json');
  pageUrl.searchParams.set('utf8', '1');
  pageUrl.searchParams.set('origin', '*');

  let pagePayload: unknown;
  try {
    pagePayload = await requestJson(pageUrl, requestSignal, mediaWikiUserAgentHeaders);
  } catch {
    return { resources: candidates.map((candidate) => candidate.resource), articles: fallbackArticles };
  }
  if (!isRecord(pagePayload) || !isRecord(pagePayload.query) || !isRecord(pagePayload.query.pages)) {
    return { resources: candidates.map((candidate) => candidate.resource), articles: fallbackArticles };
  }

  const pagesByTitle = new Map(Object.values(pagePayload.query.pages).flatMap((page) => {
    if (!isRecord(page) || typeof page.title !== 'string') return [];
    return [[wikipediaTitleKey(page.title), page] as const];
  }));
  const page = pagesByTitle.get(wikipediaTitleKey(primaryCandidate.title));
  if (!isRecord(page)) return { resources: candidates.map((candidate) => candidate.resource), articles: fallbackArticles };

  const pageImage = text(page.pageimage, 180);
  const pageExcerpt = wikiHtmlToMarkdown(page.extract, MAX_WIKIPEDIA_EXCERPT_CHARS);
  const parsedArticleHtml = await fetchWikipediaArticleHtml(primaryCandidate.title, requestSignal);
  const curatedExcerpt = parsedArticleHtml
    ? curateWikipediaExcerpt(parsedArticleHtml, query, primaryCandidate.title, pageImage)
    : insertRepresentativeWikipediaImage(pageExcerpt, pageImage);
  const excerpt = curatedExcerpt.length >= 100 ? curatedExcerpt : primaryCandidate.description;
  const inlineImageTitles = wikipediaImageTitlesInExcerpt(excerpt);
  const inlineImageKeys = new Set(inlineImageTitles.map(wikipediaTitleKey));
  const imageTitleByKey = new Map<string, string>();
  for (const title of inlineImageTitles) {
    const imageKey = wikipediaTitleKey(title);
    if (!imageKey || isWikipediaInterfaceImage(title) || imageTitleByKey.has(imageKey)) continue;
    imageTitleByKey.set(imageKey, canonicalWikipediaFileTitle(title));
  }
  const prioritizedImageTitles = Array.from(imageTitleByKey.values())
    .map((title, index) => ({
      title,
      index,
      score: scoreWikipediaImageTitle(title, query, primaryCandidate.title, pageImage)
        + (inlineImageKeys.has(wikipediaTitleKey(title)) ? 100 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, MAX_WIKIPEDIA_IMAGE_CANDIDATES)
    .map(({ title }) => title);
  const thumbnail = isRecord(page.thumbnail) ? text(page.thumbnail.source, 700) : '';
  const imageDetails = await fetchWikipediaImages(prioritizedImageTitles, requestSignal);
  const articleImages = Array.from(new Map(prioritizedImageTitles.flatMap((title) => {
    const detail = imageDetails.get(wikipediaTitleKey(title));
    return detail ? [[wikipediaTitleKey(detail.fileTitle), detail] as const] : [];
  })).values());
  const rankedImages = articleImages
    .map((image, index) => ({
      image,
      index,
      score: scoreWikipediaImage(image, query, primaryCandidate.title, pageImage)
        + (inlineImageKeys.has(wikipediaTitleKey(image.fileTitle)) ? 100 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const images = rankedImages
    .slice(0, MAX_WIKIPEDIA_IMAGES)
    .map(({ image }) => image);
  if (pageImage && !isWikipediaInterfaceImage(pageImage) && thumbnail && /^https?:\/\//i.test(thumbnail)
    && !images.some((image) => wikipediaTitleKey(image.fileTitle) === wikipediaTitleKey(pageImage))) {
    images.unshift({
      fileTitle: pageImage,
      url: thumbnail,
      thumbnailUrl: thumbnail,
      filePageUrl: primaryCandidate.resource.url,
      caption: pageImage.replace(/^(?:File|Ficheiro):/i, '').replace(/_/g, ' '),
    });
    images.splice(MAX_WIKIPEDIA_IMAGES);
  }
  if (images.length === 0 && !isWikipediaInterfaceImage(pageImage) && thumbnail && /^https?:\/\//i.test(thumbnail)) {
    const fallbackTitle = pageImage || `Imagem de ${primaryCandidate.title}`;
    images.push({
      fileTitle: fallbackTitle,
      url: thumbnail,
      thumbnailUrl: thumbnail,
      filePageUrl: primaryCandidate.resource.url,
      caption: fallbackTitle.replace(/^(?:File|Ficheiro):/i, '').replace(/_/g, ' '),
    });
  }
  const inlineImages = images.filter((image) => inlineImageKeys.has(wikipediaTitleKey(image.fileTitle)));
  const articles = [{
    title: primaryCandidate.title,
    url: primaryCandidate.resource.url,
    excerpt,
    images: inlineImages,
  }];

  const imageByArticleTitle = new Map(articles.flatMap((article) => {
    const thumbnailUrl = article.images[0]?.thumbnailUrl;
    return thumbnailUrl ? [[wikipediaTitleKey(article.title), thumbnailUrl] as const] : [];
  }));
  const resources = candidates.map((candidate) => {
    const thumbnailUrl = imageByArticleTitle.get(wikipediaTitleKey(candidate.title));
    return thumbnailUrl ? { ...candidate.resource, thumbnailUrl } : candidate.resource;
  });
  return { resources, articles };
};

const searchYouTube = async (query: string, requestSignal?: AbortSignal): Promise<LearningResource[]> => {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) return searchYouTubeWithoutApiKey(query, requestSignal);

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

  try {
    const payload = await requestJson(url, requestSignal);
    if (isRecord(payload) && Array.isArray(payload.items)) {
      const videos = payload.items.flatMap((item) => {
        if (!isRecord(item) || !isRecord(item.id) || !isRecord(item.snippet)) return [];
        const videoId = text(item.id.videoId, 80);
        const title = stripHtml(item.snippet.title, 180);
        if (!isYouTubeVideoId(videoId) || !title) return [];
        const thumbnails = isRecord(item.snippet.thumbnails) ? item.snippet.thumbnails : {};
        const medium = isRecord(thumbnails.medium) ? text(thumbnails.medium.url, 700) : '';
        return [createYouTubeVideoResource(
          videoId,
          title,
          stripHtml(item.snippet.description, 420) || ('V\u00eddeo relacionado ao tema da aula.'),
          stripHtml(item.snippet.channelTitle, 120),
          medium,
        )];
      });
      if (videos.length > 0) return videos;
    }
  } catch (error) {
    if (requestSignal?.aborted) throw error;
  }

  return searchYouTubeWithoutApiKey(query, requestSignal);
};

const searchYouTubeWithoutApiKey = async (query: string, requestSignal?: AbortSignal): Promise<LearningResource[]> => {
  const results = await Promise.allSettled([
    searchYouTubePage(query, requestSignal),
    searchYouTubeFromDuckDuckGo(query, requestSignal),
    searchYouTubeFromWeb(query, requestSignal),
  ]);
  const videos = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const uniqueVideos = Array.from(new Map(videos.map((video) => [video.url, video])).values()).slice(0, 5);
  if (uniqueVideos.length > 0) return uniqueVideos;

  return [createResource({
    id: 'youtube-search',
    provider: 'YouTube',
    kind: 'search',
    title: 'Pesquisar vídeos sobre ' + query,
    description: 'Abra uma busca pronta no YouTube para encontrar explicações, aulas e demonstrações.',
    url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query),
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

  const youtubeResources = results[0].status === 'fulfilled' ? results[0].value : [];
  const wikipediaResearch = results[1].status === 'fulfilled'
    ? results[1].value
    : { resources: [], articles: [] };
  const webResources = results[2].status === 'fulfilled' ? results[2].value : [];
  const resources = [...youtubeResources, ...wikipediaResearch.resources, ...webResources];
  const uniqueResources = Array.from(new Map(resources.map((resource) => [resource.url, resource])).values()).slice(0, MAX_RESOURCES);

  const research = {
    query,
    searchedAt: new Date().toISOString(),
    providers: Array.from(new Set(uniqueResources.map((resource) => resource.provider))),
    resources: uniqueResources,
    ...(wikipediaResearch.articles.length > 0 ? { wikipediaArticles: wikipediaResearch.articles } : {}),
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
