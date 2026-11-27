import {
  DEFAULT_TEACHER_MODEL_ID,
  isAvailableTeacherModelId,
  type AvailableTeacherModelId,
} from './models.ts';

export type LearningLevel = 'beginner' | 'intermediate' | 'advanced';
export type LearningSessionStatus = 'active' | 'paused' | 'completed';
export type LessonStepKind = 'explanation' | 'demonstration' | 'practice' | 'reflection';
export type LearningActivityKind =
  | 'guided-exploration'
  | 'experiment'
  | 'construction'
  | 'identification'
  | 'problem-solving'
  | 'quiz'
  | 'project'
  | 'review';
export const TEACHER_ACTION_TYPES = ['geometry_demo', 'gravity_experiment'] as const;
export type TeacherActionType = (typeof TEACHER_ACTION_TYPES)[number];
export type AssessmentResult = 'correct' | 'partial' | 'incorrect';

export type LearningSubject = {
  id: string;
  name: string;
  description: string;
  topics: string[];
};

export type LearningResourceKind = 'video' | 'reference' | 'search';

export type LearningResource = {
  id: string;
  provider: string;
  kind: LearningResourceKind;
  title: string;
  description: string;
  url: string;
  thumbnailUrl?: string;
  author?: string;
};

export type LearningWikipediaImage = {
  fileTitle: string;
  url: string;
  thumbnailUrl: string;
  filePageUrl: string;
  caption: string;
  artist?: string;
  license?: string;
  licenseUrl?: string;
};

export type LearningWikipediaArticle = {
  title: string;
  url: string;
  excerpt: string;
  images: LearningWikipediaImage[];
};

export type LearningResearch = {
  query: string;
  searchedAt: string;
  providers: string[];
  resources: LearningResource[];
  wikipediaArticles?: LearningWikipediaArticle[];
};

export type TeacherActionSuggestion = {
  id: string;
  type: TeacherActionType;
  label: string;
  description: string;
};

export type TeacherLessonStep = {
  id: string;
  title: string;
  content: string;
  kind: LessonStepKind;
};

export type TeacherQuestion = {
  id: string;
  prompt: string;
  learningObjective: string;
};

export type TeacherActivity = {
  id: string;
  title: string;
  kind: LearningActivityKind;
  instructions: string;
  questionIds: string[];
};

export const TEACHER_MIND_MAP_KINDS = [
  'concept',
  'definition',
  'example',
  'application',
  'contrast',
  'memory',
] as const;
export type TeacherMindMapNodeKind = (typeof TEACHER_MIND_MAP_KINDS)[number];
export type MindMapMark = 'review' | 'mastered';

export type TeacherMindMapNode = {
  id: string;
  label: string;
  summary: string;
  kind: TeacherMindMapNodeKind;
  children: TeacherMindMapNode[];
};

export type TeacherLessonPlan = {
  title: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  level: LearningLevel;
  objective: string;
  explanation: string;
  prerequisites: string[];
  objectives: string[];
  steps: TeacherLessonStep[];
  activities: TeacherActivity[];
  questions: TeacherQuestion[];
  actions: TeacherActionSuggestion[];
  mindMap: TeacherMindMapNode;
  resources?: LearningResource[];
  wikipediaArticles?: LearningWikipediaArticle[];
};

export type TeacherLessonUpdate = {
  explanation?: string;
  addQuestions?: TeacherQuestion[];
  mindMap?: TeacherMindMapNode;
};

export type TeacherAssessment = {
  result: AssessmentResult;
  feedback: string;
  hint: string;
  understood: string[];
  revisit: string[];
};

export type TeacherModelFailure = {
  modelId: string;
  modelName: string;
  provider: string;
  reasonCode: string;
};

export type TeacherModelInfo = {
  requestedModelId: string;
  requestedModelName: string;
  respondedModelId: string;
  respondedModelName: string;
  didFailover: boolean;
  failedAttempts: TeacherModelFailure[];
};

