'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Atom,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  ClipboardCheck,
  Circle,
  CircleCheck,
  Clock3,
  Code2,
  Dna,
  FlaskConical,
  GraduationCap,
  Globe2,
  Landmark,
  Languages,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  Network,
  Palette,
  Pause,
  Play,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { TEACHER_MODELS, type AvailableTeacherModelId } from '@/lib/learning/models';
import { LEARNING_SUBJECTS, findLearningSubject } from '@/lib/learning/subjects';
import {
  normalizeTeacherResponse,
  type LearningLevel,
  type LearningMessage,
  type TeacherActionSuggestion,
  type TeacherApiResponse,
  type TeacherQuestion,
  type TeacherRequest,
} from '@/lib/learning/types';
import { useEditorStore } from '@/store/editorStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useHistoryStore } from '@/store/historyStore';
import { useLearningStore } from '@/store/learningStore';
import { useMaterialStore } from '@/store/materialStore';
import { usePhysicsStore } from '@/store/physicsStore';
import { useSceneStore } from '@/store/sceneStore';
import { DEFAULT_PHYSICS_CONFIG, type PrimitiveKind, type ScenePhysicsConfig } from '@/store/types';

const levelLabels: Record<LearningLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

const quickPrompts = [
  'Explique com um exemplo do cotidiano.',
  'Dê uma pista para eu continuar pensando.',
  'Como isso aparece em outra área do conhecimento?',
];

const subjectIcons: Record<string, LucideIcon> = {
  mathematics: Calculator,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Dna,
  geography: Globe2,
  history: Landmark,
  'arts-design': Palette,
  computing: Code2,
  languages: Languages,
  interdisciplinary: Network,
};

type TeacherModelSelectorProps = {
  modelId: AvailableTeacherModelId;
  onModelChange: (modelId: AvailableTeacherModelId) => void;
};

const TeacherModelSelector = ({ modelId, onModelChange }: TeacherModelSelectorProps) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const selectedModel = TEACHER_MODELS.find((model) => model.id === modelId) ?? TEACHER_MODELS[0];

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !detailsRef.current?.contains(event.target)) {
        detailsRef.current?.removeAttribute('open');
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  return (
    <details ref={detailsRef} className="relative">
      <summary
        aria-label={`Modelo do Professor IA: NVIDIA ${selectedModel.name}`}
        className="flex max-w-64 cursor-pointer list-none items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/50 px-2.5 py-1.5 outline-none transition hover:border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500 [&::-webkit-details-marker]:hidden"
      >
        <NvidiaBrandMark className="size-5 shrink-0" />
        <span className="min-w-0 text-left">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-[#76b900]">NVIDIA · IA</span>
          <span className="block truncate text-[11px] font-medium text-neutral-200">{selectedModel.name}</span>
        </span>
        <ChevronDown size={14} className="shrink-0 text-neutral-500" aria-hidden="true" />
      </summary>
      <div
        role="group"
        aria-label="Modelos NVIDIA disponíveis para o Professor IA"
        className="absolute right-0 top-full z-[80] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-neutral-700 bg-[#17191b] p-1.5 shadow-2xl shadow-black/50"
      >
        <p className="px-2.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Escolha o modelo
        </p>
        {TEACHER_MODELS.map((model) => (
          <button
            key={model.id}
            type="button"
            disabled={!model.apiAvailable}
            aria-pressed={model.id === modelId}
            onClick={() => {
              if (!model.apiAvailable) return;
              onModelChange(model.id);
              if (detailsRef.current) detailsRef.current.open = false;
            }}
            className="flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <NvidiaBrandMark className="mt-0.5 size-6 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#76b900]">NVIDIA Nemotron</span>
                <span className="rounded-full border border-neutral-700 px-1.5 py-0.5 text-[9px] text-neutral-400">{model.badge}</span>
              </span>
              <span className="mt-1 block text-xs font-semibold text-neutral-100">{model.name}</span>
              <span className="mt-1 block text-[11px] leading-4 text-neutral-400">{model.description}</span>
            </span>
            {model.id === modelId && <Check size={15} className="mt-1 shrink-0 text-emerald-300" aria-label="Selecionado" />}
          </button>
        ))}
      </div>
    </details>
  );
};

const NvidiaBrandMark = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.398 0-.787-.062-1.158-.185v-4.346c1.528.185 1.837.857 2.747 2.385l2.04-1.714s-1.492-1.952-4-1.952a6.016 6.016 0 0 0-.796.035m0-4.735v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.08 4.964-8.33 4.964c-.37 0-.733-.035-1.095-.097v1.325c.3.035.61.062.91.062 3.957 0 6.82-2.023 9.593-4.408.459.371 2.34 1.263 2.73 1.652-2.633 2.208-8.772 3.984-12.253 3.984-.335 0-.653-.018-.971-.053v1.864H24V4.063zm0 10.326v1.131c-3.657-.654-4.673-4.46-4.673-4.46s1.758-1.944 4.673-2.262v1.237H8.94c-1.528-.186-2.73 1.245-2.73 1.245s.68 2.412 2.739 3.11M2.456 10.9s2.164-3.197 6.5-3.533V6.201C4.153 6.59 0 10.653 0 10.653s2.35 6.802 8.948 7.42v-1.237c-4.84-.6-6.492-5.936-6.492-5.936z" />
  </svg>
);

