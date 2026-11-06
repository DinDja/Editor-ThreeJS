export const DEFAULT_TEACHER_MODEL_ID = 'nvidia/nemotron-3.5-super-vl-120b-a12b' as const;

export const TEACHER_MODELS = [
  {
    id: DEFAULT_TEACHER_MODEL_ID,
    name: 'Nemotron 3.5 Super VL 120B',
    description: 'Equilíbrio recomendado para aulas, raciocínio e conteúdo multimodal.',
    badge: 'Recomendado',
    apiAvailable: true,
  },
  {
    id: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    name: 'Nemotron 3.5 Lightning 30B A3B',
    description: 'Resposta rápida para conversa e feedback formativo.',
    badge: 'Mais rápido',
    apiAvailable: true,
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b',
    name: 'Nemotron 3 Ultra 550B A55B',
    description: 'Raciocínio avançado, tarefas complexas e português brasileiro.',
    badge: 'Raciocínio avançado',
    apiAvailable: true,
  },
] as const;

export type TeacherModelId = (typeof TEACHER_MODELS)[number]['id'];
export type AvailableTeacherModelId =
  | typeof DEFAULT_TEACHER_MODEL_ID
  | 'nvidia/nemotron-3.5-lightning-30b-a3b'
  | 'nvidia/nemotron-3-ultra-550b-a55b';

export const isAvailableTeacherModelId = (value: unknown): value is AvailableTeacherModelId =>
  TEACHER_MODELS.some((model) => model.id === value && model.apiAvailable);
