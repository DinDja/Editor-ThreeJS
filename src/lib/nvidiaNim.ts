import 'server-only';
import { jsonrepair } from 'jsonrepair';

const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.1-8b-instruct';

const PRIMITIVES = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane'] as const;

type PrimitiveKind = (typeof PRIMITIVES)[number];

type NimObject = {
  name: string;
  primitive: PrimitiveKind;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  parentName?: string;
  editableMesh: boolean;
  geometry?: Record<string, number>;
  material: Partial<{
    color: string;
    metalness: number;
    roughness: number;
    emissive: string;
    emissiveIntensity: number;
    opacity: number;
    textureRepeatX: number;
    textureRepeatY: number;
    textureOffsetX: number;
    textureOffsetY: number;
    textureRotation: number;
  }>;
};

export type NimScene = {
  objects: NimObject[];
};

const ensureVec3 = (value: unknown, fallback: [number, number, number]): [number, number, number] => {
  if (!Array.isArray(value) || value.length !== 3) return fallback;

  const numbers = value.map((item) => Number(item));
  if (numbers.some((item) => !Number.isFinite(item))) return fallback;

  return [numbers[0], numbers[1], numbers[2]];
};

const ensureHex = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  return /^#([0-9a-fA-F]{6})$/.test(value) ? value : fallback;
};

const ensureFinite = (value: unknown, fallback: number, min: number, max: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
};

const ensureInt = (value: unknown, fallback: number, min: number, max: number) => {
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
};

const ensureBool = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};

const ensureOptionalName = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeGeometry = (primitive: PrimitiveKind, value: unknown): Record<string, number> | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;

  const common = {
    widthSegments: ensureInt(candidate.widthSegments, 1, 1, 128),
    heightSegments: ensureInt(candidate.heightSegments, 1, 1, 128),
    depthSegments: ensureInt(candidate.depthSegments, 1, 1, 128),
    radialSegments: ensureInt(candidate.radialSegments, 24, 3, 128),
    tubularSegments: ensureInt(candidate.tubularSegments, 64, 3, 256),
  };

  if (primitive === 'box') {
    return {
      width: ensureFinite(candidate.width, 1, 0.05, 100),
      height: ensureFinite(candidate.height, 1, 0.05, 100),
      depth: ensureFinite(candidate.depth, 1, 0.05, 100),
      widthSegments: common.widthSegments,
      heightSegments: common.heightSegments,
      depthSegments: common.depthSegments,
    };
  }

  if (primitive === 'sphere') {
    return {
      radius: ensureFinite(candidate.radius, 0.6, 0.05, 100),
      widthSegments: ensureInt(candidate.widthSegments, 32, 3, 128),
      heightSegments: ensureInt(candidate.heightSegments, 24, 2, 128),
      radialSegments: common.radialSegments,
    };
  }

  if (primitive === 'cylinder') {
    return {
      radiusTop: ensureFinite(candidate.radiusTop, 0.45, 0, 100),
      radiusBottom: ensureFinite(candidate.radiusBottom, 0.45, 0.01, 100),
      height: ensureFinite(candidate.height, 1.1, 0.05, 100),
      radialSegments: common.radialSegments,
      heightSegments: common.heightSegments,
    };
  }

  if (primitive === 'cone') {
    return {
      radiusBottom: ensureFinite(candidate.radiusBottom, 0.55, 0.01, 100),
      height: ensureFinite(candidate.height, 1.2, 0.05, 100),
      radialSegments: common.radialSegments,
      heightSegments: common.heightSegments,
    };
  }

  if (primitive === 'torus') {
    return {
      radius: ensureFinite(candidate.radius, 0.48, 0.05, 100),
      tube: ensureFinite(candidate.tube, 0.16, 0.01, 50),
      radialSegments: common.radialSegments,
      tubularSegments: common.tubularSegments,
    };
  }

  return {
    width: ensureFinite(candidate.width, 1.6, 0.05, 100),
    height: ensureFinite(candidate.height, 1.6, 0.05, 100),
    widthSegments: ensureInt(candidate.widthSegments, 12, 1, 128),
    heightSegments: ensureInt(candidate.heightSegments, 12, 1, 128),
  };
};

const extractJson = (content: string) => {
  const fenced = content.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const firstCurly = content.indexOf('{');
  const lastCurly = content.lastIndexOf('}');
  if (firstCurly >= 0 && lastCurly > firstCurly) {
    return content.slice(firstCurly, lastCurly + 1);
  }

  throw new Error('Resposta da NVIDIA NIM nao retornou JSON valido.');
};

const parseNimJson = (rawContent: string): unknown => {
  const jsonText = extractJson(rawContent);

  try {
    return JSON.parse(jsonText) as unknown;
  } catch {
    try {
      const repaired = jsonrepair(jsonText);
      return JSON.parse(repaired) as unknown;
    } catch {
      throw new Error('A IA retornou JSON invalido. Tente novamente com um prompt mais curto e objetivo.');
    }
  }
};

