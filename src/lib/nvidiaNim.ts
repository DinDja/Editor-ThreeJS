import 'server-only';
import { jsonrepair } from 'jsonrepair';

const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_QUALITY_MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct';
const DEFAULT_FAST_MODEL = 'meta/llama-3.1-8b-instruct';

const VERTEX_RANGE = 2;
const MAX_OBJECTS = 8;
const MIN_VERTICES_PER_OBJECT = 8;
const MAX_VERTICES_PER_OBJECT = 120;
const MAX_FACES_PER_OBJECT = 200;

type NimVertex = [number, number, number];
type NimFace = [number, number, number];

type NimMeshObject = {
  name: string;
  vertices: NimVertex[];
  faces: NimFace[];
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  parentName?: string;
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
  objects: NimMeshObject[];
};

type ChatCompletionPayload = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
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

const clampVertex = (value: unknown): NimVertex | null => {
  if (!Array.isArray(value)) return null;
  const numbers = value.map((item) => Number(item));
  if (numbers.length !== 3 || numbers.some((item) => !Number.isFinite(item))) return null;
  return [
    Math.max(-VERTEX_RANGE, Math.min(VERTEX_RANGE, numbers[0])),
    Math.max(-VERTEX_RANGE, Math.min(VERTEX_RANGE, numbers[1])),
    Math.max(-VERTEX_RANGE, Math.min(VERTEX_RANGE, numbers[2])),
  ];
};

const clampFace = (value: unknown, vertexCount: number): NimFace | null => {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const indices = value.map((item) => Math.round(Number(item)));
  if (indices.some((item) => !Number.isFinite(item))) return null;
  if (indices.some((item) => item < 0 || item >= vertexCount)) return null;
  if (indices[0] === indices[1] || indices[1] === indices[2] || indices[0] === indices[2]) return null;
  return [indices[0], indices[1], indices[2]];
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
      throw new Error('A IA retornou JSON invalido.');
    }
  }
};

const normalizeMaterial = (candidate: unknown) => {
  const materialCandidate = candidate && typeof candidate === 'object' ? (candidate as Record<string, unknown>) : {};
  return {
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
  };
};

const normalizeMeshObject = (item: unknown, index: number): NimMeshObject | null => {
  if (!item || typeof item !== 'object') return null;
  const candidate = item as Record<string, unknown>;

  const rawVertices = Array.isArray(candidate.vertices) ? candidate.vertices : [];
  const vertices: NimVertex[] = [];
  for (const raw of rawVertices) {
    const v = clampVertex(raw);
    if (v) vertices.push(v);
    if (vertices.length >= MAX_VERTICES_PER_OBJECT) break;
  }

  if (vertices.length < MIN_VERTICES_PER_OBJECT) return null;

  const rawFaces = Array.isArray(candidate.faces) ? candidate.faces : [];
  const faces: NimFace[] = [];
  for (const raw of rawFaces) {
    const f = clampFace(raw, vertices.length);
    if (f) faces.push(f);
    if (faces.length >= MAX_FACES_PER_OBJECT) break;
  }

  if (faces.length < 4) return null;

  const name = typeof candidate.name === 'string' && candidate.name.trim().length > 0 ? candidate.name.trim() : `Malha ${index + 1}`;

  return {
    name,
    vertices,
    faces,
    position: ensureVec3(candidate.position, [0, 0.5, 0]),
    rotation: ensureVec3(candidate.rotation, [0, 0, 0]),
    scale: ensureVec3(candidate.scale, [1, 1, 1]),
    visible: ensureBool(candidate.visible, true),
    parentName: ensureOptionalName(candidate.parentName),
    material: normalizeMaterial(candidate.material),
  };
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
    .map((item, index) => normalizeMeshObject(item, index))
    .filter((item): item is NimMeshObject => item !== null)
    .slice(0, MAX_OBJECTS);

  if (normalized.length === 0) {
    throw new Error('A IA nao retornou malhas validas para o editor.');
  }

  return { objects: normalized };
};

const round3 = (value: number) => Number(value.toFixed(3));

