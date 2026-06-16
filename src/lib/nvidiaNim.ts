import 'server-only';
import { jsonrepair } from 'jsonrepair';

const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_QUALITY_MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct';
const DEFAULT_FAST_MODEL = 'meta/llama-3.1-8b-instruct';

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

type ChatCompletionPayload = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const COMPLEX_PROMPT_PATTERN =
  /\b(robo|robot|mecha|personagem|character|veiculo|carro|nave|ship|cidade|city|castelo|dragon|drone|armadura)\b/i;
const ROBOT_PROMPT_PATTERN = /\b(robo|robot|mecha|android|cyborg)\b/i;
const APPLE_PROMPT_PATTERN = /\b(maca|ma\xE7a|apple)\b/i;

const requiresRichComposition = (prompt: string) => COMPLEX_PROMPT_PATTERN.test(prompt);
const isRobotPrompt = (prompt: string) => ROBOT_PROMPT_PATTERN.test(prompt);
const isApplePrompt = (prompt: string) => APPLE_PROMPT_PATTERN.test(prompt);

const isOverlySimpleScene = (scene: NimScene) => {
  const primitiveKinds = new Set(scene.objects.map((object) => object.primitive));
  const editableCount = scene.objects.filter((object) => object.editableMesh).length;
  return scene.objects.length < 5 || primitiveKinds.size < 3 || editableCount === 0;
};

const hasValidRobotComposition = (scene: NimScene) => {
  if (scene.objects.length < 8) return false;
  const withParent = scene.objects.filter((object) => Boolean(object.parentName)).length;
  if (withParent < 4) return false;

  const names = scene.objects.map((object) => object.name.toLowerCase());
  const hasHead = names.some((name) => /cabeca|head/.test(name));
  const hasArm = names.some((name) => /braco|arm/.test(name));
  const hasLeg = names.some((name) => /perna|leg/.test(name));
  const hasTorso = names.some((name) => /tronco|torso|corpo|body/.test(name));

  return hasHead && hasArm && hasLeg && hasTorso;
};

const hasValidAppleComposition = (scene: NimScene) => {
  if (scene.objects.length < 3) return false;
  const hasBody = scene.objects.some((object) => object.primitive === 'sphere');
  const hasStem = scene.objects.some((object) => object.primitive === 'cylinder' || object.primitive === 'cone');
  const hasLeaf = scene.objects.some((object) => /folha|leaf/.test(object.name.toLowerCase()));
  return hasBody && hasStem && hasLeaf;
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
      throw new Error('A IA retornou JSON invalido.');
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
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;
  const maxSpan = Math.max(spanX, spanZ, 0.001);

  const targetSpan = 4;
  const compactScale = maxSpan > targetSpan ? targetSpan / maxSpan : 1;
  const yLift = minY < 0 ? -minY : 0;

  return {
    objects: scene.objects.map((object) => {
      const [x, y, z] = object.position;
      const compactedX = (x - centerX) * compactScale;
      const compactedY = (y + yLift) * compactScale;
      const compactedZ = (z - centerZ) * compactScale;

      return {
        ...object,
        position: [
          round3(Math.max(-6, Math.min(6, compactedX))),
          round3(Math.max(-1, Math.min(8, compactedY))),
          round3(Math.max(-6, Math.min(6, compactedZ))),
        ],
      };
    }),
  };
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
    'Voce gera cenas para um editor 3D com primitivas editaveis.',
    'Responda somente JSON valido, sem markdown.',
    'Formato obrigatorio: {"objects":[{"name":"...","primitive":"box|sphere|cylinder|cone|torus|plane","position":[x,y,z],"rotation":[x,y,z],"scale":[x,y,z],"visible":true,"editableMesh":false,"parentName":"Nome opcional do pai","geometry":{},"material":{"color":"#RRGGBB","metalness":0-1,"roughness":0-1,"emissive":"#RRGGBB","emissiveIntensity":0-5,"opacity":0-1,"textureRepeatX":0.1-8,"textureRepeatY":0.1-8,"textureOffsetX":-2-2,"textureOffsetY":-2-2,"textureRotation":-3.14159-3.14159}}]}',
    'Use geometry de forma especifica por primitiva (box: width/height/depth e segments; sphere: radius/widthSegments/heightSegments; cylinder: radiusTop/radiusBottom/height/radialSegments/heightSegments; cone: radiusBottom/height/radialSegments/heightSegments; torus: radius/tube/radialSegments/tubularSegments; plane: width/height/widthSegments/heightSegments).',
    'Use parentName para criar hierarquia quando fizer sentido e editableMesh=true para objetos que precisem iniciar prontos para modelagem.',
    'Mantenha a composicao compacta e centralizada perto da origem; evite objetos muito distantes entre si.',
    'Se o usuario pedir objetos complexos (ex: robo), sempre decomponha em varias partes: tronco, cabeca, membros, articulacoes e detalhes (nao devolva um unico bloco).',
    'No maximo 12 objetos e valores numericos realistas.',
  ].join(' ');

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
            'Retorne apenas JSON puro no formato: {"objects":[...]} sem markdown e sem explicacoes.',
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
              max_tokens: Math.max(maxTokens, 1800),
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

  const firstScene = await callNim(prompt, 0.25, 1400);
  const needsGuidedComposition = requiresRichComposition(prompt) || isApplePrompt(prompt);
  if (!needsGuidedComposition || !isOverlySimpleScene(firstScene)) {
    return firstScene;
  }

  const reinforcedPrompt = isApplePrompt(prompt)
    ? [
        prompt,
        'IMPORTANTE: para maca, nao use cubo unico.',
        'Retorne entre 3 e 6 objetos: corpo esferico da fruta, talo e folha.',
        'Use sphere para o corpo principal, cylinder ou cone para o talo, e um elemento de folha.',
        'Use parentName para conectar folha/talo ao corpo.',
      ].join('\n')
    : [
        prompt,
        'IMPORTANTE: descreva o objeto em varias pecas funcionais. Retorne entre 6 e 12 objetos.',
        'Inclua pelo menos 3 tipos de primitivas diferentes e marque editableMesh=true nas pecas principais.',
        'Use parentName para montar hierarquia (ex: braco preso ao tronco).',
      ].join('\n');
  const secondScene = await callNim(reinforcedPrompt, 0.35, 1800);

  if (isRobotPrompt(prompt) && !hasValidRobotComposition(secondScene)) {
    const robotRetryPrompt = [
      prompt,
      'REGERAR do zero com mais detalhe. Nao use um unico bloco.',
      'Retorne entre 9 e 12 objetos com cabeca, tronco, dois bracos, duas pernas e detalhes.',
      'Use no minimo 3 tipos de primitivas e hierarquia com parentName.',
      'Marque editableMesh=true nas pecas principais.',
    ].join('\n');

    return callNim(robotRetryPrompt, 0.45, 2200);
  }

  if (isApplePrompt(prompt) && !hasValidAppleComposition(secondScene)) {
    const appleRetryPrompt = [
      prompt,
      'REGERAR do zero em 3 a 6 partes. Nao use cubo unico.',
      'A maca deve ter corpo principal esferico, talo e folha com parentName conectado.',
      'Adicione variacao sutil de escala/rotacao para parecer organica.',
    ].join('\n');

    return callNim(appleRetryPrompt, 0.42, 1900);
  }

  return secondScene;
}
