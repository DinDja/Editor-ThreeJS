export const DEFAULT_TEACHER_MODEL_ID = 'nvidia/nemotron-3.5-super-vl-120b-a12b' as const;

export const TEACHER_MODELS = [
  {
    id: DEFAULT_TEACHER_MODEL_ID,
    provider: 'nvidia',
    name: 'Nemotron 3.5 Super VL 120B',
    description: 'Equilíbrio recomendado para aulas, raciocínio e conteúdo multimodal.',
    badge: 'Recomendado',
    apiAvailable: true,
  },
  {
    id: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    provider: 'nvidia',
    name: 'Nemotron 3.5 Lightning 30B A3B',
    description: 'Resposta rápida para conversa e feedback formativo.',
    badge: 'Mais rápido',
    apiAvailable: true,
  },
  {
    id: 'nvidia/nemotron-3.5-bolt-e4b',
    provider: 'nvidia',
    name: 'Nemotron 3.5 Bolt E4B',
    description: 'Opção NVIDIA compacta para respostas rápidas e chat.',
    badge: 'Mais rápido',
    apiAvailable: true,
  },
  {
    id: 'nvidia/nemotron-3-nano-30b-a3b',
    provider: 'nvidia',
    name: 'Nemotron 3 Nano 30B A3B',
    description: 'Modelo MoE eficiente para respostas ágeis e raciocínio.',
    badge: 'Rápido',
    apiAvailable: true,
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b',
    provider: 'nvidia',
    name: 'Nemotron 3 Ultra 550B A55B',
    description: 'Raciocínio avançado, tarefas complexas e português brasileiro.',
    badge: 'Raciocínio avançado',
    apiAvailable: true,
  },
  {
    id: 'moonshotai/kimi-k3.1-pro',
    provider: 'nvidia',
    name: 'Kimi K3.1 Pro',
    description: 'Raciocínio avançado para programação, agentes e modelagem 3D.',
    badge: 'NVIDIA NIM',
    apiAvailable: true,
  },
  {
    id: 'glm-4.7-flash',
    provider: 'zai',
    name: 'GLM-4.7-Flash',
    description: 'Modelo gratuito para aulas e conversa.',
    badge: 'Gratuito',
    apiAvailable: true,
  },
  {
    id: 'glm-4.5-flash',
    provider: 'zai',
    name: 'GLM-4.5-Flash',
    description: 'Alternativa gratuita para respostas.',
    badge: 'Gratuito',
    apiAvailable: true,
  },
] as const;

export type GeminiTeacherModelId = `gemini/${string}`;

export type GeminiTeacherModel = {
  id: GeminiTeacherModelId;
  provider: 'gemini';
  name: string;
  description: string;
  badge: 'Gemini API';
  apiAvailable: true;
};

export type TeacherProvider = 'nvidia' | 'zai';
export type TeacherModelOption = (typeof TEACHER_MODELS)[number];
export type TeacherModelId = (typeof TEACHER_MODELS)[number]['id'];
export type AvailableTeacherModelId = Extract<
  (typeof TEACHER_MODELS)[number],
  { apiAvailable: true }
>['id'];

export const isGeminiTeacherModelId = (value: unknown): value is GeminiTeacherModelId =>
  typeof value === 'string' && /^gemini\/[A-Za-z0-9._-]+$/.test(value);

export const isAvailableTeacherModelId = (value: unknown): value is AvailableTeacherModelId =>
  TEACHER_MODELS.some((model) => model.id === value && model.apiAvailable);
