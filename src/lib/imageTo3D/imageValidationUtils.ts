import {
  ACCEPTED_IMAGE_TYPES,
  DEFAULT_MAX_IMAGE_BYTES,
  DEFAULT_MIN_IMAGE_DIMENSION,
  type ImageSlot,
  type ImageWarning,
  type SlotImage,
} from './types';

export type ImageValidationOptions = {
  maxBytes?: number;
  minDimension?: number;
};

export const isAcceptedImageType = (file: File) => {
  const type = file.type.toLowerCase();
  if (type && ACCEPTED_IMAGE_TYPES.includes(type)) return true;
  return /\.(png|jpe?g|webp)$/i.test(file.name);
};

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const loadImageElement = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Nao foi possivel decodificar a imagem.'));
    image.src = url;
  });

const computeAverageBrightness = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): number => {
  const sampleW = Math.min(64, width);
  const sampleH = Math.min(64, height);
  const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
  let total = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    total += (r + g + b) / 3;
    count += 1;
  }
  return count > 0 ? total / count / 255 : 1;
};

export const validateImageFile = async (
  file: File,
  options: ImageValidationOptions = {},
): Promise<{ ok: boolean; warnings: ImageWarning[]; dimensions?: { width: number; height: number } }> => {
  const warnings: ImageWarning[] = [];
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_IMAGE_BYTES;
  const minDimension = options.minDimension ?? DEFAULT_MIN_IMAGE_DIMENSION;

  if (!isAcceptedImageType(file)) {
    return {
      ok: false,
      warnings: [
        { code: 'invalidFormat', message: 'Formato nao suportado. Use PNG, JPG, JPEG ou WebP.' },
      ],
    };
  }

  if (file.size > maxBytes) {
    warnings.push({
      code: 'tooLarge',
      message: `Imagem grande (${formatBytes(file.size)}). Pode demorar no upload.`,
    });
  }

  let width = 0;
  let height = 0;
  try {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImageElement(url);
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;

      if (width < minDimension || height < minDimension) {
        warnings.push({
          code: 'tooSmall',
          message: `Resolucao baixa (${width}x${height}). Use ao menos ${minDimension}px.`,
        });
      } else if (width < minDimension * 2 || height < minDimension * 2) {
        warnings.push({
          code: 'lowResolution',
          message: 'Resolucao modesta; fotos maiores melhoram o resultado.',
        });
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(64, width);
        canvas.height = Math.min(64, height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const brightness = computeAverageBrightness(canvas, ctx, canvas.width, canvas.height);
          if (brightness < 0.18) {
            warnings.push({
              code: 'tooDark',
              message: 'Imagem muito escura. Melhore a iluminacao para melhor geracao.',
            });
          }
        }
      } catch {
        /* canvas indisponivel, ignora analise de brilho */
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    /* falhou decodificacao parcial; mantem dimensoes zero */
  }

  return { ok: warnings.every((w) => w.code !== 'invalidFormat'), warnings, dimensions: { width, height } };
};

export const createSlotImage = async (
  slot: ImageSlot,
  file: File,
  options: ImageValidationOptions = {},
): Promise<SlotImage> => {
  const validation = await validateImageFile(file, options);
  const url = URL.createObjectURL(file);
  const dims = validation.dimensions ?? { width: 0, height: 0 };

  return {
    slot,
    file,
    url,
    name: file.name,
    width: dims.width,
    height: dims.height,
    sizeBytes: file.size,
    warnings: validation.warnings,
  };
};

export const hasBlockingWarning = (warnings: ImageWarning[]) =>
  warnings.some((w) => w.code === 'invalidFormat');

export const dismissSlotImage = (image: SlotImage | undefined) => {
  if (image) URL.revokeObjectURL(image.url);
};

export const validateRequestImages = (images: SlotImage[]) => {
  if (images.length === 0) {
    return { ok: false, error: 'Envie ao menos a imagem frontal.' };
  }
  if (!images.some((img) => img.slot === 'front')) {
    return { ok: false, error: 'A imagem frontal e obrigatoria.' };
  }
  const blocking = images.find((img) => hasBlockingWarning(img.warnings));
  if (blocking) {
    const msg = blocking.warnings.find((w) => w.code === 'invalidFormat')?.message ?? 'Imagem invalida.';
    return { ok: false, error: msg };
  }
  return { ok: true, error: null };
};