const callTeacher = async (request: TeacherRequest): Promise<TeacherApiResponse> => {
  const response = await fetch('/api/ai/teacher', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : 'Não foi possível falar com o Mestre IA.';
    throw new Error(message);
  }
  return normalizeTeacherResponse(payload);
};

const builtInActions = (subjectId: string, topic: string): TeacherActionSuggestion[] => {
  const normalized = topic.toLocaleLowerCase('pt-BR');
  if (subjectId === 'physics' && /gravidade|queda|colis|movimento/.test(normalized)) {
    return [{
      id: 'builtin-gravity-experiment',
      type: 'gravity_experiment',
      label: 'Investigar a queda dos corpos',
      description: 'Montar um piso, uma esfera e um cubo na mesma altura. A cena usará o motor de física Rapier do editor.',
    }];
  }
  if (subjectId === 'mathematics' && /geometr|sólido|volume|área/.test(normalized)) {
    return [{
      id: 'builtin-geometry-demo',
      type: 'geometry_demo',
      label: 'Explorar sólidos geométricos',
      description: 'Adicionar cubo, esfera, cilindro e cone à cena para comparar formas e propriedades.',
    }];
  }
  return [];
};

const addPrimitive = (
  name: string,
  primitive: PrimitiveKind,
  position: [number, number, number],
  color: string,
  scale?: [number, number, number],
  physics?: ScenePhysicsConfig,
) => {
  const sceneStore = useSceneStore.getState();
  const object = sceneStore.addObject({
    name,
    kind: 'primitive',
    primitive,
    position,
    scale: scale ?? [1, 1, 1],
    ...(physics ? { metadata: { physics } } : {}),
  });
  const materials = useMaterialStore.getState();
  const material = materials.createMaterialForObject(object.uuid, object.materialId, `Material · ${name}`);
  materials.updateMaterial(material.uuid, { color, roughness: 0.48 });
  return object;
};

const createGeometryDemo = () => {
  const items = [
    addPrimitive('Cubo · faces planas', 'box', [-3.2, 0.55, 0], '#38bdf8'),
    addPrimitive('Esfera · superfície curva', 'sphere', [-1.1, 0.55, 0], '#a78bfa'),
    addPrimitive('Cilindro · duas bases', 'cylinder', [1.1, 0.55, 0], '#34d399'),
    addPrimitive('Cone · base circular', 'cone', [3.2, 0.55, 0], '#fbbf24'),
  ];
  return items[0];
};

const physicsConfig = (bodyType: 'static' | 'dynamic', colliderType: 'box' | 'sphere'): ScenePhysicsConfig => ({
  ...DEFAULT_PHYSICS_CONFIG,
  enabled: true,
  bodyType,
  colliderType,
  mass: bodyType === 'static' ? 0 : 1,
  friction: 0.65,
  restitution: 0.15,
  lockTranslation: { ...DEFAULT_PHYSICS_CONFIG.lockTranslation },
  lockRotation: { ...DEFAULT_PHYSICS_CONFIG.lockRotation },
});

const createGravityExperiment = () => {
  addPrimitive('Piso estático do experimento', 'box', [0, -0.25, 0], '#64748b', [12, 0.5, 10], physicsConfig('static', 'box'));
  const sphere = addPrimitive('Esfera · massa 1', 'sphere', [-1.2, 4.5, 0], '#38bdf8', [1, 1, 1], physicsConfig('dynamic', 'sphere'));
  addPrimitive('Cubo · massa 1', 'box', [1.2, 4.5, 0], '#fb923c', [1, 1, 1], physicsConfig('dynamic', 'box'));
  return sphere;
};

