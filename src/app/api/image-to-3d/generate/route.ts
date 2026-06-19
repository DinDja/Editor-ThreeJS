import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import {
  buildMockGeneratedGroup,
  computeModelStats,
  exportGroupAsGlb,
} from '@/lib/imageTo3D/providers/mockModelGenerator';
import {
  DEFAULT_SETTINGS,
  type ImageSlot,
  type ImageTo3DModelType,
  type ImageTo3DQuality,
  type ImageTo3DRequest,
  type ImageTo3DSettings,
  type ImageTo3DStyle,
  type SlotImage,
} from '@/lib/imageTo3D/types';

const ACCEPTED_SLOTS: ImageSlot[] = ['front', 'left', 'right', 'back'];

const parseSettings = (raw: unknown): ImageTo3DSettings => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const value = raw as Record<string, unknown>;
  const modelType = value.modelType as ImageTo3DModelType;
  const style = value.style as ImageTo3DStyle;
  const quality = value.quality as ImageTo3DQuality;
  return {
    ...DEFAULT_SETTINGS,
    modelType: modelType ?? DEFAULT_SETTINGS.modelType,
    style: style ?? DEFAULT_SETTINGS.style,
    quality: quality ?? DEFAULT_SETTINGS.quality,
  };
};

const fileToSlotImage = (file: File, slot: ImageSlot): SlotImage => ({
  slot,
  file,
  url: '',
  name: file.name,
  width: 0,
  height: 0,
  sizeBytes: file.size,
  warnings: [],
});

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const settingsRaw = form.get('settings');
    const settings = parseSettings(
      typeof settingsRaw === 'string' ? JSON.parse(settingsRaw) : null,
    );

    const images: SlotImage[] = [];
    for (const slot of ACCEPTED_SLOTS) {
      const entry = form.get(`image_${slot}`);
      if (entry && entry instanceof File) {
        images.push(fileToSlotImage(entry, slot));
      }
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'Envie ao menos uma imagem (frontal).' },
        { status: 400 },
      );
    }
    if (!images.some((i) => i.slot === 'front')) {
      return NextResponse.json(
        { error: 'A imagem frontal e obrigatoria.' },
        { status: 400 },
      );
    }

    const providerIdRaw = form.get('providerId');
    const providerId = (typeof providerIdRaw === 'string' ? providerIdRaw : 'http') as ImageTo3DRequest['providerId'];

    const generatedRequest: ImageTo3DRequest = {
      images,
      settings,
      providerId,
    };

    const group = buildMockGeneratedGroup(generatedRequest);
    const stats = computeModelStats(group);
    const glb = await exportGroupAsGlb(group);

    const displayName =
      settings.modelType === 'human'
        ? 'Generated Avatar'
        : settings.modelType === 'head'
          ? 'Generated Bust'
          : settings.modelType === 'prop'
            ? 'Generated Prop'
            : 'Generated Model';

    return new NextResponse(glb, {
      status: 200,
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Content-Disposition': `attachment; filename="${displayName.replace(/\s+/g, '_')}.glb"`,
        'X-Image-To-3D-Polycount': String(stats.polycount),
        'X-Image-To-3D-Meshes': String(stats.meshCount),
        'X-Image-To-3D-Materials': String(stats.materialCount),
        'X-Image-To-3D-Textures': String(stats.textureCount),
        'X-Image-To-3D-Provider': 'mock-server',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao gerar modelo 3D no servidor.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
