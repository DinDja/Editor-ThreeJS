import type { Vec3 } from '@/store/types';

export type ImageSlot = 'front' | 'left' | 'right' | 'back';

export type ImageTo3DModelType = 'human' | 'head' | 'object' | 'prop';

export type ImageTo3DStyle = 'realistic' | 'gameReady' | 'stylized' | 'lowPoly' | 'cartoon';

export type ImageTo3DQuality = 'fast' | 'balanced' | 'high';

export type GenerationStatus =
  | 'idle'
  | 'uploading'
  | 'validating'
  | 'generating'
  | 'processingTextures'
  | 'optimizing'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ProviderId = 'mock' | 'http';

export type SlotImage = {
  slot: ImageSlot;
  file: File;
  url: string;
  name: string;
  width: number;
  height: number;
  sizeBytes: number;
  warnings: ImageWarning[];
};

export type ImageWarning = {
  code:
    | 'tooDark'
    | 'tooSmall'
    | 'lowResolution'
    | 'tooLarge'
    | 'invalidFormat'
    | 'possiblyBlurry';
  message: string;
};

export type ImageTo3DSettings = {
  modelType: ImageTo3DModelType;
  style: ImageTo3DStyle;
  quality: ImageTo3DQuality;
  autoImport: boolean;
  centerPivot: boolean;
  normalizeScale: boolean;
  renameAutomatically: boolean;
};

export type ImageTo3DRequest = {
  images: SlotImage[];
  settings: ImageTo3DSettings;
  providerId: ProviderId;
};

export type GenerationProgress = {
  status: GenerationStatus;
  percent: number;
  message: string;
};

export type GeneratedModelStats = {
  polycount: number;
  meshCount: number;
  textureCount: number;
  materialCount: number;
  hasTextures: boolean;
};

export type ImageTo3DResultMetadata = {
  origin: 'Image to 3D';
  providerId: ProviderId;
  modelType: ImageTo3DModelType;
  style: ImageTo3DStyle;
  quality: ImageTo3DQuality;
  createdAt: number;
  stats: GeneratedModelStats;
  imageSlots: ImageSlot[];
  providerName: string;
  providerNotes?: string;
};

export type ImageTo3DResult = {
  glb: ArrayBuffer;
  metadata: ImageTo3DResultMetadata;
  displayName: string;
};

export type ImageTo3DProviderConfig = {
  id: ProviderId;
  label: string;
  description: string;
  endpoint?: string;
  apiKey?: string;
  timeoutMs?: number;
};

export type ProviderGenerationHooks = {
  onProgress?: (progress: GenerationProgress) => void;
  signal?: AbortSignal;
};

export type ImageTo3DProvider = {
  id: ProviderId;
  label: string;
  description: string;
  isConfigured: (config: ImageTo3DProviderConfig) => boolean;
  generate: (
    request: ImageTo3DRequest,
    config: ImageTo3DProviderConfig,
    hooks: ProviderGenerationHooks,
  ) => Promise<ImageTo3DResult>;
};

export const IMAGE_SLOT_LABELS: Record<ImageSlot, string> = {
  front: 'Frontal',
  left: 'Lateral Esq.',
  right: 'Lateral Dir.',
  back: 'Traseira',
};

export const IMAGE_SLOT_ORDER: ImageSlot[] = ['front', 'left', 'right', 'back'];

export const MODEL_TYPE_LABELS: Record<ImageTo3DModelType, string> = {
  human: 'Personagem humano',
  head: 'Cabeca / busto',
  object: 'Objeto generico',
  prop: 'Prop / item',
};

export const MODEL_TYPE_DESCRIPTIONS: Record<ImageTo3DModelType, string> = {
  human: 'Corpo completo aproximado a partir das imagens.',
  head: 'Apenas cabeca/busto, maior detalhe facial.',
  object: 'Objeto arbitrario reconstruido por volume.',
  prop: 'Item isolado para cena ou inventario.',
};

export const STYLE_LABELS: Record<ImageTo3DStyle, string> = {
  realistic: 'Realista',
  gameReady: 'Game ready',
  stylized: 'Estilizado',
  lowPoly: 'Low poly',
  cartoon: 'Cartoon',
};

export const QUALITY_LABELS: Record<ImageTo3DQuality, string> = {
  fast: 'Rapida',
  balanced: 'Balanceada',
  high: 'Alta qualidade',
};

export const QUALITY_DESCRIPTIONS: Record<ImageTo3DQuality, string> = {
  fast: 'Geracao rapida, menos poligonos.',
  balanced: 'Equilibrio entre velocidade e detalhe.',
  high: 'Maior detalhe e texturas, mais demorado.',
};

export const STATUS_LABELS: Record<GenerationStatus, string> = {
  idle: 'Pronto',
  uploading: 'Enviando imagens',
  validating: 'Validando imagens',
  generating: 'Gerando modelo',
  processingTextures: 'Processando texturas',
  optimizing: 'Otimizando malha',
  importing: 'Importando modelo',
  completed: 'Concluido',
  failed: 'Falhou',
  cancelled: 'Cancelado',
};

export const DEFAULT_SETTINGS: ImageTo3DSettings = {
  modelType: 'human',
  style: 'stylized',
  quality: 'balanced',
  autoImport: true,
  centerPivot: true,
  normalizeScale: true,
  renameAutomatically: true,
};

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
export const ACCEPTED_IMAGE_EXTENSIONS = '.png,.jpg,.jpeg,.webp';
export const DEFAULT_MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const DEFAULT_MIN_IMAGE_DIMENSION = 256;
export const DEFAULT_PROVIDER_TIMEOUT_MS = 180_000;

export type GeneratedModelMetadata = {
  imageTo3D: ImageTo3DResultMetadata;
  generatedDisplayName: string;
  generatedAt: number;
  sourceSlotCount: number;
};

export type ImportGeneratedModelOptions = {
  centerPivot?: boolean;
  normalizeScale?: boolean;
  renameAutomatically?: boolean;
  fallbackName?: string;
  desiredPosition?: Vec3;
};

export type ImportedGeneratedModel = {
  rootId: string;
  objects: import('@/store/types').SceneObjectInput[];
  materials: import('@/lib/gltfImport').ImportedMaterialDraft[];
  metadata: GeneratedModelMetadata;
  stats: GeneratedModelStats;
};