const compactSceneLayout = (scene: NimScene): NimScene => {
  if (scene.objects.length <= 1) {
    return scene;
  }

  const xs = scene.objects.map((object) => object.position[0]);
  const ys = scene.objects.map((object) => object.position[1]);
  const zs = scene.objects.map((object) => object.position[2]);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const spanZ = maxZ - minZ;
  const maxSpan = Math.max(spanX, spanY, spanZ, 0.001);

  const targetSpan = 3;
  const compactScale = maxSpan > targetSpan ? targetSpan / maxSpan : 1;
  const groundOffset = -((minY - centerY) * compactScale);

  return {
    objects: scene.objects.map((object) => {
      const [x, y, z] = object.position;
      const compactedX = (x - centerX) * compactScale;
      const compactedY = (y - centerY) * compactScale + groundOffset;
      const compactedZ = (z - centerZ) * compactScale;

      return {
        ...object,
        position: [
          round3(Math.max(-4, Math.min(4, compactedX))),
          round3(Math.max(0, Math.min(6, compactedY))),
          round3(Math.max(-4, Math.min(4, compactedZ))),
        ],
      };
    }),
  };
};

const isOverlySimpleScene = (scene: NimScene) => {
  const totalVertices = scene.objects.reduce((sum, object) => sum + object.vertices.length, 0);
  const totalFaces = scene.objects.reduce((sum, object) => sum + object.faces.length, 0);
  return scene.objects.length < 3 || totalVertices < 40 || totalFaces < 50;
};

