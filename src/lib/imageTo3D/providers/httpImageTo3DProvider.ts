'use client';

import {
  DEFAULT_PROVIDER_TIMEOUT_MS,
  type ImageTo3DProvider,
  type ImageTo3DProviderConfig,
  type ImageTo3DRequest,
  type ImageTo3DResultMetadata,
} from '../types';

const buildFormData = (request: ImageTo3DRequest) => {
  const form = new FormData();
  request.images.forEach((image) => {
    form.append(`image_${image.slot}`, image.file, image.name);
  });
  form.append(
    'settings',
    JSON.stringify({
      modelType: request.settings.modelType,
      style: request.settings.style,
      quality: request.settings.quality,
      autoImport: request.settings.autoImport,
    }),
  );
  form.append('providerId', request.providerId);
  return form;
};

const parseJsonSafely = async (response: Response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
};

export const generateWithHttpProvider: ImageTo3DProvider['generate'] = async (
  request,
  config,
  hooks,
) => {
  const endpoint = config.endpoint;
  if (!endpoint) {
    throw new Error('Provider HTTP nao configurado: informe a URL do endpoint.');
  }

  const timeoutMs = config.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  const combinedSignal = hooks.signal
    ? mergeSignals(hooks.signal, timeoutController.signal)
    : timeoutController.signal;

  const onAbort = () => timeoutController.abort();
  hooks.signal?.addEventListener('abort', onAbort);

  hooks.onProgress?.({ status: 'uploading', percent: 8, message: 'Enviando imagens ao provedor...' });

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      body: buildFormData(request),
      signal: combinedSignal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    hooks.signal?.removeEventListener('abort', onAbort);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw hooks.signal?.aborted ? new DOMException('Aborted', 'AbortError') : new Error('Tempo limite excedido ao gerar modelo.');
    }
    throw new Error('Falha de conexao com o provedor de geracao 3D.');
  } finally {
    clearTimeout(timeoutId);
  }

  hooks.signal?.removeEventListener('abort', onAbort);

  if (!response.ok) {
    const payload = await parseJsonSafely(response);
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : `Provedor retornou status ${response.status}.`;
    throw new Error(message);
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    const glb = await response.arrayBuffer();
    hooks.onProgress?.({ status: 'importing', percent: 96, message: 'Recebendo modelo GLB...' });

    const metadata: ImageTo3DResultMetadata = {
      origin: 'Image to 3D',
      providerId: config.id,
      modelType: request.settings.modelType,
      style: request.settings.style,
      quality: request.settings.quality,
      createdAt: Date.now(),
      stats: {
        polycount: 0,
        meshCount: 0,
        textureCount: 0,
        materialCount: 0,
        hasTextures: false,
      },
      imageSlots: request.images.map((i) => i.slot),
      providerName: config.label,
      providerNotes: 'Estatisticas preenchidas apos importacao no editor.',
    };
    return { glb, metadata, displayName: 'Generated Model' };
  }

  const payload = await parseJsonSafely(response);
  const glbBase64 = typeof payload?.glb === 'string' ? payload.glb : null;
  if (!glbBase64) {
    throw new Error('Resposta do provedor nao contem o modelo GLB.');
  }

  const glb = base64ToArrayBuffer(glbBase64);
  const remoteStats = payload?.stats ?? null;
  const metadata: ImageTo3DResultMetadata = {
    origin: 'Image to 3D',
    providerId: config.id,
    modelType: request.settings.modelType,
    style: request.settings.style,
    quality: request.settings.quality,
    createdAt: Date.now(),
    stats: {
      polycount: Number(remoteStats?.polycount ?? 0),
      meshCount: Number(remoteStats?.meshCount ?? 0),
      textureCount: Number(remoteStats?.textureCount ?? 0),
      materialCount: Number(remoteStats?.materialCount ?? 0),
      hasTextures: Boolean(remoteStats?.hasTextures),
    },
    imageSlots: request.images.map((i) => i.slot),
    providerName: config.label,
    providerNotes: typeof payload?.notes === 'string' ? payload.notes : undefined,
  };

  return {
    glb,
    metadata,
    displayName: typeof payload?.displayName === 'string' ? payload.displayName : 'Generated Model',
  };
};

const mergeSignals = (a: AbortSignal, b: AbortSignal): AbortSignal => {
  const controller = new AbortController();
  const trigger = () => controller.abort();
  if (a.aborted || b.aborted) controller.abort();
  a.addEventListener('abort', trigger, { once: true });
  b.addEventListener('abort', trigger, { once: true });
  return controller.signal;
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export const httpImageTo3DProvider: ImageTo3DProvider = {
  id: 'http',
  label: 'HTTP / API externa',
  description:
    'Envia as imagens para um endpoint HTTP configuravel e recebe um GLB. Use para integrar motores de IA externos ou backend proprio.',
  isConfigured: (config) => Boolean(config.endpoint),
  generate: generateWithHttpProvider,
};

export const defaultHttpProviderConfig: ImageTo3DProviderConfig = {
  id: 'http',
  label: 'HTTP / API externa',
  description: httpImageTo3DProvider.description,
  endpoint: '/api/image-to-3d/generate',
  timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS,
};
