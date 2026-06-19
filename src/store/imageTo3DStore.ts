import { create } from 'zustand';
import { DEFAULT_SETTINGS, DEFAULT_MAX_IMAGE_BYTES, type GenerationProgress, type ImageSlot, type ImageTo3DProviderConfig, type ImageTo3DRequest, type ImageTo3DResult, type ImageTo3DSettings, type ProviderId, type SlotImage, } from '@/lib/imageTo3D/types';
import { createSlotImage, dismissSlotImage } from '@/lib/imageTo3D/imageValidationUtils';
import { getDefaultProviderConfig } from '@/lib/imageTo3D/providers/imageTo3DProviderRegistry';

type GenerationHistoryEntry = {
  id: string;
  request: ImageTo3DRequest;
  result: ImageTo3DResult;
  importedRootId: string | null;
};

type ImageTo3DState = {
  open: boolean;
  images: Partial<Record<ImageSlot, SlotImage>>;
  settings: ImageTo3DSettings;
  providerId: ProviderId;
  providerConfig: ImageTo3DProviderConfig;
  status: GenerationProgress['status'];
  progress: GenerationProgress;
  error: string | null;
  result: ImageTo3DResult | null;
  lastRequest: ImageTo3DRequest | null;
  history: GenerationHistoryEntry[];
  importedRootId: string | null;
  maxImageBytes: number;
  minImageDimension: number;

  setOpen: (open: boolean) => void;
  setSlotImage: (slot: ImageSlot, file: File) => Promise<void>;
  removeSlotImage: (slot: ImageSlot) => void;
  clearImages: () => void;
  updateSettings: (patch: Partial<ImageTo3DSettings>) => void;
  setProviderId: (id: ProviderId) => void;
  updateProviderConfig: (patch: Partial<ImageTo3DProviderConfig>) => void;
  setProgress: (progress: GenerationProgress) => void;
  setStatus: (status: GenerationProgress['status'], message?: string) => void;
  setError: (error: string | null) => void;
  startGeneration: (request: ImageTo3DRequest) => void;
  completeGeneration: (result: ImageTo3DResult) => void;
  failGeneration: (error: string) => void;
  cancelGeneration: () => void;
  resetToIdle: () => void;
  clearResult: () => void;
  rememberImportedRoot: (rootId: string | null) => void;
  removeFromHistory: (id: string) => void;
  resetAll: () => void;
};

const idleProgress: GenerationProgress = { status: 'idle', percent: 0, message: '' };

export const useImageTo3DStore = create<ImageTo3DState>((set, get) => ({
  open: false,
  images: {},
  settings: { ...DEFAULT_SETTINGS },
  providerId: 'mock',
  providerConfig: getDefaultProviderConfig('mock'),
  status: 'idle',
  progress: idleProgress,
  error: null,
  result: null,
  lastRequest: null,
  history: [],
  importedRootId: null,
  maxImageBytes: DEFAULT_MAX_IMAGE_BYTES,
  minImageDimension: 256,

  setOpen: (open) => set({ open }),

  setSlotImage: async (slot, file) => {
    const state = get();
    const existing = state.images[slot];
    if (existing) dismissSlotImage(existing);

    try {
      const slotImage = await createSlotImage(slot, file, {
        maxBytes: state.maxImageBytes,
        minDimension: state.minImageDimension,
      });
      set((s) => ({ images: { ...s.images, [slot]: slotImage }, error: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao carregar a imagem.';
      set({ error: message });
    }
  },

  removeSlotImage: (slot) =>
    set((state) => {
      const existing = state.images[slot];
      if (existing) dismissSlotImage(existing);
      const next = { ...state.images };
      delete next[slot];
      return { images: next };
    }),

  clearImages: () =>
    set((state) => {
      Object.values(state.images).forEach((image) => image && dismissSlotImage(image));
      return { images: {} };
    }),

  updateSettings: (patch) =>
    set((state) => ({ settings: { ...state.settings, ...patch } })),

  setProviderId: (id) =>
    set(() => ({ providerId: id, providerConfig: getDefaultProviderConfig(id) })),

  updateProviderConfig: (patch) =>
    set((state) => ({ providerConfig: { ...state.providerConfig, ...patch } })),

  setProgress: (progress) => set({ progress, status: progress.status }),
  setStatus: (status, message) =>
    set((state) => ({
      status,
      progress: { status, percent: state.progress.percent, message: message ?? state.progress.message },
    })),
  setError: (error) => set({ error }),

  startGeneration: (request) =>
    set({
      lastRequest: request,
      result: null,
      error: null,
      status: 'uploading',
      progress: { status: 'uploading', percent: 4, message: 'Iniciando geracao...' },
    }),

  completeGeneration: (result) =>
    set((state) => {
      const lastRequest = state.lastRequest;
      const entry: GenerationHistoryEntry | null = lastRequest
        ? {
            id: `gen-${result.metadata.createdAt}`,
            request: lastRequest,
            result,
            importedRootId: null,
          }
        : null;
      return {
        result,
        status: 'completed',
        progress: { status: 'completed', percent: 100, message: 'Modelo gerado com sucesso.' },
        history: entry ? [entry, ...state.history].slice(0, 12) : state.history,
      };
    }),

  failGeneration: (error) =>
    set({
      status: 'failed',
      progress: { status: 'failed', percent: 0, message: error },
      error,
    }),

  cancelGeneration: () =>
    set({
      status: 'cancelled',
      progress: { status: 'cancelled', percent: 0, message: 'Geracao cancelada.' },
    }),

  resetToIdle: () =>
    set({
      status: 'idle',
      progress: idleProgress,
      error: null,
    }),

  clearResult: () => set({ result: null }),

  rememberImportedRoot: (importedRootId) => {
    set({ importedRootId });
    const state = get();
    if (importedRootId && state.history[0]) {
      set({
        history: state.history.map((entry, index) =>
          index === 0 ? { ...entry, importedRootId } : entry,
        ),
      });
    }
  },

  removeFromHistory: (id) =>
    set((state) => ({ history: state.history.filter((entry) => entry.id !== id) })),

  resetAll: () =>
    set((state) => {
      Object.values(state.images).forEach((image) => image && dismissSlotImage(image));
      return {
        images: {},
        settings: { ...DEFAULT_SETTINGS },
        status: 'idle',
        progress: idleProgress,
        error: null,
        result: null,
        importedRootId: null,
      };
    }),
}));