export async function generateSceneWithNvidiaNim(prompt: string): Promise<NimScene> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_NIM_API_KEY nao configurada no ambiente.');
  }

  const baseUrl = process.env.NVIDIA_NIM_BASE_URL ?? DEFAULT_NVIDIA_BASE_URL;
  const qualityModel = process.env.NVIDIA_NIM_MODEL_PRIMARY ?? process.env.NVIDIA_NIM_MODEL ?? DEFAULT_QUALITY_MODEL;
  const fastModel = process.env.NVIDIA_NIM_MODEL_FALLBACK ?? DEFAULT_FAST_MODEL;

  const systemPrompt = [
    'Voce gera modelos 3D como MALHAS de triangulos (vertices + faces) para um editor 3D.',
    'Responda somente JSON valido, sem markdown, sem explicacoes.',
    'Formato obrigatorio: {"objects":[{"name":"...","vertices":[[x,y,z],...],"faces":[[i,j,k],...],"position":[x,y,z],"rotation":[x,y,z],"scale":[x,y,z],"visible":true,"parentName":"nome do pai opcional","material":{"color":"#RRGGBB","metalness":0-1,"roughness":0-1,"emissive":"#RRGGBB","emissiveIntensity":0-5,"opacity":0-1,"textureRepeatX":0.1-8,"textureRepeatY":0.1-8,"textureOffsetX":-2-2,"textureOffsetY":-2-2,"textureRotation":-3.14159-3.14159}}]}',
    '',
    'REGRAS DA MALHA:',
    '- vertices: coordenadas LOCAIS do objeto em espaco ~[-1.5, 1.5]. Cada vertice eh [x,y,z] com numeros decimais.',
    '- faces: indices de triangulos no array de vertices. Cada face eh [i,j,k]. Indices validos de 0 ate (numero de vertices - 1).',
    '- Mantenha malhas low-poly porem reconhaveis: 20 a 60 vertices por objeto, 40 a 120 faces.',
    '- Os vertices devem formar uma SUPERFICIE fechada ou quase-fechada (solida, tipo esfera/capsula/caixa arredondada/corpo organico).',
    '- NAO gere faces degeneradas (3 vertices colineares ou repetidos).',
    '- Garanta que cada face referencia vertices EXISTENTES (indice valido).',
    '- Pense no volume 3D: gere vertices cobrindo frente, costas, topo e base do objeto.',
    '',
    'COMPOSICAO:',
    '- Decomponha objetos complexos em varias malhas (ex: robo = cabeca, tronco, bracos, pernas, detalhes).',
    '- Use parentName para hierarquia (ex: "braco esquerdo" com parentName "tronco").',
    '- Retorne 3 a 7 objetos por cena.',
    '- Posicoes absolutas proximas (raio maximo ~2 unidades), centralizadas na origem.',
    '- Use scale para variar o tamanho das partes.',
    '',
    'MATERIAIS:',
    '- Varie cor, metalness e roughness entre partes para riqueza visual.',
    '- Use emissive para detalhes que brilham (luzes, olhos, paineis).',
    '',
    'EXEMPLO de objeto simples (cubo arredondado):',
    '{"name":"corpo","vertices":[[-0.5,-0.5,-0.5],[0.5,-0.5,-0.5],[0.5,0.5,-0.5],[-0.5,0.5,-0.5],[-0.5,-0.5,0.5],[0.5,-0.5,0.5],[0.5,0.5,0.5],[-0.5,0.5,0.5]],"faces":[[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],[2,6,7],[2,7,3],[1,5,6],[1,6,2],[0,3,7],[0,7,4]],"position":[0,0.5,0],"scale":[1,1,1],"material":{"color":"#9fb3ff","metalness":0.4,"roughness":0.3}}',
  ].join('\n');

  const callNim = async (userPrompt: string, temperature: number, maxTokens: number) => {
    const candidateModels = Array.from(new Set([qualityModel, fastModel].filter((value) => value.trim().length > 0)));
    let lastError: Error | null = null;

    const parseSceneContent = (rawContent: string) => compactSceneLayout(normalizeScene(parseNimJson(rawContent)));

    for (const candidateModel of candidateModels) {
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: candidateModel,
            temperature,
            max_tokens: maxTokens,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Falha na NVIDIA NIM (${response.status}) usando ${candidateModel}: ${text.slice(0, 240)}`);
        }

        const payload = (await response.json()) as ChatCompletionPayload;
        const content = payload.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error(`NVIDIA NIM retornou resposta vazia usando ${candidateModel}.`);
        }

        try {
          return parseSceneContent(content);
        } catch {
          const repairPrompt = [
            'Corrija o conteudo abaixo para JSON estritamente valido.',
            'Retorne apenas JSON puro no formato: {"objects":[{"name":"...","vertices":[[x,y,z],...],"faces":[[i,j,k],...],...}]} sem markdown e sem explicacoes.',
            'Conteudo original:',
            content,
          ].join('\n');

          const repairResponse = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: candidateModel,
              temperature: 0,
              max_tokens: Math.max(maxTokens, 2200),
              messages: [
                { role: 'system', content: 'Voce eh um reparador de JSON. Responda apenas JSON valido.' },
                { role: 'user', content: repairPrompt },
              ],
            }),
          });

          if (!repairResponse.ok) {
            const text = await repairResponse.text();
            throw new Error(`Falha ao reparar JSON (${repairResponse.status}) usando ${candidateModel}: ${text.slice(0, 240)}`);
          }

          const repairPayload = (await repairResponse.json()) as ChatCompletionPayload;
          const repairedContent = repairPayload.choices?.[0]?.message?.content;
          if (!repairedContent) {
            throw new Error(`NVIDIA NIM nao retornou JSON reparado usando ${candidateModel}.`);
          }

          return parseSceneContent(repairedContent);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Falha desconhecida ao consultar NVIDIA NIM.');
      }
    }

    throw lastError ?? new Error('Falha ao consultar os modelos NVIDIA NIM configurados.');
  };

  const firstScene = await callNim(prompt, 0.4, 5000);

  if (!isOverlySimpleScene(firstScene)) {
    return firstScene;
  }

  const reinforcedPrompt = [
    prompt,
    'IMPORTANTE: a cena ficou simples demais. Gere malhas com mais vertices e faces.',
    'Cada objeto deve ter 30 a 60 vertices e 50 a 120 faces, formando superficies solidas reconhaveis.',
    'Decomponha em 4 a 7 partes com parentName para hierarquia.',
    'Pense no volume 3D de cada parte: cubra todos os lados (frente, costas, topo, base).',
  ].join('\n');
  const secondScene = await callNim(reinforcedPrompt, 0.5, 6000);

  if (isOverlySimpleScene(secondScene)) {
    const retryPrompt = [
      prompt,
      'A composicao ainda esta simples. Reescreva pensando em camadas: base, corpo principal, membros/detalhes e acabamentos.',
      'Retorne 4 a 7 objetos, cada um com 30-60 vertices e 60-120 faces.',
      'Use parentName para hierarquia e varie materiais entre as partes.',
      'Garanta que as faces formam superficies fechadas (sem buracos).',
    ].join('\n');

    return callNim(retryPrompt, 0.55, 6500);
  }

  return secondScene;
}