function MessageBubble({ message }: { message: LearningMessage }) {
  const isTeacher = message.role === 'teacher';
  const assessment = message.assessment;
  const assessmentTone = assessment?.result === 'correct'
    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200'
    : assessment?.result === 'incorrect'
      ? 'border-amber-500/30 bg-amber-500/5 text-amber-100'
      : 'border-sky-500/30 bg-sky-500/5 text-sky-100';
  return (
    <article className={`flex gap-3 ${isTeacher ? '' : 'flex-row-reverse'}`}>
      <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${isTeacher ? 'bg-emerald-400/10 text-emerald-300' : 'bg-sky-400/10 text-sky-300'}`}>
        {isTeacher ? <GraduationCap size={16} /> : <MessageCircle size={15} />}
      </div>
      <div className={`max-w-[min(100%,720px)] rounded-2xl border px-4 py-3 ${isTeacher ? 'border-neutral-800 bg-[#171a1d]' : 'border-sky-900/50 bg-sky-950/25'}`}>
        <div className="mb-1.5 flex items-center justify-between gap-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
          <span>{isTeacher ? 'Mestre IA' : 'Você'}</span>
          <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-neutral-200">{message.content}</p>
        {assessment && (
          <div className={`mt-3 rounded-xl border p-3 ${assessmentTone}`}>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold">
              {assessment.result === 'correct' ? <CircleCheck size={14} /> : <Lightbulb size={14} />}
              {assessment.result === 'correct' ? 'Você compreendeu esta questão' : assessment.result === 'partial' ? 'Tem uma parte importante no caminho' : 'Vamos tentar outro caminho'}
            </div>
            <p className="text-xs leading-5">{assessment.feedback}</p>
            {assessment.hint && <p className="mt-2 text-xs leading-5 text-neutral-300"><strong>Pista:</strong> {assessment.hint}</p>}
            {assessment.understood.length > 0 && <p className="mt-2 text-[11px] text-neutral-400">Já entendeu: {assessment.understood.join(' · ')}</p>}
            {assessment.revisit.length > 0 && <p className="mt-1 text-[11px] text-neutral-400">Vale revisar: {assessment.revisit.join(' · ')}</p>}
          </div>
        )}
      </div>
    </article>
  );
}

function LessonDetails({
  onAskAssessment,
  busyQuestionId,
  answers,
  setAnswer,
  onPrepareAction,
  preparedActionId,
  onApplyAction,
  onCancelAction,
  currentSession,
}: {
  onAskAssessment: (question: TeacherQuestion) => void;
  busyQuestionId: string | null;
  answers: Record<string, string>;
  setAnswer: (id: string, value: string) => void;
  onPrepareAction: (id: string) => void;
  preparedActionId: string | null;
  onApplyAction: (action: TeacherActionSuggestion) => void;
  onCancelAction: () => void;
  currentSession: NonNullable<ReturnType<typeof useLearningStore.getState>['project']['currentSession']>;
}) {
  const lesson = currentSession.lesson;
  if (!lesson) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-[#15181b] p-5 text-sm text-neutral-400">
        A aula está sendo preparada. O plano e as atividades aparecerão aqui.
      </div>
    );
  }
  const doneSteps = new Set(currentSession.completedStepIds);
  const doneQuestions = new Set(currentSession.completedQuestionIds);
  const appliedActions = new Set(currentSession.appliedActionIds);
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-neutral-800 bg-[#15181b] p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
          <BookOpen size={14} /> Plano da aula
        </div>
        <h2 className="text-lg font-semibold text-white">{lesson.title}</h2>
        <p className="mt-1 text-xs text-neutral-500">{lesson.subjectName} · {levelLabels[lesson.level]}</p>
        <div className="mt-4 rounded-xl bg-neutral-900/70 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Objetivo</p>
          <p className="mt-1 text-sm leading-5 text-neutral-200">{lesson.objective}</p>
        </div>
        {lesson.prerequisites.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Para começar</p>
            <ul className="mt-1 space-y-1 text-xs text-neutral-400">
              {lesson.prerequisites.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-[#15181b] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-200"><CircleCheck size={15} className="text-emerald-300" /> Etapas</h3>
        <div className="space-y-2">
          {lesson.steps.map((step, index) => {
            const completed = doneSteps.has(step.id);
            return (
              <button
                type="button"
                key={step.id}
                onClick={() => useLearningStore.getState().markStepComplete(step.id)}
                className={`flex w-full gap-3 rounded-xl border p-3 text-left transition ${completed ? 'border-emerald-900/60 bg-emerald-950/20' : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'}`}
              >
                <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${completed ? 'bg-emerald-400 text-neutral-950' : 'border border-neutral-700 text-neutral-500'}`}>
                  {completed ? <Check size={12} /> : <span className="text-[10px]">{index + 1}</span>}
                </span>
                <span>
                  <span className="block text-xs font-semibold text-neutral-200">{step.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-neutral-400">{step.content}</span>
                  <span className="mt-2 block text-[9px] uppercase tracking-[0.15em] text-neutral-600">{step.kind}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {lesson.actions.length > 0 && (
        <section className="rounded-2xl border border-emerald-900/50 bg-emerald-950/15 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-100"><FlaskConical size={15} /> Aprender no editor</h3>
          <div className="space-y-2">
            {lesson.actions.map((action) => {
              const applied = appliedActions.has(action.id);
              const prepared = preparedActionId === action.id;
              return (
                <div key={action.id} className="rounded-xl border border-emerald-900/50 bg-[#111816] p-3">
                  <p className="text-xs font-semibold text-neutral-100">{action.label}</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-400">{action.description}</p>
                  {action.type === 'gravity_experiment' && <p className="mt-2 text-[10px] text-neutral-500">Prévia: piso estático, esfera e cubo na mesma altura, gravidade do Rapier habilitada.</p>}
                  {action.type === 'geometry_demo' && <p className="mt-2 text-[10px] text-neutral-500">Prévia: quatro sólidos com materiais coloridos e nomes visíveis na árvore da cena.</p>}
                  {applied ? (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300"><CircleCheck size={13} /> Criada na cena</div>
                  ) : prepared ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => onApplyAction(action)} className="rounded-lg bg-emerald-400 px-3 py-2 text-[11px] font-semibold text-neutral-950 hover:bg-emerald-300">Confirmar e criar</button>
                      <button type="button" onClick={onCancelAction} className="rounded-lg border border-neutral-700 px-3 py-2 text-[11px] text-neutral-300 hover:bg-neutral-800">Cancelar</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => onPrepareAction(action.id)} className="mt-3 flex items-center gap-1.5 rounded-lg border border-emerald-700/60 px-3 py-2 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-400/10">Preparar demonstração <ArrowRight size={12} /></button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {lesson.activities.length > 0 && (
        <section className="rounded-2xl border border-neutral-800 bg-[#15181b] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-200"><ClipboardCheck size={15} className="text-amber-300" /> Atividade prática</h3>
          {lesson.activities.map((activity) => (
            <div key={activity.id} className="mb-3 last:mb-0">
              <p className="text-xs font-semibold text-neutral-200">{activity.title}</p>
              <p className="mt-1 text-xs leading-5 text-neutral-400">{activity.instructions}</p>
            </div>
          ))}
        </section>
      )}

      {lesson.questions.length > 0 && (
        <section className="rounded-2xl border border-neutral-800 bg-[#15181b] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-200"><Lightbulb size={15} className="text-amber-300" /> Verifique o que aprendeu</h3>
          <div className="space-y-4">
            {lesson.questions.map((question, index) => {
              const completed = doneQuestions.has(question.id);
              const busy = busyQuestionId === question.id;
              return (
                <div key={question.id} className="border-t border-neutral-800 pt-3 first:border-0 first:pt-0">
                  <div className="flex gap-2 text-xs leading-5 text-neutral-200">
                    {completed ? <CircleCheck size={15} className="mt-0.5 shrink-0 text-emerald-300" /> : <Circle size={15} className="mt-0.5 shrink-0 text-neutral-600" />}
                    <span>{index + 1}. {question.prompt}</span>
                  </div>
                  <textarea
                    aria-label={`Sua resposta para a questão ${index + 1}`}
                    value={answers[question.id] ?? ''}
                    onChange={(event) => setAnswer(question.id, event.target.value)}
                    placeholder="Escreva seu raciocínio..."
                    rows={3}
                    className="mt-2 w-full resize-y rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 text-xs leading-5 text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-emerald-500/60"
                  />
                  <button
                    type="button"
                    onClick={() => onAskAssessment(question)}
                    disabled={busy || !answers[question.id]?.trim()}
                    className="mt-2 flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-2 text-[11px] font-semibold text-neutral-200 transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy ? <LoaderCircle size={13} className="animate-spin" /> : <Check size={13} />}
                    {busy ? 'Analisando resposta' : completed ? 'Responder novamente' : 'Receber feedback'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default function LearningWorkspace() {
  const project = useLearningStore((state) => state.project);
  const setModelId = useLearningStore((state) => state.setModelId);
  const startSession = useLearningStore((state) => state.startSession);
  const addMessage = useLearningStore((state) => state.addMessage);
  const setLesson = useLearningStore((state) => state.setLesson);
  const addActions = useLearningStore((state) => state.addActions);
  const markQuestionComplete = useLearningStore((state) => state.markQuestionComplete);
  const markActionApplied = useLearningStore((state) => state.markActionApplied);
  const setSessionStatus = useLearningStore((state) => state.setSessionStatus);
  const setActiveMode = useExperienceStore((state) => state.setActiveMode);
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const objects = useSceneStore((state) => state.objects);

  const [subjectId, setSubjectId] = useState('general');
  const [level, setLevel] = useState<LearningLevel>('beginner');
  const [topic, setTopic] = useState('');
  const [draft, setDraft] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [homeSessionId, setHomeSessionId] = useState<string | null>(null);
  const [preparedActionId, setPreparedActionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const session = project.currentSession;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [project.messages.length, isSending]);

  const showHome = !session || homeSessionId === session.id;

  const getSceneContext = () => {
    const selected = new Set(selectedObjectIds);
    const chosen = selectedObjectIds.length > 0
      ? objects.filter((object) => selected.has(object.uuid))
      : objects.slice(0, 5);
    return chosen.slice(0, 8).map((object) => ({
      name: object.name,
      kind: object.kind,
      primitive: object.primitive,
      position: object.position,
      selected: selected.has(object.uuid),
    }));
  };

  const teacherHistory = () => useLearningStore.getState().project.messages.slice(-8).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const learningProgress = (current: NonNullable<typeof session>) => ({
    currentStepTitle: current.lesson?.steps.find((step) => !current.completedStepIds.includes(step.id))?.title ?? '',
    completedSteps: current.completedStepIds.length,
    completedQuestions: current.completedQuestionIds.length,
    appliedDemonstrations: current.appliedActionIds.length,
  });

  const requestLesson = async (subject: { id: string; name: string }, lessonTopic: string, lessonLevel: LearningLevel, create = true) => {
    setIsSending(true);
    setError('');
    try {
      const targetSession = create
        ? startSession({ subjectId: subject.id, subjectName: subject.name, topic: lessonTopic, level: lessonLevel })
        : useLearningStore.getState().project.currentSession;
      if (!targetSession) throw new Error('Não há uma sessão para retomar.');
      const result = await callTeacher({
        mode: 'lesson',
        modelId: project.modelId,
        subjectId: targetSession.subjectId,
        subjectName: targetSession.subjectName,
        topic: targetSession.topic,
        level: targetSession.level,
        scene: getSceneContext(),
      });
      if (!result.lesson) throw new Error('O professor não conseguiu montar o plano da aula.');
      const lesson = {
        ...result.lesson,
        actions: result.lesson.actions.length > 0
          ? result.lesson.actions
          : builtInActions(result.lesson.subjectId, targetSession.topic),
      };
      setLesson(lesson);
      addMessage({ role: 'teacher', content: result.reply });
      addActions(result.actions ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível iniciar a aula.');
    } finally {
      setIsSending(false);
    }
  };

  const handleStartLesson = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedSubject = subjectId === 'general'
      ? { id: 'general', name: 'A combinar' }
      : findLearningSubject(subjectId);
    void requestLesson(selectedSubject, topic, level);
  };

  const sendPrompt = async (prompt: string) => {
    const current = useLearningStore.getState().project.currentSession;
    if (!current || !prompt.trim() || isSending) return;
    addMessage({ role: 'student', content: prompt.trim() });
    setDraft('');
    setIsSending(true);
    setError('');
    try {
      const response = await callTeacher({
        mode: 'chat',
        modelId: project.modelId,
        subjectId: current.subjectId,
        subjectName: current.subjectName,
        topic: current.topic,
        level: current.level,
        messages: teacherHistory(),
        prompt: prompt.trim(),
        progress: learningProgress(current),
        scene: getSceneContext(),
      });
      addMessage({ role: 'teacher', content: response.reply });
      addActions(response.actions ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'O professor não conseguiu responder.');
    } finally {
      setIsSending(false);
    }
  };

  const assessAnswer = async (question: TeacherQuestion) => {
    const answer = answers[question.id]?.trim();
    const current = useLearningStore.getState().project.currentSession;
    if (!current || !answer || busyQuestionId) return;
    addMessage({ role: 'student', content: `Minha resposta: ${answer}` });
    setBusyQuestionId(question.id);
    setError('');
    try {
      const response = await callTeacher({
        mode: 'assess',
        modelId: project.modelId,
        subjectId: current.subjectId,
        subjectName: current.subjectName,
        topic: current.topic,
        level: current.level,
        messages: teacherHistory(),
        question,
        answer,
        progress: learningProgress(current),
        scene: getSceneContext(),
      });
      addMessage({ role: 'teacher', content: response.reply, assessment: response.assessment });
      if (response.assessment?.result === 'correct') markQuestionComplete(question.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível avaliar a resposta.');
    } finally {
      setBusyQuestionId(null);
    }
  };

  const applyAction = (action: TeacherActionSuggestion) => {
    useHistoryStore.getState().pushSnapshot();
    usePhysicsStore.getState().stopSimulation();
    let firstObject;
    if (action.type === 'geometry_demo') {
      firstObject = createGeometryDemo();
    } else {
      firstObject = createGravityExperiment();
      usePhysicsStore.getState().setGravityEnabled(true);
      usePhysicsStore.getState().playSimulation();
    }
    useEditorStore.getState().setSelectedObject(firstObject.uuid);
    setActiveTool('translate');
    setActiveMode('scene');
    markActionApplied(action.id);
    setPreparedActionId(null);
  };

  const startNewStudy = () => {
    if (session) setSessionStatus('paused');
    setTopic('');
    setSubjectId('general');
    setHomeSessionId(session?.id ?? null);
    setError('');
  };

  const handleResumeRequest = () => {
    if (!session) return;
    if (session.lesson) {
      setSessionStatus('active');
      setHomeSessionId(null);
      return;
    }
    setHomeSessionId(null);
    void requestLesson({ id: session.subjectId, name: session.subjectName }, session.topic, session.level, false);
  };

  const submitChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendPrompt(draft);
  };

  const selectedSubject = LEARNING_SUBJECTS.find((item) => item.id === subjectId);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0d0f10] text-neutral-100" data-tutorial="learning-workspace">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 bg-[#151719] px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><GraduationCap size={19} /></div>
          <div>
            <p className="text-sm font-semibold text-neutral-100">Mestre IA</p>
            <p className="text-[11px] text-neutral-500">Aprender construindo · várias áreas do conhecimento</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TeacherModelSelector modelId={project.modelId} onModelChange={setModelId} />
          {session && (
            <>
              <span className="hidden max-w-64 truncate rounded-full border border-neutral-800 px-3 py-1.5 text-[11px] text-neutral-400 sm:block">{session.subjectName} · {session.topic}</span>
              <button type="button" onClick={() => setSessionStatus(session.status === 'paused' ? 'active' : 'paused')} className="flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-2 text-[11px] font-medium text-neutral-300 hover:bg-neutral-800">
                {session.status === 'paused' ? <Play size={12} /> : <Pause size={12} />}
                {session.status === 'paused' ? 'Retomar' : 'Pausar'}
              </button>
              <button type="button" onClick={startNewStudy} className="rounded-lg border border-neutral-700 px-3 py-2 text-[11px] font-medium text-neutral-300 hover:bg-neutral-800">Novo estudo</button>
            </>
          )}
        </div>
      </header>

      {showHome || !session ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-900/50 bg-emerald-950/20 px-3 py-1.5 text-[11px] font-medium text-emerald-200"><Lightbulb size={13} /> Aprender fazendo</div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">O que você quer aprender hoje?</h1>
              <p className="mt-3 text-sm leading-6 text-neutral-400">Comece pelo tema. O professor organiza uma aula, propõe atividades e, quando ajudar, prepara uma demonstração dentro do editor.</p>
            </div>

            {project.currentSession && (
              <button type="button" onClick={handleResumeRequest} className="mb-5 flex w-full items-center justify-between rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-4 text-left transition hover:bg-emerald-950/35">
                <span className="flex items-center gap-3"><Clock3 size={18} className="text-emerald-300" /><span><span className="block text-xs font-semibold text-emerald-100">Retomar estudo</span><span className="mt-1 block text-xs text-neutral-400">{project.currentSession.subjectName} · {project.currentSession.topic}</span></span></span>
                <ArrowRight size={16} className="text-emerald-300" />
              </button>
            )}

            <form onSubmit={handleStartLesson} className="rounded-2xl border border-neutral-800 bg-[#15181b] p-4 shadow-xl shadow-black/10 sm:p-6">
              <label htmlFor="learning-topic" className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">Tema de estudo</label>
              <input
                id="learning-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                maxLength={180}
                placeholder="Ex.: quero entender como funciona a gravidade"
                className="h-12 w-full rounded-xl border border-neutral-700 bg-neutral-950/70 px-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-emerald-500/70"
                required
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <label htmlFor="learning-subject" className="mb-2 block text-xs font-medium text-neutral-400">Área do conhecimento <span className="text-neutral-600">(opcional)</span></label>
                  <select id="learning-subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-xs text-neutral-200 outline-none focus:border-emerald-500/60">
                    <option value="general">Deixe o professor escolher</option>
                    {LEARNING_SUBJECTS.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="learning-level" className="mb-2 block text-xs font-medium text-neutral-400">Nível</label>
                  <select id="learning-level" value={level} onChange={(event) => setLevel(event.target.value as LearningLevel)} className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-xs text-neutral-200 outline-none focus:border-emerald-500/60">
                    {(Object.entries(levelLabels) as Array<[LearningLevel, string]>).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>
              {selectedSubject && <p className="mt-2 text-[11px] text-neutral-600">{selectedSubject.description}</p>}
              {error && <p role="alert" className="mt-3 rounded-lg border border-rose-900/50 bg-rose-950/25 px-3 py-2 text-xs text-rose-200">{error}</p>}
              <button type="submit" disabled={isSending || !topic.trim()} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-48">
                {isSending ? <LoaderCircle size={16} className="animate-spin" /> : <BookOpen size={16} />}
                {isSending ? 'Preparando sua aula...' : 'Começar a aprender'}
              </button>
            </form>

            <section className="mt-7">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-neutral-200">Ideias para explorar</h2><span className="text-[10px] text-neutral-600">Escolha um tema ou escreva o seu</span></div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {LEARNING_SUBJECTS.slice(0, 9).map((subject) => {
                  const Icon = subjectIcons[subject.id] ?? BookOpen;
                  return (
                    <button key={subject.id} type="button" onClick={() => { setSubjectId(subject.id); setTopic(subject.topics[0] ?? ''); }} className="group rounded-2xl border border-neutral-800 bg-[#131618] p-4 text-left transition hover:border-emerald-800/60 hover:bg-[#171b1d]">
                      <span className="flex items-center justify-between"><span className="flex size-8 items-center justify-center rounded-lg bg-neutral-800 text-emerald-300"><Icon size={15} /></span><ArrowRight size={14} className="text-neutral-700 transition group-hover:translate-x-0.5 group-hover:text-emerald-300" /></span>
                      <span className="mt-3 block text-xs font-semibold text-neutral-200">{subject.name}</span>
                      <span className="mt-1 block text-[11px] leading-5 text-neutral-500">{subject.topics[0]}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {project.history.length > 0 && (
              <section className="mt-7 rounded-2xl border border-neutral-800 bg-[#131618] p-4">
                <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold text-neutral-300"><Clock3 size={14} className="text-neutral-500" /> Estudos recentes</h2>
                <div className="space-y-2">
                  {[...project.history].reverse().slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-neutral-900/60 px-3 py-2">
                      <span className="min-w-0"><span className="block truncate text-xs text-neutral-300">{item.topic}</span><span className="mt-0.5 block text-[10px] text-neutral-600">{item.subjectName}</span></span>
                      <span className="shrink-0 text-[10px] text-neutral-600">{item.status === 'completed' ? 'Concluído' : 'Pausado'}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
          <section className="flex min-h-[45%] min-w-0 flex-1 flex-col xl:basis-1/2 xl:min-h-0 xl:border-r xl:border-neutral-800">
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-800/80 px-4 py-2.5 lg:px-6">
              <div className="min-w-0"><p className="truncate text-xs font-semibold text-neutral-200">{session.subjectName} · {session.topic}</p><p className="mt-0.5 text-[10px] text-neutral-600">Nível {levelLabels[session.level].toLowerCase()} · {project.messages.length} mensagens</p></div>
              <button type="button" onClick={() => setActiveMode('scene')} className="ml-3 shrink-0 rounded-lg border border-neutral-700 px-3 py-2 text-[10px] font-medium text-neutral-300 hover:border-emerald-700/50 hover:text-emerald-200">Abrir cena</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-8">
              <div className="mx-auto flex max-w-4xl flex-col gap-4">
                {project.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
                {isSending && (
                  <div className="flex items-center gap-3 text-xs text-neutral-500"><span className="flex size-8 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300"><GraduationCap size={15} /></span><LoaderCircle size={14} className="animate-spin" /> O professor está pensando...</div>
                )}
                {error && (
                  <div role="alert" className="ml-11 rounded-xl border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs text-rose-200">
                    <span>{error}</span>
                    {session && !session.lesson && <button type="button" onClick={() => void requestLesson({ id: session.subjectId, name: session.subjectName }, session.topic, session.level, false)} className="ml-3 font-semibold underline underline-offset-2">Tentar novamente</button>}
                  </div>
                )}
                {project.messages.length === 0 && session.lesson && <p className="ml-11 text-xs text-neutral-500">Sua aula está pronta. Comece pela explicação ou escolha uma etapa no plano ao lado.</p>}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="shrink-0 border-t border-neutral-800 bg-[#101214] px-3 py-3 lg:px-6">
              <div className="mx-auto max-w-4xl">
                <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                  {quickPrompts.map((prompt) => <button key={prompt} type="button" disabled={isSending} onClick={() => void sendPrompt(prompt)} className="shrink-0 rounded-full border border-neutral-800 px-3 py-1.5 text-[10px] text-neutral-400 transition hover:border-emerald-800/50 hover:text-emerald-200 disabled:opacity-40">{prompt}</button>)}
                </div>
                <form onSubmit={submitChat} className="flex items-end gap-2 rounded-2xl border border-neutral-700 bg-[#171a1d] p-2 focus-within:border-emerald-700/60">
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendPrompt(draft); } }} placeholder="Pergunte, explique seu raciocínio ou conte o que observou..." rows={1} maxLength={1800} className="max-h-32 min-h-10 min-w-0 flex-1 resize-y bg-transparent px-2 py-2 text-xs leading-5 text-neutral-100 outline-none placeholder:text-neutral-600" />
                  <button type="submit" disabled={isSending || !draft.trim()} aria-label="Enviar mensagem" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400 text-neutral-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"><Send size={15} /></button>
                </form>
                <p className="mt-1.5 text-center text-[9px] text-neutral-700">A IA pode cometer erros. Demonstrações e modelos visuais são recursos didáticos.</p>
              </div>
            </div>
          </section>
          <aside className="min-h-0 min-w-0 flex-1 overflow-y-auto border-t border-neutral-800 p-3 lg:p-4 xl:basis-1/2 xl:border-l-0 xl:border-t-0">
            <LessonDetails
              onAskAssessment={(question) => void assessAnswer(question)}
              busyQuestionId={busyQuestionId}
              answers={answers}
              setAnswer={(id, value) => setAnswers((previous) => ({ ...previous, [id]: value }))}
              onPrepareAction={setPreparedActionId}
              preparedActionId={preparedActionId}
              onApplyAction={applyAction}
              onCancelAction={() => setPreparedActionId(null)}
              currentSession={session}
            />
            {session.status === 'paused' && (
              <button type="button" onClick={handleResumeRequest} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-xs font-semibold text-neutral-950 hover:bg-emerald-300"><Play size={14} /> Retomar estudo</button>
            )}
            {session.lesson && session.status !== 'completed' && (
              <button type="button" onClick={() => setSessionStatus('completed')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-800 px-4 py-3 text-xs font-medium text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"><Check size={14} /> Concluir esta aula</button>
            )}
            {session.status === 'completed' && (
              <div className="mt-3 rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-3 py-3 text-center text-xs text-emerald-200"><CircleCheck size={15} className="mx-auto mb-1" />Aula concluída. Seu progresso foi salvo no projeto.</div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
