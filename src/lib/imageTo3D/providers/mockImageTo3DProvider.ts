'use client';

import {
  buildMockGeneratedGroup,
  computeModelStats,
  exportGroupAsGlb,
} from './mockModelGenerator';
import type {
  GenerationProgress,
  ImageTo3DProvider,
  ImageTo3DProviderConfig,
  ImageTo3DResultMetadata,
  ProviderGenerationHooks,
} from '../types';

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    signal?.addEventListener('abort', onAbort);
  });

const runStage = async (
  status: GenerationProgress['status'],
  message: string,
  percent: number,
  durationMs: number,
  hooks: ProviderGenerationHooks,
) => {
  hooks.onProgress?.({ status, percent, message });
  await wait(durationMs, hooks.signal);
};

export const generateWithMockProvider: ImageTo3DProvider['generate'] = async (
  request,
  config,
  hooks,
) => {
  const summary = {
    modelType: request.settings.modelType,
    style: request.settings.style,
    quality: request.settings.quality,
    imageSlots: request.images.map((i) => i.slot),
  };

  const fast = request.settings.quality === 'fast';
  const stageDuration = fast ? 180 : request.settings.quality === 'high' ? 900 : 450;

  await runStage('uploading', 'Enviando imagens para o gerador...', 6, stageDuration, hooks);
  await runStage('validating', 'Validando imagens e orientacoes...', 12, stageDuration * 0.6, hooks);
  await runStage('generating', 'Reconstruindo volume 3D aproximado...', 35, stageDuration * 1.6, hooks);

  if (hooks.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const group = buildMockGeneratedGroup(request);
  const stats = computeModelStats(group);

  await runStage('processingTextures', 'Processando texturas e materiais...', 65, stageDuration, hooks);
  await runStage('optimizing', 'Otimizando malha e normals...', 82, stageDuration * 0.8, hooks);

  if (hooks.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  hooks.onProgress?.({ status: 'generating', percent: 90, message: 'Exportando GLB final...' });
  const glb = await exportGroupAsGlb(group);

  await runStage('importing', 'Preparando modelo para o editor...', 96, stageDuration * 0.4, hooks);

  const displayName =
    request.settings.modelType === 'human'
      ? 'Generated Avatar'
      : request.settings.modelType === 'head'
        ? 'Generated Bust'
        : request.settings.modelType === 'prop'
          ? 'Generated Prop'
          : 'Generated Model';

  const metadata: ImageTo3DResultMetadata = {
    origin: 'Image to 3D',
    providerId: config.id,
    modelType: summary.modelType,
    style: summary.style,
    quality: summary.quality,
    createdAt: Date.now(),
    stats,
    imageSlots: summary.imageSlots,
    providerName: config.label,
    providerNotes: 'Gerado por provedor mock (modelo aproximado para demonstracao).',
  };

  return { glb, metadata, displayName };
};

export const mockImageTo3DProvider: ImageTo3DProvider = {
  id: 'mock',
  label: 'Mock (local)',
  description:
    'Gerador local de demonstracao. Produz um GLB procedural aproximado sem usar IA externa. Util para testar o fluxo completo do editor.',
  isConfigured: () => true,
  generate: generateWithMockProvider,
};

export const defaultMockProviderConfig: ImageTo3DProviderConfig = {
  id: 'mock',
  label: 'Mock (local)',
  description: mockImageTo3DProvider.description,
};