export type TeacherApiResponse = {
  reply: string;
  lesson?: TeacherLessonPlan;
  actions?: TeacherActionSuggestion[];
  assessment?: TeacherAssessment;
  modelInfo?: TeacherModelInfo;
  research?: LearningResearch;
  lessonUpdate?: TeacherLessonUpdate;
};

export type LearningMessage = {
  id: string;
  role: 'teacher' | 'student';
  content: string;
  createdAt: string;
  assessment?: TeacherAssessment;
  modelInfo?: TeacherModelInfo;
};

export type LearningSession = {
  id: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  level: LearningLevel;
  status: LearningSessionStatus;
  lesson: TeacherLessonPlan | null;
  completedStepIds: string[];
  completedQuestionIds: string[];
  appliedActionIds: string[];
  mindMapMarks: Record<string, MindMapMark>;
  mindMapNotes: Record<string, string>;
  startedAt: string;
  updatedAt: string;
};

export type LearningSessionSummary = {
  id: string;
  subjectName: string;
  topic: string;
  status: LearningSessionStatus;
  completedAt: string;
};

export type LearningProjectState = {
  schemaVersion: 2;
  modelId: AvailableTeacherModelId;
  currentSession: LearningSession | null;
  messages: LearningMessage[];
  history: LearningSessionSummary[];
};

export type TeacherRequest = {
  mode: 'lesson' | 'chat' | 'assess';
  modelId?: AvailableTeacherModelId;
  subjectId: string;
  subjectName: string;
  topic: string;
  level: LearningLevel;
  messages?: Array<{ role: 'teacher' | 'student'; content: string }>;
  prompt?: string;
  question?: TeacherQuestion;
  answer?: string;
  progress?: {
    currentStepTitle: string;
    completedSteps: number;
    completedQuestions: number;
    appliedDemonstrations: number;
  };
  lessonContext?: Partial<TeacherLessonPlan>;
  scene?: Array<{
    name: string;
    kind: string;
    primitive?: string;
    position?: [number, number, number];
    selected: boolean;
  }>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cleanText = (value: unknown, fallback = '', max = 1800) =>
  typeof value === 'string' ? value.trim().slice(0, max) : fallback;

const cleanHttpUrl = (value: unknown, max = 700) => {
  const candidate = cleanText(value, '', max);
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString().slice(0, max) : '';
  } catch {
    return '';
  }
};

const cleanList = (value: unknown, maxItems = 8, maxText = 360): string[] =>
  Array.isArray(value)
    ? value.slice(0, maxItems).map((item) => cleanText(item, '', maxText)).filter(Boolean)
    : [];

export const normalizeLearningResources = (value: unknown): LearningResource[] => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const url = cleanHttpUrl(item.url);
    const title = cleanText(item.title, '', 180);
    if (!url || !title) return [];
    const kind: LearningResourceKind = ['video', 'reference', 'search'].includes(item.kind as string)
      ? (item.kind as LearningResourceKind)
      : 'reference';
    return [{
      id: cleanText(item.id, `resource-${index + 1}`, 100),
      provider: cleanText(item.provider, 'Fonte externa', 80),
      kind,
      title,
      description: cleanText(item.description, 'Material complementar para aprofundar o tema.', 420),
      url,
      ...(cleanHttpUrl(item.thumbnailUrl) ? { thumbnailUrl: cleanHttpUrl(item.thumbnailUrl) } : {}),
      ...(cleanText(item.author, '', 120) ? { author: cleanText(item.author, '', 120) } : {}),
    }];
  });
};