const normalizeScene = (input: unknown): NimScene => {
  if (!input || typeof input !== 'object') {
    throw new Error('Resposta da IA veio em formato invalido.');
  }

  const objects = (input as { objects?: unknown }).objects;
  if (!Array.isArray(objects) || objects.length === 0) {
    throw new Error('A IA nao retornou objetos para a cena.');
  }

  const normalized = objects
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;

      const primitive = typeof candidate.primitive === 'string' ? candidate.primitive.toLowerCase() : '';
      if (!PRIMITIVES.includes(primitive as PrimitiveKind)) return null;

      const name = typeof candidate.name === 'string' && candidate.name.trim().length > 0 ? candidate.name.trim() : `Objeto ${index + 1}`;
      const materialCandidate = candidate.material && typeof candidate.material === 'object' ? (candidate.material as Record<string, unknown>) : {};
      const primitiveKind = primitive as PrimitiveKind;

      return {
        name,
        primitive: primitiveKind,
        position: ensureVec3(candidate.position, [0, 0.5, 0]),
        rotation: ensureVec3(candidate.rotation, [0, 0, 0]),
        scale: ensureVec3(candidate.scale, [1, 1, 1]),
        visible: ensureBool(candidate.visible, true),
        parentName: ensureOptionalName(candidate.parentName),
        editableMesh: ensureBool(candidate.editableMesh, false),
        geometry: normalizeGeometry(primitiveKind, candidate.geometry),
        material: {
          color: ensureHex(materialCandidate.color, '#f8fafc'),
          emissive: ensureHex(materialCandidate.emissive, '#000000'),
          metalness: ensureFinite(materialCandidate.metalness, 0, 0, 1),
          roughness: ensureFinite(materialCandidate.roughness, 0.55, 0, 1),
          emissiveIntensity: ensureFinite(materialCandidate.emissiveIntensity, 0, 0, 5),
          opacity: ensureFinite(materialCandidate.opacity, 1, 0, 1),
          textureRepeatX: ensureFinite(materialCandidate.textureRepeatX, 1, 0.1, 8),
          textureRepeatY: ensureFinite(materialCandidate.textureRepeatY, 1, 0.1, 8),
          textureOffsetX: ensureFinite(materialCandidate.textureOffsetX, 0, -2, 2),
          textureOffsetY: ensureFinite(materialCandidate.textureOffsetY, 0, -2, 2),
          textureRotation: ensureFinite(materialCandidate.textureRotation, 0, -3.14159, 3.14159),
        },
      };
    })
    .filter((item) => item !== null)
    .slice(0, 20) as NimObject[];

  if (normalized.length === 0) {
    throw new Error('A IA nao retornou primitivas validas para o editor.');
  }

  return { objects: normalized };
};

export async function generateSceneWithNvidiaNim(prompt: string): Promise<NimScene> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_NIM_API_KEY nao configurada no ambiente.');
  }

  const baseUrl = process.env.NVIDIA_NIM_BASE_URL ?? DEFAULT_NVIDIA_BASE_URL;
  const model = process.env.NVIDIA_NIM_MODEL ?? DEFAULT_MODEL;

  const systemPrompt = [
    'Voce gera cenas para um editor 3D com primitivas editaveis.',
    'Responda somente JSON valido, sem markdown.',
    'Formato obrigatorio: {"objects":[{"name":"...","primitive":"box|sphere|cylinder|cone|torus|plane","position":[x,y,z],"rotation":[x,y,z],"scale":[x,y,z],"visible":true,"editableMesh":false,"parentName":"Nome opcional do pai","geometry":{},"material":{"color":"#RRGGBB","metalness":0-1,"roughness":0-1,"emissive":"#RRGGBB","emissiveIntensity":0-5,"opacity":0-1,"textureRepeatX":0.1-8,"textureRepeatY":0.1-8,"textureOffsetX":-2-2,"textureOffsetY":-2-2,"textureRotation":-3.14159-3.14159}}]}',
    'Use geometry de forma especifica por primitiva (box: width/height/depth e segments; sphere: radius/widthSegments/heightSegments; cylinder: radiusTop/radiusBottom/height/radialSegments/heightSegments; cone: radiusBottom/height/radialSegments/heightSegments; torus: radius/tube/radialSegments/tubularSegments; plane: width/height/widthSegments/heightSegments).',
    'Use parentName para criar hierarquia quando fizer sentido e editableMesh=true para objetos que precisem iniciar prontos para modelagem.',
    'No maximo 12 objetos e valores numericos realistas.',
  ].join(' ');

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha na NVIDIA NIM (${response.status}): ${text.slice(0, 240)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('NVIDIA NIM retornou resposta vazia.');
  }

  const parsed = parseNimJson(content);

  return normalizeScene(parsed);
}
