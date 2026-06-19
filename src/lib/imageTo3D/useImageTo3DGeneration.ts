'use client';

import { useCallback, useRef } from 'react';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { useEditorStore } from '@/store/editorStore';
import { useImageTo3DStore } from '@/store/imageTo3DStore';
import { getProvider, resolveProviderConfig } from '@/lib/imageTo3D/providers/imageTo3DProviderRegistry';
import { importGeneratedModel } from '@/lib/imageTo3D/modelImportUtils';
import { validateRequestImages } from '@/lib/imageTo3D/imageValidationUtils';
import type {
  GenerationStatus,
  ImageTo3DRequest,
  ImageTo3DResult,
  ImageSlot,
  SlotImage,
} from '@/lib/imageTo3D/types';

const generatingStatuses: GenerationStatus[] = [
  'uploading',
  'validating',
  'generating',
  'processingTextures',
  'optimizing',
  'importing',
];

type UseImageTo3DGenerationResult = {
  generate: () => Promise<void>;
  cancel: () => void;
  regenerate: () => Promise<void>;
  importResult: (result?: ImageTo3DResult) => Promise<string | null>;
  replaceCurrentModel: (result?: ImageTo3DResult) => Promise<string | null>;
};

export const useImageTo3DGeneration = (): UseImageTo3DGenerationResult => {
  const abortRef = useRef<AbortController | null>(null);

  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const addObjects = useSceneStore((s) => s.addObjects);
  const removeObject = useSceneStore((s) => s.removeObject);
  const createMaterialForObject = useMaterialStore((s) => s.createMaterialForObject);
  const updateMaterial = useMaterialStore((s) => s.updateMaterial);
  const setSelectedObject = useEditorStore((s) => s.setSelectedObject);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const requestFrameObject = useEditorStore((s) => s.requestFrameObject);

  const store = useImageTo3DStore;

  const buildRequest = useCallback((): ImageTo3DRequest | null => {
    const state = store.getState();
    const images = (Object.values(state.images).filter(Boolean) as SlotImage[]);
    const validation = validateRequestImages(images);
    if (!validation.ok) {
      state.failGeneration(validation.error ?? 'Imagens invalidas.');
      return null;
    }
    return {
      images,
      settings: state.settings,
      providerId: state.providerId,
    };
  }, [store]);

  const runProvider = useCallback(
    async (request: ImageTo3DRequest) => {
      const state = store.getState();
      const provider = getProvider(request.providerId);
      const config = resolveProviderConfig(request.providerId, state.providerConfig);

      if (!provider.isConfigured(config)) {
        state.failGeneration('Provider nao configurado. Verifique as configuracoes.');
        return null;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = await provider.generate(request, config, {
          onProgress: (progress) => store.getState().setProgress(progress),
          signal: controller.signal,
        });
        store.getState().completeGeneration(result);
        return result;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          store.getState().cancelGeneration();
        } else {
          const message = error instanceof Error ? error.message : 'Falha ao gerar modelo.';
          store.getState().failGeneration(message);
        }
        return null;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [store],
  );

  const importResult = useCallback(
    async (resultOverride?: ImageTo3DResult): Promise<string | null> => {
      const state = store.getState();
      const result = resultOverride ?? state.result;
      if (!result) return null;

      store.getState().setStatus('importing', 'Importando modelo para a cena...');

      try {
        const imported = await importGeneratedModel(result, {
          centerPivot: state.settings.centerPivot,
          normalizeScale: state.settings.normalizeScale,
          renameAutomatically: state.settings.renameAutomatically,
          desiredPosition: [0, 0, 0],
        });

        pushSnapshot();
        addObjects(imported.objects);
        imported.materials.forEach((draft) => {
          const created = createMaterialForObject(draft.objectId, draft.materialId, draft.name);
          updateMaterial(created.uuid, draft.patch);
        });

        store.getState().rememberImportedRoot(imported.rootId);
        setSelectedObject(imported.rootId);
        setActiveTool('translate');
        requestFrameObject(imported.rootId);

        store.getState().setProgress({
          status: 'completed',
          percent: 100,
          message: 'Modelo importado para a cena.',
        });

        return imported.rootId;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao importar GLB/GLTF gerado.';
        store.getState().failGeneration(message);
        return null;
      }
    },
    [addObjects, createMaterialForObject, pushSnapshot, requestFrameObject, setActiveTool, setSelectedObject, store, updateMaterial],
  );

  const generate = useCallback(async () => {
    const state = store.getState();
    if (state.status !== 'idle' && state.status !== 'failed' && state.status !== 'cancelled' && state.status !== 'completed') {
      return;
    }
    store.getState().clearResult();
    store.getState().resetToIdle();

    const request = buildRequest();
    if (!request) return;

    store.getState().startGeneration(request);
    const result = await runProvider(request);
    if (!result) return;

    const current = store.getState();
    if (current.settings.autoImport) {
      await importResult(result);
    }
  }, [buildRequest, importResult, runProvider, store]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const regenerate = useCallback(async () => {
    const state = store.getState();
    if (generatingStatuses.includes(state.status)) return;
    const lastRequest = state.lastRequest;
    if (!lastRequest) {
      return generate();
    }
    store.getState().clearResult();
    store.getState().resetToIdle();
    store.getState().startGeneration(lastRequest);
    const result = await runProvider(lastRequest);
    if (!result) return;
    if (store.getState().settings.autoImport) {
      await importResult(result);
    }
  }, [generate, importResult, runProvider, store]);

  const replaceCurrentModel = useCallback(
    async (resultOverride?: ImageTo3DResult): Promise<string | null> => {
      const state = store.getState();
      const result = resultOverride ?? state.result;
      if (!result) return null;

      const existingRootId = state.importedRootId;
      if (existingRootId) {
        pushSnapshot();
        removeObject(existingRootId);
      }
      return importResult(result);
    },
    [importResult, pushSnapshot, removeObject, store],
  );

  return { generate, cancel, regenerate, importResult, replaceCurrentModel };
};

export type { ImageSlot };