const normalizeLearningWikipediaArticles = (value: unknown): LearningWikipediaArticle[] => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 1).flatMap((item) => {
    if (!isRecord(item)) return [];
    const title = cleanText(item.title, '', 180);
    const url = cleanHttpUrl(item.url);
    const excerpt = cleanText(item.excerpt, '', 8000);
    if (!title || !url || !excerpt) return [];

    const seenImageTitles = new Set<string>();
    const images: LearningWikipediaImage[] = Array.isArray(item.images)
      ? item.images.slice(0, 24).flatMap((image) => {
        if (!isRecord(image)) return [];
        const fileTitle = cleanText(image.fileTitle, '', 180);
        const imageUrl = cleanHttpUrl(image.url);
        const thumbnailUrl = cleanHttpUrl(image.thumbnailUrl);
        const filePageUrl = cleanHttpUrl(image.filePageUrl);
        if (!fileTitle || !imageUrl || !thumbnailUrl || !filePageUrl) return [];
        const imageKey = fileTitle
          .replace(/^(?:File|Ficheiro|Arquivo):/i, '')
          .replace(/_/g, ' ')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('pt-BR')
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();
        if (seenImageTitles.has(imageKey)) return [];
        seenImageTitles.add(imageKey);
        const caption = cleanText(image.caption, fileTitle.replace(/^File:/i, ''), 320);
        const artist = cleanText(image.artist, '', 180);
        const license = cleanText(image.license, '', 80);
        const licenseUrl = cleanHttpUrl(image.licenseUrl);
        return [{
          fileTitle,
          url: imageUrl,
          thumbnailUrl,
          filePageUrl,
          caption,
          ...(artist ? { artist } : {}),
          ...(license ? { license } : {}),
          ...(licenseUrl ? { licenseUrl } : {}),
        }];
      }).slice(0, 6)
      : [];

    return [{ title, url, excerpt, images }];
  });
};

export const normalizeLearningResearch = (value: unknown): LearningResearch | undefined => {
  if (!isRecord(value)) return undefined;
  const resources = normalizeLearningResources(value.resources);
  const wikipediaArticles = normalizeLearningWikipediaArticles(value.wikipediaArticles);
  if (resources.length === 0 && wikipediaArticles.length === 0) return undefined;
  return {
    query: cleanText(value.query, 'Tema da aula', 180),
    searchedAt: cleanText(value.searchedAt, new Date().toISOString(), 40),
    providers: cleanList(value.providers, 8, 80),
    resources,
    ...(wikipediaArticles.length > 0 ? { wikipediaArticles } : {}),
  };
};

type MindMapNormalizationState = {
  count: number;
  ids: Set<string>;
};

const mindMapKindAliases: Record<string, TeacherMindMapNodeKind> = {
  concept: 'concept',
  conceito: 'concept',
  definition: 'definition',
  definicao: 'definition',
  definição: 'definition',
  example: 'example',
  exemplo: 'example',
  application: 'application',
  aplicacao: 'application',
  aplicação: 'application',
  contrast: 'contrast',
  contraste: 'contrast',
  confusion: 'contrast',
  confusao: 'contrast',
  confusão: 'contrast',
  warning: 'contrast',
  memory: 'memory',
  memoria: 'memory',
  memória: 'memory',
  mnemonic: 'memory',
  mnemônica: 'memory',
};

const normalizeMindMapKind = (value: unknown): TeacherMindMapNodeKind => {
  if (typeof value !== 'string') return 'concept';
  const normalized = value.trim().toLocaleLowerCase('pt-BR');
  return mindMapKindAliases[normalized] ?? 'concept';
};

const normalizeMindMapNode = (
  value: unknown,
  fallbackId: string,
  depth: number,
  state: MindMapNormalizationState,
): TeacherMindMapNode | undefined => {
  if (!isRecord(value) || depth > 3 || state.count >= 32) return undefined;
  const label = cleanText(value.label ?? value.title, '', 140);
  if (!label) return undefined;

  const requestedId = cleanText(value.id, fallbackId, 80) || fallbackId;
  let id = requestedId;
  let suffix = 2;
  while (state.ids.has(id)) id = `${requestedId}-${suffix++}`;
  state.ids.add(id);
  state.count += 1;

  const children = Array.isArray(value.children)
    ? value.children.slice(0, 6).flatMap((child, index) => {
        const normalized = normalizeMindMapNode(child, `${id}-${index + 1}`, depth + 1, state);
        return normalized ? [normalized] : [];
      })
    : [];
  return {
    id,
    label,
    summary: cleanText(value.summary ?? value.description, 'Conecte esta ideia ao tema central.', 320),
    kind: normalizeMindMapKind(value.kind ?? value.type),
    children,
  };
};

