import type { GeminiTeacherModel } from './models';

type GoogleModelResource = {
  name?: unknown;
  baseModelId?: unknown;
  displayName?: unknown;
  description?: unknown;
  supportedGenerationMethods?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isGeminiModelId = (value: string): value is GeminiTeacherModel['id'] =>
  /^gemini\/[A-Za-z0-9._-]+$/.test(value);

export const normalizeGeminiModels = (value: unknown): GeminiTeacherModel[] => {
  if (!isRecord(value) || !Array.isArray(value.models)) return [];

  const byId = new Map<string, GeminiTeacherModel>();
  for (const resource of value.models) {
    if (!isRecord(resource)) continue;
    const model = resource as GoogleModelResource;
    if (!Array.isArray(model.supportedGenerationMethods)
      || !model.supportedGenerationMethods.includes('generateContent')) continue;

    const baseModelId = typeof model.baseModelId === 'string'
      ? model.baseModelId
      : typeof model.name === 'string'
        ? model.name.replace(/^models\//, '')
        : '';
    if (!/^[A-Za-z0-9._-]+$/.test(baseModelId)) continue;

    const id = `gemini/${baseModelId}`;
    if (!isGeminiModelId(id)) continue;
    if (byId.has(id)) continue;
    byId.set(id, {
      id,
      provider: 'gemini',
      name: typeof model.displayName === 'string' && model.displayName.trim()
        ? model.displayName.trim()
        : baseModelId,
      description: typeof model.description === 'string' && model.description.trim()
        ? model.description.trim()
        : 'Modelo disponível pela API Gemini.',
      badge: 'Gemini API',
      apiAvailable: true,
    });
  }

  return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
};

const MODEL_LIST_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL_LIST_TIMEOUT_MS = 8_000;
const MODEL_LIST_CACHE_MS = 5 * 60_000;
const KNOWN_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
] as const;
let cachedModels: { expiresAt: number; models: GeminiTeacherModel[] } | null = null;
let modelsRequest: Promise<GeminiTeacherModel[]> | null = null;

export const listGeminiModels = async (apiKey: string): Promise<GeminiTeacherModel[]> => {
  if (cachedModels && cachedModels.expiresAt > Date.now()) return cachedModels.models;
  if (modelsRequest) return modelsRequest;

  modelsRequest = (async () => {
    const models: unknown[] = [];
    let pageToken = '';
    let pages = 0;
    do {
      const url = new URL(MODEL_LIST_URL);
      url.searchParams.set('pageSize', '1000');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const response = await fetch(url, {
        headers: { 'x-goog-api-key': apiKey },
        signal: AbortSignal.timeout(MODEL_LIST_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`Gemini model discovery failed (${response.status}).`);
      }

      const payload: unknown = await response.json();
      if (!isRecord(payload) || !Array.isArray(payload.models)) {
        throw new Error('Gemini returned an invalid model list.');
      }
      models.push(...payload.models);
      pageToken = typeof payload.nextPageToken === 'string' ? payload.nextPageToken : '';
      pages += 1;
    } while (pageToken && pages < 10);

    if (pageToken) throw new Error('Gemini model list exceeded the supported number of pages.');

    const normalized = normalizeGeminiModels({ models });
    cachedModels = { expiresAt: Date.now() + MODEL_LIST_CACHE_MS, models: normalized };
    return normalized;
  })();

  try {
    return await modelsRequest;
  } finally {
    modelsRequest = null;
  }
};

export const getKnownGeminiModels = (): GeminiTeacherModel[] => KNOWN_GEMINI_MODELS.map((id) => ({
  id: `gemini/${id}`,
  provider: 'gemini',
  name: id,
  description: 'Modelo Gemini compatível com generateContent.',
  badge: 'Gemini API',
  apiAvailable: true,
}));
