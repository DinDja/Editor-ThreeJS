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

const cleanList = (value: unknown, maxItems = 8, maxText = 360): string[] =>
  Array.isArray(value)
    ? value.slice(0, maxItems).map((item) => cleanText(item, '', maxText)).filter(Boolean)
    : [];

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
    lesson = {
      title: cleanText(raw.title, 'Aula interativa', 120),
      subjectId: cleanText(raw.subjectId, 'general', 80),
      subjectName: cleanText(raw.subjectName, 'Conhecimentos gerais', 80),
      topic: cleanText(raw.topic, 'Tema de estudo', 180),
      level,
      objective: cleanText(raw.objective, 'Compreender o tema por meio de explicação e prática.', 360),
      explanation,
      prerequisites: cleanList(raw.prerequisites, 5),
      objectives: cleanList(raw.objectives, 6),
      steps,
      activities,
      questions,
      actions: normalizeTeacherActions(raw.actions),
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
  return {
    reply,
    ...(lesson ? { lesson } : {}),
    actions: normalizeTeacherActions(value.actions),
    ...(assessment ? { assessment } : {}),
    ...(modelInfo ? { modelInfo } : {}),
  };
};

const normalizeLevel = (value: unknown): LearningLevel =>
  levels.includes(value as LearningLevel) ? (value as LearningLevel) : 'beginner';

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