const createFallbackMindMap = (
  topic: string,
  objective: string,
  objectives: string[],
  prerequisites: string[],
  steps: TeacherLessonStep[],
): TeacherMindMapNode => ({
  id: 'mind-map-root',
  label: topic || 'Mapa da aula',
  summary: objective || 'Visão geral dos conceitos estudados nesta aula.',
  kind: 'concept',
  children: [
    ...(objectives.length > 0 ? [{
      id: 'mind-map-ideas',
      label: 'Ideias-chave',
      summary: 'Os pontos centrais que organizam a compreensão do tema.',
      kind: 'definition' as const,
      children: objectives.slice(0, 5).map((item, index) => ({
        id: `mind-map-idea-${index + 1}`,
        label: item,
        summary: 'Retome esta ideia usando a explicação principal da aula.',
        kind: 'definition' as const,
        children: [],
      })),
    }] : []),
    ...(steps.length > 0 ? [{
      id: 'mind-map-path',
      label: 'Roteiro de aprendizagem',
      summary: 'A sequência sugerida para transformar o conceito em compreensão e prática.',
      kind: 'application' as const,
      children: steps.slice(0, 5).map((step) => ({
        id: `mind-map-${step.id}`,
        label: step.title,
        summary: step.content,
        kind: 'application' as const,
        children: [],
      })),
    }] : []),
    ...(prerequisites.length > 0 ? [{
      id: 'mind-map-prerequisites',
      label: 'Pré-requisitos',
      summary: 'Conhecimentos que ajudam a acompanhar a aula.',
      kind: 'memory' as const,
      children: prerequisites.slice(0, 4).map((item, index) => ({
        id: `mind-map-prerequisite-${index + 1}`,
        label: item,
        summary: 'Se necessário, revise este ponto antes de avançar.',
        kind: 'memory' as const,
        children: [],
      })),
    }] : []),
  ],
});

export const normalizeTeacherLessonUpdate = (value: unknown): TeacherLessonUpdate | undefined => {
  if (!isRecord(value)) return undefined;
  const explanation = cleanText(value.explanation, '', 7000);
  const addQuestions = Array.isArray(value.addQuestions)
    ? value.addQuestions.slice(0, 6).flatMap((question, index) => {
        if (!isRecord(question)) return [];
        const prompt = cleanText(question.prompt, '', 420);
        if (!prompt) return [];
        return [{
          id: cleanText(question.id, `question-addition-${index + 1}`, 80),
          prompt,
          learningObjective: cleanText(question.learningObjective, 'Verificar a compreensão do tema.', 220),
        }];
      })
    : [];
  const rawMindMap = isRecord(value.mindMap) && isRecord(value.mindMap.root) ? value.mindMap.root : value.mindMap;
  const mindMap = normalizeMindMapNode(rawMindMap, 'mind-map-root', 0, { count: 0, ids: new Set<string>() });
  if (!explanation && addQuestions.length === 0 && !mindMap) return undefined;
  return {
    ...(explanation ? { explanation } : {}),
    ...(addQuestions.length > 0 ? { addQuestions } : {}),
    ...(mindMap ? { mindMap } : {}),
  };
};

const levels: LearningLevel[] = ['beginner', 'intermediate', 'advanced'];
const stepKinds: LessonStepKind[] = ['explanation', 'demonstration', 'practice', 'reflection'];
const activityKinds: LearningActivityKind[] = [
  'guided-exploration',
  'experiment',
  'construction',
  'identification',
  'problem-solving',
  'quiz',
  'project',
  'review',
];

export const normalizeTeacherActions = (value: unknown): TeacherActionSuggestion[] => {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 4)
    .flatMap((item, index) => {
      if (!isRecord(item) || !TEACHER_ACTION_TYPES.includes(item.type as TeacherActionType)) return [];
      const label = cleanText(item.label, '', 80);
      const description = cleanText(item.description, '', 240);
      if (!label || !description) return [];
      return [{
        id: cleanText(item.id, `teacher-action-${index + 1}`, 80),
        type: item.type as TeacherActionType,
        label,
        description,
      }];
    });
};

const normalizeTeacherModelInfo = (value: unknown): TeacherModelInfo | undefined => {
  if (!isRecord(value)) return undefined;
  const requestedModelId = cleanText(value.requestedModelId, '', 180);
  const requestedModelName = cleanText(value.requestedModelName, requestedModelId, 180);
  const respondedModelId = cleanText(value.respondedModelId, '', 180);
  const respondedModelName = cleanText(value.respondedModelName, respondedModelId, 180);
  if (!requestedModelId || !respondedModelId) return undefined;
  const failedAttempts: TeacherModelFailure[] = Array.isArray(value.failedAttempts)
    ? value.failedAttempts.slice(0, 5).flatMap((attempt) => {
        if (!isRecord(attempt)) return [];
        const modelId = cleanText(attempt.modelId, '', 180);
        if (!modelId) return [];
        return [{
          modelId,
          modelName: cleanText(attempt.modelName, modelId, 180),
          provider: cleanText(attempt.provider, 'unknown', 40),
          reasonCode: cleanText(attempt.reasonCode, 'unknown', 80),
        }];
      })
    : [];
  return {
    requestedModelId,
    requestedModelName,
    respondedModelId,
    respondedModelName,
    didFailover: value.didFailover === true || respondedModelId !== requestedModelId,
    failedAttempts,
  };
};

export const normalizeTeacherResponse = (value: unknown): TeacherApiResponse => {
  if (!isRecord(value)) throw new Error('O professor retornou uma resposta inválida.');
  const reply = cleanText(value.reply, '', 2400);
  if (!reply) throw new Error('O professor retornou uma resposta vazia.');

  let lesson: TeacherLessonPlan | undefined;
  if (isRecord(value.lesson)) {
    const raw = value.lesson;
    const rawSteps = Array.isArray(raw.steps) ? raw.steps.slice(0, 8) : [];
    const steps: TeacherLessonStep[] = rawSteps.flatMap((step, index) => {
      if (!isRecord(step)) return [];
      const title = cleanText(step.title, '', 100);
      const content = cleanText(step.content, '', 1100);
      if (!title || !content) return [];
      return [{
        id: cleanText(step.id, `step-${index + 1}`, 80),
        title,
        content,
        kind: stepKinds.includes(step.kind as LessonStepKind) ? (step.kind as LessonStepKind) : 'explanation',
      }];
    });
    const rawQuestions = Array.isArray(raw.questions) ? raw.questions.slice(0, 6) : [];
    const questions: TeacherQuestion[] = rawQuestions.flatMap((question, index) => {
      if (!isRecord(question)) return [];
      const prompt = cleanText(question.prompt, '', 420);
      if (!prompt) return [];
      return [{
        id: cleanText(question.id, `question-${index + 1}`, 80),
        prompt,
        learningObjective: cleanText(question.learningObjective, 'Verificar a compreensão do tema.', 220),
      }];
    });
    const rawActivities = Array.isArray(raw.activities) ? raw.activities.slice(0, 5) : [];
    const activities: TeacherActivity[] = rawActivities.flatMap((activity, index) => {
      if (!isRecord(activity)) return [];
      const title = cleanText(activity.title, '', 100);
      const instructions = cleanText(activity.instructions, '', 640);
      if (!title || !instructions) return [];
      const questionIds = Array.isArray(activity.questionIds)
        ? activity.questionIds.map((id) => cleanText(id, '', 80)).filter(Boolean).slice(0, 6)
        : [];
      return [{
        id: cleanText(activity.id, `activity-${index + 1}`, 80),
        title,
        instructions,
        questionIds,
        kind: activityKinds.includes(activity.kind as LearningActivityKind)
          ? (activity.kind as LearningActivityKind)
          : 'guided-exploration',
      }];
    });
    const level = levels.includes(raw.level as LearningLevel) ? (raw.level as LearningLevel) : 'beginner';
    const explanation = cleanText(raw.explanation, '', 7000) || steps.map((step) => step.content).join('\n\n');
    const resources = normalizeLearningResources(raw.resources);
    const wikipediaArticles = normalizeLearningWikipediaArticles(raw.wikipediaArticles);
    const title = cleanText(raw.title, 'Aula interativa', 120);
    const topic = cleanText(raw.topic, 'Tema de estudo', 180);
    const objective = cleanText(raw.objective, 'Compreender o tema por meio de explicação e prática.', 360);
    const prerequisites = cleanList(raw.prerequisites, 5);
    const objectives = cleanList(raw.objectives, 6);
    const rawMindMap = isRecord(raw.mindMap) && isRecord(raw.mindMap.root) ? raw.mindMap.root : raw.mindMap;
    const mindMap = normalizeMindMapNode(rawMindMap, 'mind-map-root', 0, { count: 0, ids: new Set<string>() })
      ?? createFallbackMindMap(topic, objective, objectives, prerequisites, steps);
    lesson = {
      title,
      subjectId: cleanText(raw.subjectId, 'general', 80),
      subjectName: cleanText(raw.subjectName, 'Conhecimentos gerais', 80),
      topic,
      level,
      objective,
      explanation,
      prerequisites,
      objectives,
      steps,
      activities,
      questions,
      actions: normalizeTeacherActions(raw.actions),
      mindMap,
      ...(resources.length > 0 ? { resources } : {}),
      ...(wikipediaArticles.length > 0 ? { wikipediaArticles } : {}),
    };
    if (steps.length === 0) throw new Error('O plano de aula veio sem etapas válidas. Tente novamente.');
  }

  let assessment: TeacherAssessment | undefined;
  if (isRecord(value.assessment)) {
    const result = ['correct', 'partial', 'incorrect'].includes(value.assessment.result as string)
      ? (value.assessment.result as AssessmentResult)
      : 'partial';
    assessment = {
      result,
      feedback: cleanText(value.assessment.feedback, 'Vamos analisar essa resposta juntos.', 1000),
      hint: cleanText(value.assessment.hint, '', 420),
      understood: cleanList(value.assessment.understood, 5, 240),
      revisit: cleanList(value.assessment.revisit, 5, 240),
    };
  }

  const modelInfo = normalizeTeacherModelInfo(value.modelInfo);
  const research = normalizeLearningResearch(value.research);
  const lessonUpdate = normalizeTeacherLessonUpdate(value.lessonUpdate);
  return {
    reply,
    ...(lesson ? { lesson } : {}),
    actions: normalizeTeacherActions(value.actions),
    ...(assessment ? { assessment } : {}),
    ...(modelInfo ? { modelInfo } : {}),
    ...(research ? { research } : {}),
    ...(lessonUpdate ? { lessonUpdate } : {}),
  };
};

const normalizeLevel = (value: unknown): LearningLevel =>
  levels.includes(value as LearningLevel) ? (value as LearningLevel) : 'beginner';

const MIND_MAP_MARK_VALUES = ['review', 'mastered'] as const;

const normalizeMindMapMarks = (value: unknown): Record<string, MindMapMark> => {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value).flatMap(([rawId, rawMark]) => {
    const id = cleanText(rawId, '', 80);
    if (!id || !MIND_MAP_MARK_VALUES.includes(rawMark as MindMapMark)) return [];
    return [[id, rawMark as MindMapMark] as const];
  });
  return Object.fromEntries(entries.slice(-64));
};

const normalizeMindMapNotes = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value).flatMap(([rawId, rawNote]) => {
    const id = cleanText(rawId, '', 80);
    const note = cleanText(rawNote, '', 360);
    if (!id || !note) return [];
    return [[id, note] as const];
  });
  return Object.fromEntries(entries.slice(-64));
};

export const createInitialLearningProject = (): LearningProjectState => ({
  schemaVersion: 2,
  modelId: DEFAULT_TEACHER_MODEL_ID,
  currentSession: null,
  messages: [],
  history: [],
});

export const normalizeLearningProject = (value: unknown): LearningProjectState => {
  if (!isRecord(value)) return createInitialLearningProject();
  let currentSession: LearningSession | null = null;
  if (isRecord(value.currentSession)) {
    const raw = value.currentSession;
    const subjectName = cleanText(raw.subjectName, 'Conhecimentos gerais', 80);
    const topic = cleanText(raw.topic, '', 180);
    if (topic) {
      let lesson: TeacherLessonPlan | null = null;
      if (raw.lesson) {
        try {
          lesson = normalizeTeacherResponse({ reply: 'Plano carregado.', lesson: raw.lesson }).lesson ?? null;
        } catch {
          lesson = null;
        }
      }
      const status: LearningSessionStatus = ['active', 'paused', 'completed'].includes(raw.status as string)
        ? (raw.status as LearningSessionStatus)
        : 'active';
      const now = new Date().toISOString();
      currentSession = {
        id: cleanText(raw.id, `learning-${Date.now()}`, 100),
        subjectId: cleanText(raw.subjectId, 'general', 80),
        subjectName,
        topic,
        level: normalizeLevel(raw.level),
        status,
        lesson,
        completedStepIds: cleanList(raw.completedStepIds, 30, 80),
        completedQuestionIds: cleanList(raw.completedQuestionIds, 20, 80),
        appliedActionIds: cleanList(raw.appliedActionIds, 8, 80),
        mindMapMarks: normalizeMindMapMarks(raw.mindMapMarks),
        mindMapNotes: normalizeMindMapNotes(raw.mindMapNotes),
        startedAt: cleanText(raw.startedAt, now, 40),
        updatedAt: cleanText(raw.updatedAt, now, 40),
      };
    }
  }
  const messages: LearningMessage[] = Array.isArray(value.messages)
    ? value.messages.slice(-40).flatMap((message, index) => {
        if (!isRecord(message) || !['teacher', 'student'].includes(message.role as string)) return [];
        const content = cleanText(message.content, '', 2400);
        if (!content) return [];
        let assessment: TeacherAssessment | undefined;
        if (isRecord(message.assessment)) {
          try {
            assessment = normalizeTeacherResponse({ reply: 'Feedback.', assessment: message.assessment }).assessment;
          } catch {
            assessment = undefined;
          }
        }
        const modelInfo = normalizeTeacherModelInfo(message.modelInfo);
        return [{
          id: cleanText(message.id, `message-${index + 1}`, 100),
          role: message.role as LearningMessage['role'],
          content,
          createdAt: cleanText(message.createdAt, new Date().toISOString(), 40),
          ...(assessment ? { assessment } : {}),
          ...(modelInfo ? { modelInfo } : {}),
        }];
      })
    : [];
  const history: LearningSessionSummary[] = Array.isArray(value.history)
    ? value.history.slice(-30).flatMap((item, index) => {
        if (!isRecord(item)) return [];
        const topic = cleanText(item.topic, '', 180);
        if (!topic) return [];
        return [{
          id: cleanText(item.id, `history-${index + 1}`, 100),
          subjectName: cleanText(item.subjectName, 'Conhecimentos gerais', 80),
          topic,
          status: ['active', 'paused', 'completed'].includes(item.status as string)
            ? (item.status as LearningSessionStatus)
            : 'completed',
          completedAt: cleanText(item.completedAt, new Date().toISOString(), 40),
        }];
      })
    : [];
  return {
    schemaVersion: 2,
    modelId: isAvailableTeacherModelId(value.modelId) ? value.modelId : DEFAULT_TEACHER_MODEL_ID,
    currentSession,
    messages,
    history,
  };
};
