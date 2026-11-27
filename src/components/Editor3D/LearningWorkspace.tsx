'use client';

import Image from 'next/image';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Atom,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  ClipboardCheck,
  CircleCheck,
  Clock3,
  Code2,
  Dna,
  ExternalLink,
  FlaskConical,
  FolderOpen,
  Globe2,
  GraduationCap,
  Landmark,
  Languages,
  Lightbulb,
  LoaderCircle,
  MessageCircle,
  Network,
  Palette,
  Pause,
  Play,
  Rocket,
  Search,
  Send,
  Sprout,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  TEACHER_MODELS,
  type AvailableTeacherModelId,
  type TeacherModelOption,
  type TeacherProvider,
} from '@/lib/learning/models';
import { isExplicit3DModelRequest } from '@/lib/learning/modelIntent';
import { LEARNING_SUBJECTS, findLearningSubject } from '@/lib/learning/subjects';
import { buildEditableMeshFromAiData } from '@/lib/aiMeshEnhancer';
import {
  normalizeTeacherResponse,
  type LearningLevel,
  type LearningMessage,
  type LearningProjectState,
  type LearningResource,
  type LearningSessionSummary,
  type TeacherActionSuggestion,
  type TeacherApiResponse,
  type TeacherLessonPlan,
  type TeacherLessonUpdate,
  type TeacherQuestion,
  type TeacherRequest,
  type LearningWikipediaArticle,
} from '@/lib/learning/types';
import LearningMindMap from './LearningMindMap';
import { LearningRichText } from './LearningRichText';
import { useEditorStore } from '@/store/editorStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useHistoryStore } from '@/store/historyStore';
import { useLearningStore } from '@/store/learningStore';
import { useMaterialStore } from '@/store/materialStore';
import { usePhysicsStore } from '@/store/physicsStore';
import { useSceneStore } from '@/store/sceneStore';
import { DEFAULT_PHYSICS_CONFIG, type EditorMaterial, type PrimitiveKind, type ScenePhysicsConfig, type Vec3 } from '@/store/types';

type GeneratedMesh = {
  name: string;
  vertices: Vec3[];
  faces: [number, number, number][];
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  visible: boolean;
  parentName?: string;
  material: Partial<Pick<EditorMaterial,
    | 'color'
    | 'metalness'
    | 'roughness'
    | 'emissive'
    | 'emissiveIntensity'
    | 'opacity'
    | 'textureRepeatX'
    | 'textureRepeatY'
    | 'textureOffsetX'
    | 'textureOffsetY'
    | 'textureRotation'
  >>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isVec3 = (value: unknown): value is Vec3 =>
  Array.isArray(value)
  && value.length === 3
  && value.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate));

const isTriangle = (value: unknown): value is [number, number, number] =>
  Array.isArray(value)
  && value.length === 3
  && value.every((index) => typeof index === 'number' && Number.isInteger(index));

const boundedNumber = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : undefined;

const normalizeGeneratedMesh = (value: unknown, index: number): GeneratedMesh => {
  if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim()) {
    throw new Error(`A malha ${index + 1} retornada pela IA não tem um nome válido.`);
  }

  const vertices = value.vertices;
  const faces = value.faces;
  if (!Array.isArray(vertices) || !vertices.every(isVec3)
    || !Array.isArray(faces) || !faces.every(isTriangle)) {
    throw new Error(`A malha "${value.name}" retornada pela IA está incompleta.`);
  }

  if (vertices.length < 8 || faces.length < 4
    || faces.some((face) => face.some((vertexIndex) => vertexIndex < 0 || vertexIndex >= vertices.length))) {
    throw new Error(`A malha "${value.name}" não contém geometria 3D válida.`);
  }

  const materialSource = isRecord(value.material) ? value.material : {};
  const material: GeneratedMesh['material'] = {};
  for (const key of ['color', 'emissive'] as const) {
    const color = materialSource[key];
    if (typeof color === 'string' && /^#([0-9a-f]{6})$/i.test(color)) material[key] = color;
  }
  const materialNumberRanges = {
    metalness: [0, 1],
    roughness: [0, 1],
    emissiveIntensity: [0, 5],
    opacity: [0, 1],
    textureRepeatX: [0.1, 8],
    textureRepeatY: [0.1, 8],
    textureOffsetX: [-2, 2],
    textureOffsetY: [-2, 2],
    textureRotation: [-Math.PI, Math.PI],
  } as const;
  for (const [key, [min, max]] of Object.entries(materialNumberRanges) as Array<
    [keyof typeof materialNumberRanges, readonly [number, number]]
  >) {
    const parsed = boundedNumber(materialSource[key], min, max);
    if (parsed !== undefined) material[key] = parsed;
  }

  return {
    name: value.name.trim(),
    vertices,
    faces,
    position: isVec3(value.position) ? value.position : [0, 0.5, 0],
    rotation: isVec3(value.rotation) ? value.rotation : [0, 0, 0],
    scale: isVec3(value.scale) ? value.scale : [1, 1, 1],
    visible: typeof value.visible === 'boolean' ? value.visible : true,
    ...(typeof value.parentName === 'string' ? { parentName: value.parentName } : {}),
    material,
  };
};

const parseGeneratedMeshes = (value: unknown): GeneratedMesh[] => {
  if (!isRecord(value) || !Array.isArray(value.objects) || value.objects.length === 0) {
    throw new Error('A IA não retornou objetos para montar a cena.');
  }
  return value.objects.map(normalizeGeneratedMesh);
};

const levelLabels: Record<LearningLevel, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

const levelDetails: Record<LearningLevel, { description: string; tone: string; icon: LucideIcon }> = {
  beginner: {
    description: 'Primeiros contatos, com linguagem simples e exemplos do dia a dia.',
    tone: 'text-emerald-300',
    icon: Sprout,
  },
  intermediate: {
    description: 'Para quem já conhece o básico e quer aprofundar conceitos.',
    tone: 'text-sky-300',
    icon: GraduationCap,
  },
  advanced: {
    description: 'Rigor conceitual, nuances e desafios para ir além.',
    tone: 'text-amber-300',
    icon: Rocket,
  },
};

const quickPrompts = [
  'Explique com um exemplo do cotidiano.',
  'Dê uma pista sem entregar a resposta.',
  'Faça um mini quiz sobre isso.',
  'Como isso aparece em uma cena 3D?',
];

const stepKindLabels: Record<string, string> = {
  explanation: 'Entender',
  demonstration: 'Observar',
  practice: 'Praticar',
  reflection: 'Refletir',
};

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
  const models: TeacherModelOption[] = [...TEACHER_MODELS];
  const selectedModel = models.find((model) => model.id === modelId)
    ?? models[0];
  const providerName: Record<TeacherProvider, string> = {
    nvidia: 'NVIDIA · IA',
    zai: 'Z.AI · GLM',
  };
  const providerDetailName: Record<TeacherProvider, string> = {
    nvidia: 'NVIDIA Nemotron',
    zai: 'Z.AI GLM',
  };
  const providerColor: Record<TeacherProvider, string> = {
    nvidia: 'text-[#76b900]',
    zai: 'text-sky-300',
  };

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
        aria-label={`Modelo do Coru: ${providerName[selectedModel.provider]} ${selectedModel.name}`}
        className="flex max-w-64 cursor-pointer list-none items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/50 px-2.5 py-1.5 outline-none transition hover:border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500 [&::-webkit-details-marker]:hidden"
      >
        <AIModelBrandMark provider={selectedModel.provider} className="size-5 shrink-0" />
        <span className="min-w-0 text-left">
          <span className={`block text-[9px] font-semibold uppercase tracking-[0.12em] ${providerColor[selectedModel.provider]}`}>
            {providerName[selectedModel.provider]}
          </span>
          <span className="block truncate text-[11px] font-medium text-neutral-200">{selectedModel.name}</span>
        </span>
        <ChevronDown size={14} className="shrink-0 text-neutral-500" aria-hidden="true" />
      </summary>
      <div
        role="group"
        aria-label="Modelos de IA disponíveis para o Coru"
        className="absolute right-0 top-full z-[80] mt-2 max-h-[18rem] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto overflow-x-hidden rounded-xl border border-neutral-700 bg-[#17191b] p-1.5 shadow-2xl shadow-black/50"
      >
        <p className="px-2.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Escolha o modelo
        </p>
        {models.map((model) => (
          <button
            key={model.id}
            type="button"
            disabled={!model.apiAvailable}
            aria-pressed={model.id === selectedModel.id}
            onClick={() => {
              if (!model.apiAvailable) return;
              onModelChange(model.id);
              if (detailsRef.current) detailsRef.current.open = false;
            }}
            className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <AIModelBrandMark provider={model.provider} className="mt-0.5 size-6 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <span className={`text-[9px] font-semibold uppercase tracking-[0.1em] ${providerColor[model.provider]}`}>
                  {providerDetailName[model.provider]}
                </span>
                <span className="rounded-full border border-neutral-700 px-1.5 py-0.5 text-[9px] text-neutral-400">{model.badge}</span>
              </span>
              <span className="mt-1 block text-xs font-semibold text-neutral-100">{model.name}</span>
              <span className="mt-1 block text-[11px] leading-4 text-neutral-400">{model.description}</span>
            </span>
            {model.id === selectedModel.id && <Check size={15} className="mt-1 shrink-0 text-emerald-300" aria-label="Selecionado" />}
          </button>
        ))}
      </div>
    </details>
  );
};

type LearningLevelSelectorProps = {
  level: LearningLevel;
  onLevelChange: (level: LearningLevel) => void;
};

const LearningLevelSelector = ({ level, onLevelChange }: LearningLevelSelectorProps) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const SelectedIcon = levelDetails[level].icon;

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
    <details ref={detailsRef} className="relative w-full">
      <summary
        aria-label={`Nível do estudo: ${levelLabels[level]}`}
        className="flex h-10 w-full cursor-pointer list-none items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/50 px-2.5 outline-none transition hover:border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-500 [&::-webkit-details-marker]:hidden"
      >
        <span className={`flex size-6 shrink-0 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 ${levelDetails[level].tone}`}>
          <SelectedIcon size={14} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Nível</span>
          <span className="block truncate text-[11px] font-medium text-neutral-200">{levelLabels[level]}</span>
        </span>
        <ChevronDown size={14} className="shrink-0 text-neutral-500" aria-hidden="true" />
      </summary>
      <div
        role="group"
        aria-label="Níveis de estudo disponíveis"
        className="absolute left-0 top-full z-[80] mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-neutral-700 bg-[#17191b] p-1.5 shadow-2xl shadow-black/50"
      >
        <p className="px-2.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
          Escolha o nível
        </p>
        {(Object.keys(levelDetails) as LearningLevel[]).map((option) => {
          const meta = levelDetails[option];
          const OptionIcon = meta.icon;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={option === level}
              onClick={() => {
                onLevelChange(option);
                if (detailsRef.current) detailsRef.current.open = false;
              }}
              className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-neutral-700 bg-neutral-900 ${meta.tone}`}>
                <OptionIcon size={14} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-neutral-100">{levelLabels[option]}</span>
                <span className="mt-1 block text-[11px] leading-4 text-neutral-400">{meta.description}</span>
              </span>
              {option === level && <Check size={15} className="mt-1 shrink-0 text-emerald-300" aria-label="Selecionado" />}
            </button>
          );
        })}
      </div>
    </details>
  );
};

const AIModelBrandMark = ({ provider, className }: { provider: TeacherProvider; className: string }) => (
  provider === 'nvidia' ? (
    <svg className={`${className} text-[#76b900]`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M8.948 8.798v-1.43a6.7 6.7 0 0 1 .424-.018c3.922-.124 6.493 3.374 6.493 3.374s-2.774 3.851-5.75 3.851c-.398 0-.787-.062-1.158-.185v-4.346c1.528.185 1.837.857 2.747 2.385l2.04-1.714s-1.492-1.952-4-1.952a6.016 6.016 0 0 0-.796.035m0-4.735v2.138l.424-.027c5.45-.185 9.01 4.47 9.01 4.47s-4.08 4.964-8.33 4.964c-.37 0-.733-.035-1.095-.097v1.325c.3.035.61.062.91.062 3.957 0 6.82-2.023 9.593-4.408.459.371 2.34 1.263 2.73 1.652-2.633 2.208-8.772 3.984-12.253 3.984-.335 0-.653-.018-.971-.053v1.864H24V4.063zm0 10.326v1.131c-3.657-.654-4.673-4.46-4.673-4.46s1.758-1.944 4.673-2.262v1.237H8.94c-1.528-.186-2.73 1.245-2.73 1.245s.68 2.412 2.739 3.11M2.456 10.9s2.164-3.197 6.5-3.533V6.201C4.153 6.59 0 10.653 0 10.653s2.35 6.802 8.948 7.42v-1.237c-4.84-.6-6.492-5.936-6.492-5.936z" />
    </svg>
  ) : (
    <Image src="/zai-logo.svg" alt="" width={24} height={24} className={className} />
  )
);

const CoruAvatar = ({ className }: { className: string }) => (
  <Image
    src="/coru.png"
    alt="Coru"
    width={64}
    height={64}
    className={`${className} object-contain`}
  />
);

const MAX_CLIENT_RESPONSE_CHARS = 80_000;

const callTeacher = async (request: TeacherRequest, signal?: AbortSignal): Promise<TeacherApiResponse> => {
  const response = await fetch('/api/ai/teacher', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });
  const raw = await response.text();
  if (raw.length > MAX_CLIENT_RESPONSE_CHARS) throw new Error('A resposta do Coru excedeu o limite permitido.');
  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) as unknown : null;
  } catch {
    throw new Error('O Coru retornou uma resposta inválida.');
  }
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : 'Não foi possível falar com o Coru.';
    const debugCode = typeof payload === 'object' && payload !== null && 'debugCode' in payload && typeof payload.debugCode === 'string'
      ? ` (${payload.debugCode})`
      : '';
    throw new Error(`${message}${debugCode}`);
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

const applyLessonUpdate = (
  lesson: TeacherLessonPlan,
  update?: TeacherLessonUpdate,
  research?: TeacherApiResponse['research'],
): TeacherLessonPlan => {
  const additions = update?.addQuestions ?? [];
  const existingQuestionIds = new Set(lesson.questions.map((question) => question.id));
  const newQuestions = additions.filter((question) => !existingQuestionIds.has(question.id));
  const questions = [...lesson.questions, ...newQuestions].slice(0, 12);
  const currentResources = lesson.resources ?? [];
  const researchedResources = research?.resources.filter((resource) =>
    resource.provider.toLocaleLowerCase('pt-BR').includes('youtube') || resource.kind === 'video',
  ) ?? [];
  const hasRealVideo = researchedResources.some((resource) => resource.kind === 'video');
  const resourcesToAdd = hasRealVideo
    ? researchedResources.filter((resource) => resource.kind !== 'search')
    : researchedResources;
  const resources = Array.from(new Map(
    [...currentResources, ...resourcesToAdd].map((resource) => [resource.url, resource]),
  ).values()).slice(0, 12);
  return {
    ...lesson,
    ...(update?.explanation ? { explanation: update.explanation } : {}),
    ...(newQuestions.length > 0 ? { questions } : {}),
    ...(update?.mindMap ? { mindMap: update.mindMap } : {}),
    ...(resources.length > 0 ? { resources } : {}),
  };
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

const learningWikipediaImageKey = (title: string) => title
  .replace(/^(?:File|Ficheiro|Arquivo):/i, '')
  .replace(/_/g, ' ')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function WikipediaImageFigure({
  image,
  className = '',
}: {
  image: LearningWikipediaArticle['images'][number];
  className?: string;
}) {
  return (
    <figure className={'min-w-0 overflow-hidden rounded-xl border border-neutral-800 bg-black/20 ' + className}>
      <a href={image.filePageUrl} target="_blank" rel="noreferrer" aria-label={'Abrir cr\u00e9ditos da imagem: ' + image.caption}>
        <div className="relative aspect-[16/10] bg-neutral-900">
          <Image
            src={image.thumbnailUrl}
            alt={image.caption}
            fill
            unoptimized
            sizes="(max-width: 640px) 42vw, 260px"
            className="object-contain"
          />
        </div>
      </a>
      <figcaption className="p-2">
        <p className="line-clamp-2 text-[10px] leading-4 text-neutral-300">{image.caption}</p>
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-neutral-600">
          {image.artist && <span>Autor: {image.artist}</span>}
          {image.licenseUrl ? (
            <a href={image.licenseUrl} target="_blank" rel="noreferrer" className="hover:text-sky-200">
              {image.license || 'Licen\u00e7a'}
            </a>
          ) : image.license ? <span>{image.license}</span> : null}
          <a href={image.filePageUrl} target="_blank" rel="noreferrer" className="hover:text-sky-200">{'Cr\u00e9ditos'}</a>
        </div>
      </figcaption>
    </figure>
  );
}

function WikipediaArticleContent({ article }: { article: LearningWikipediaArticle }) {
  const imagesByTitle = new Map<string, LearningWikipediaArticle['images'][number]>();
  article.images.forEach((image) => imagesByTitle.set(learningWikipediaImageKey(image.fileTitle), image));
  const usedImages = new Set<string>();
  const parts: Array<
    | { kind: 'text'; id: string; content: string }
    | { kind: 'image'; id: string; image: LearningWikipediaArticle['images'][number] }
  > = [];
  const markerPattern = /\[\[WIKI_IMAGE:([^\]]+)\]\]/g;
  let cursor = 0;
  let partIndex = 0;
  let marker: RegExpExecArray | null;

  while ((marker = markerPattern.exec(article.excerpt))) {
    const textBefore = article.excerpt.slice(cursor, marker.index).trim();
    if (textBefore) parts.push({ kind: 'text', id: 'text-' + partIndex++, content: textBefore });
    cursor = markerPattern.lastIndex;

    try {
      const imageTitle = decodeURIComponent(marker[1]);
      const imageKey = learningWikipediaImageKey(imageTitle);
      const image = imagesByTitle.get(imageKey);
      if (image && !usedImages.has(imageKey)) {
        usedImages.add(imageKey);
        parts.push({ kind: 'image', id: 'image-' + partIndex++ + '-' + imageKey, image });
      }
    } catch {
      // Ignore malformed placement tokens and keep rendering the article text.
    }
  }

  const remainingText = article.excerpt.slice(cursor).trim();
  if (remainingText) parts.push({ kind: 'text', id: 'text-' + partIndex++, content: remainingText });

  return (
    <>
      <div className="mt-2">
        {parts.map((part) => part.kind === 'text'
          ? <LearningRichText key={part.id} className="text-xs leading-5 text-neutral-300">{part.content}</LearningRichText>
          : <WikipediaImageFigure key={part.id} image={part.image} className="mx-auto my-3 w-full max-w-md" />)}
      </div>
    </>
  );
}

function WikipediaCuration({ articles }: { articles: LearningWikipediaArticle[] }) {
  if (articles.length === 0) return null;

  return (
    <section className="mt-4 overflow-hidden rounded-2xl" aria-label="Curadoria">
      <header className="flex items-center gap-3  px-3 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-400/10 "><BookOpen size={15} /></span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-sky-100">Curadoria</p>
        </div>
      </header>
      <div className="grid gap-3 p-3 sm:p-4">
        {articles.map((article) => (
          <article key={article.url} className="min-w-0 rounded-xl border border-neutral-800 bg-neutral-950/45 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <a href={article.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 text-[10px] font-medium text-neutral-500 transition hover:text-sky-200">
                Ver artigo <ExternalLink size={11} />
              </a>
            </div>
            <h3 className="mt-2 text-sm font-semibold text-neutral-100">{article.title}</h3>
            <WikipediaArticleContent article={article} />
          </article>
        ))}
      </div>
    </section>
  );
}

function MessageBubble({
  message,
  wikipediaArticles,
  messageRef,
}: {
  message: LearningMessage;
  wikipediaArticles?: LearningWikipediaArticle[];
  messageRef?: (element: HTMLElement | null) => void;
}) {
  const isTeacher = message.role === 'teacher';
  const assessment = message.assessment;
  const modelInfo = isTeacher ? message.modelInfo : undefined;
  const failedModels = modelInfo?.failedAttempts.map((attempt) => attempt.modelName).filter(Boolean) ?? [];
  const assessmentTone = assessment?.result === 'correct'
    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200'
    : assessment?.result === 'incorrect'
      ? 'border-amber-500/30 bg-amber-500/5 text-amber-100'
      : 'border-sky-500/30 bg-sky-500/5 text-sky-100';
  return (
    <article ref={messageRef} className={`flex gap-3 ${isTeacher ? '' : 'flex-row-reverse'}`}>
      <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-xl ${isTeacher ? 'bg-emerald-400/10 text-emerald-300' : 'bg-sky-400/10 text-sky-300'}`}>
        {isTeacher ? <CoruAvatar className="size-8" /> : <MessageCircle size={15} />}
      </div>
      <div className={`max-w-[min(100%,720px)] rounded-2xl border px-4 py-3 ${isTeacher ? 'border-neutral-800 bg-[#171a1d]' : 'border-sky-900/50 bg-sky-950/25'}`}>
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
          <span className="flex flex-wrap items-center gap-2">
            <span>{isTeacher ? 'Coru' : 'Você'}</span>
            {modelInfo?.respondedModelName && (
              <span className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-2 py-0.5 text-[9px] font-medium normal-case tracking-normal text-emerald-200" title={`Modelo que respondeu: ${modelInfo.respondedModelName}`}>
                {modelInfo.respondedModelName}
              </span>
            )}
          </span>
          <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
        </div>
        {modelInfo?.didFailover && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[11px] leading-4 text-amber-100" role="status">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
            <span>
              Modelo escolhido falhou: <strong>{failedModels.join(', ') || modelInfo.requestedModelName}</strong>.
              {' '}Resposta gerada por <strong>{modelInfo.respondedModelName}</strong>.
            </span>
          </div>
        )}
        <LearningRichText>{message.content}</LearningRichText>
        {isTeacher && wikipediaArticles && <WikipediaCuration articles={wikipediaArticles} />}
        {assessment && (
          <div className={`mt-3 rounded-xl border p-3 ${assessmentTone}`}>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold">
              {assessment.result === 'correct' ? <CircleCheck size={14} /> : <Lightbulb size={14} />}
              {assessment.result === 'correct' ? 'Você compreendeu esta questão' : assessment.result === 'partial' ? 'Tem uma parte importante no caminho' : 'Vamos tentar outro caminho'}
            </div>
            <LearningRichText className="text-xs leading-5">{assessment.feedback}</LearningRichText>
            {assessment.hint && (
              <div className="mt-2 text-xs leading-5 text-neutral-300">
                <strong>Pista:</strong>
                <LearningRichText className="text-xs leading-5">{assessment.hint}</LearningRichText>
              </div>
            )}
            {assessment.understood.length > 0 && (
              <LearningRichText className="mt-2 text-[11px] text-neutral-400">Já entendeu: {assessment.understood.join(' · ')}</LearningRichText>
            )}
            {assessment.revisit.length > 0 && (
              <LearningRichText className="mt-1 text-[11px] text-neutral-400">Vale revisar: {assessment.revisit.join(' · ')}</LearningRichText>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

const extractYouTubeVideoId = (value: string) => {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '').toLocaleLowerCase('en-US');
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] ?? null;
    if (host !== 'youtube.com' && host !== 'm.youtube.com') return null;
    if (url.pathname === '/watch') return url.searchParams.get('v');
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (['embed', 'shorts', 'live'].includes(pathParts[0] ?? '')) return pathParts[1] ?? null;
    return null;
  } catch {
    return null;
  }
};

function LearningResourceCard({
  resource,
  onPlayVideo,
  isSelected,
}: {
  resource: LearningResource;
  onPlayVideo?: (resource: LearningResource) => void;
  isSelected?: boolean;
}) {
  const [imageError, setImageError] = useState(false);
  const isVideo = resource.kind === 'video' || resource.provider.toLocaleLowerCase('pt-BR').includes('youtube');
  const youtubeVideoId = isVideo ? extractYouTubeVideoId(resource.url) : null;
  const canPlayInline = Boolean(youtubeVideoId && onPlayVideo);
  const host = (() => {
    try {
      return new URL(resource.url).hostname.replace(/^www\./, '');
    } catch {
      return resource.provider;
    }
  })();
  const hasThumbnail = Boolean(resource.thumbnailUrl && !imageError);
  const content = (
    <>
      <span className={`relative block aspect-[16/8] overflow-hidden ${isVideo ? 'bg-gradient-to-br from-red-950 via-neutral-900 to-neutral-950' : 'bg-gradient-to-br from-sky-950 via-neutral-900 to-neutral-950'}`}>
        {hasThumbnail ? (
          <Image
            src={resource.thumbnailUrl as string}
            alt=""
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, 320px"
            className="object-cover transition duration-500 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${isVideo ? 'text-red-200' : 'text-sky-200'}`}>
            <span className={`flex size-11 items-center justify-center rounded-2xl border ${isVideo ? 'border-red-300/20 bg-red-400/15' : 'border-sky-300/20 bg-sky-400/15'}`}>
              {isVideo ? <Play size={20} fill="currentColor" /> : <Globe2 size={20} />}
            </span>
            <span className="max-w-[80%] truncate text-[10px] font-medium text-neutral-400">{isVideo ? 'Prévia do vídeo' : host}</span>
          </span>
        )}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/10" />
        <span className="absolute left-2.5 top-2.5 rounded-full border border-white/10 bg-black/55 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-white/80 backdrop-blur-sm">{resource.provider}</span>
        <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[9px] font-semibold text-white/85 backdrop-blur-sm">
          {isVideo ? <Play size={10} fill="currentColor" /> : <ExternalLink size={10} />}
          {isVideo ? 'Assistir' : 'Abrir fonte'}
        </span>
      </span>
      <span className="block min-w-0 p-3">
        <span className="block line-clamp-2 text-xs font-semibold leading-4 text-neutral-200 group-hover:text-emerald-100">{resource.title}</span>
        <span className="mt-1 block truncate text-[10px] text-neutral-600">{resource.author || host}</span>
        <span className="mt-1.5 block line-clamp-2 text-[11px] leading-4 text-neutral-500">{resource.description}</span>
      </span>
    </>
  );
  if (canPlayInline) {
    return (
      <button
        type="button"
        onClick={() => onPlayVideo?.(resource)}
        aria-pressed={isSelected}
        className={`group min-w-0 w-full overflow-hidden rounded-2xl border bg-neutral-950/45 text-left transition hover:border-emerald-700/60 hover:bg-neutral-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${isSelected ? 'border-emerald-400/70 ring-1 ring-emerald-400/30' : 'border-neutral-800'}`}
      >
        {content}
      </button>
    );
  }
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      className="group min-w-0 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950/45 transition hover:border-emerald-700/60 hover:bg-neutral-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
    >
      {content}
    </a>
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
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
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
  const progressTotal = lesson.steps.length + lesson.questions.length;
  const progressDone = doneSteps.size + doneQuestions.size;
  const progressPercent = progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0;
  const nextStepId = lesson.steps.find((step) => !doneSteps.has(step.id))?.id;
  const researchResources = lesson.resources ?? [];
  const selectedVideo = researchResources.find((resource) => resource.url === selectedVideoUrl) ?? null;
  const selectedVideoId = selectedVideo ? extractYouTubeVideoId(selectedVideo.url) : null;
  const resourceGroups = researchResources.reduce<Array<{ provider: string; resources: LearningResource[] }>>((groups, resource) => {
    const provider = resource.provider.trim() || 'Outras fontes';
    const existing = groups.find((group) => group.provider === provider);
    if (existing) existing.resources.push(resource);
    else groups.push({ provider, resources: [resource] });
    return groups;
  }, []).sort((left, right) => {
    if (left.provider === 'YouTube') return -1;
    if (right.provider === 'YouTube') return 1;
    return left.provider.localeCompare(right.provider, 'pt-BR');
  });
  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-800/50 bg-gradient-to-br from-[#172820] via-[#121a17] to-[#15181b] p-4 shadow-lg shadow-emerald-950/10 sm:p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 size-36 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-emerald-300/20 bg-emerald-400/10 shadow-lg shadow-emerald-950/30">
              <CoruAvatar className="size-11" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Trilha guiada · {lesson.subjectName}</p>
              <LearningRichText className="mt-1 text-xl font-semibold tracking-tight text-white">{lesson.title}</LearningRichText>
              <p className="mt-1 truncate text-[11px] text-neutral-500">{lesson.topic} · nível {levelLabels[lesson.level].toLowerCase()}</p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Seu progresso</p>
                <p className="mt-1 text-xs text-neutral-300">{progressDone} de {progressTotal} desafios concluídos</p>
              </div>
              <span className="text-lg font-semibold text-emerald-200">{progressPercent}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-900/80" role="progressbar" aria-label={`${progressPercent}% da aula concluída`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-300 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-emerald-900/50 bg-emerald-950/25 p-3">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300"><Lightbulb size={13} /> Ao final, você vai conseguir</p>
            <LearningRichText className="mt-1 text-sm leading-6 text-neutral-100">{lesson.objective}</LearningRichText>
          </div>

          {lesson.prerequisites.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-600">Antes de começar:</span>
              {lesson.prerequisites.map((item) => (
                <span key={item} className="rounded-full border border-neutral-800 bg-neutral-950/40 px-2.5 py-1 text-[10px] text-neutral-400">{item}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-[#15181b] p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-100"><BookOpen size={15} className="text-emerald-300" /> Conteúdo principal</h3>
            <p className="mt-1 text-[11px] text-neutral-500">Leia no seu ritmo; depois avance pelo roteiro.</p>
          </div>
          <span className="rounded-full border border-neutral-800 bg-neutral-950/50 px-2 py-1 text-[10px] text-neutral-500">Leitura guiada</span>
        </div>
        <div className="rounded-2xl border border-emerald-900/40 bg-neutral-950/55 p-4 sm:p-5">
          <LearningRichText className="text-sm leading-7 text-neutral-200">{lesson.explanation}</LearningRichText>
        </div>
      </section>

      <LearningMindMap
        key={currentSession.id}
        root={lesson.mindMap}
        marks={currentSession.mindMapMarks}
        notes={currentSession.mindMapNotes}
        onMark={(nodeId, mark) => useLearningStore.getState().setMindMapMark(nodeId, mark)}
        onNote={(nodeId, note) => useLearningStore.getState().setMindMapNote(nodeId, note)}
      />

      {researchResources.length > 0 && (
        <section className="rounded-2xl border border-violet-900/40 bg-gradient-to-br from-violet-950/20 to-[#15181b] p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-violet-100"><Globe2 size={15} className="text-violet-300" /> Materiais para continuar</h3>
              <p className="mt-1 text-[11px] leading-4 text-neutral-500">Pesquisados antes da aula e usados como apoio para montar esta explicação.</p>
            </div>
            <span className="shrink-0 rounded-full border border-violet-900/50 bg-violet-950/30 px-2 py-1 text-[10px] text-violet-200">{researchResources.length} fontes</span>
          </div>

          {selectedVideoId && selectedVideo && (
            <div className="mb-4 overflow-hidden rounded-2xl border border-red-900/50 bg-black/40">
              <div className="aspect-video w-full bg-black">
                <iframe
                  key={selectedVideoId}
                  src={`https://www.youtube-nocookie.com/embed/${selectedVideoId}?rel=0&modestbranding=1`}
                  title={selectedVideo.title}
                  className="size-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <p className="min-w-0 truncate text-xs font-medium text-neutral-200">{selectedVideo.title}</p>
                <a href={selectedVideo.url} target="_blank" rel="noreferrer" className="shrink-0 text-[10px] text-neutral-500 underline-offset-2 hover:text-neutral-300 hover:underline">Abrir no YouTube</a>
              </div>
            </div>
          )}

          {resourceGroups.map((group, index) => (
            <div key={group.provider} className={index > 0 ? 'mt-4' : ''}>
              <p className={`mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] ${group.provider.toLocaleLowerCase('pt-BR').includes('youtube') ? 'text-red-300/80' : 'text-sky-300/80'}`}>{group.provider}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.resources.map((resource) => (
                  <LearningResourceCard
                    key={resource.id}
                    resource={resource}
                    onPlayVideo={group.provider.toLocaleLowerCase('pt-BR').includes('youtube') ? (item) => setSelectedVideoUrl(item.url) : undefined}
                    isSelected={selectedVideoUrl === resource.url}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="rounded-2xl border border-neutral-800 bg-[#15181b] p-4 sm:p-5">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-100"><CircleCheck size={15} className="text-emerald-300" /> Roteiro para estudar</h3>
            <p className="mt-1 text-[11px] text-neutral-500">Pequenos passos para transformar leitura em prática.</p>
          </div>
          <span className="shrink-0 text-[10px] font-semibold text-emerald-300">{doneSteps.size}/{lesson.steps.length}</span>
        </div>
        <div className="space-y-2">
          {lesson.steps.map((step, index) => {
            const completed = doneSteps.has(step.id);
            const isNext = step.id === nextStepId;
            return (
              <button
                type="button"
                key={step.id}
                onClick={() => useLearningStore.getState().markStepComplete(step.id)}
                aria-pressed={completed}
                className={`group flex w-full gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${completed ? 'border-emerald-900/60 bg-emerald-950/20' : isNext ? 'border-emerald-500/50 bg-emerald-400/5 shadow-[0_0_0_1px_rgba(52,211,153,0.08)]' : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'}`}
              >
                <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xl text-[10px] font-semibold ${completed ? 'bg-emerald-400 text-neutral-950' : isNext ? 'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/30' : 'border border-neutral-700 text-neutral-500'}`}>
                  {completed ? <Check size={12} /> : <span className="text-[10px]">{index + 1}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <LearningRichText className="text-xs font-semibold text-neutral-100">{step.title}</LearningRichText>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${completed ? 'bg-emerald-400/10 text-emerald-300' : isNext ? 'bg-emerald-400/10 text-emerald-200' : 'bg-neutral-800 text-neutral-500'}`}>
                      {completed ? 'Concluído' : isNext ? 'Próximo passo' : stepKindLabels[step.kind] ?? step.kind}
                    </span>
                  </div>
                  <LearningRichText className="mt-1 text-xs leading-5 text-neutral-400">{step.content}</LearningRichText>
                </div>
                {!completed && <ArrowRight size={14} className="mt-1 shrink-0 text-neutral-700 transition group-hover:translate-x-0.5 group-hover:text-emerald-300" />}
              </button>
            );
          })}
        </div>
      </section>

      {lesson.actions.length > 0 && (
        <section className="rounded-2xl border border-emerald-900/50 bg-gradient-to-br from-emerald-950/30 to-[#15181b] p-4 sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-100"><FlaskConical size={15} /> Aprender no editor</h3>
              <p className="mt-1 text-[11px] text-neutral-500">Experimente o conceito na cena quando fizer sentido.</p>
            </div>
            <span className="rounded-full border border-emerald-900/60 bg-emerald-950/40 px-2 py-1 text-[10px] text-emerald-300">3D</span>
          </div>
          <div className="space-y-2">
            {lesson.actions.map((action) => {
              const applied = appliedActions.has(action.id);
              const prepared = preparedActionId === action.id;
              return (
                <div key={action.id} className="rounded-2xl border border-emerald-900/50 bg-[#111816] p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <LearningRichText className="text-xs font-semibold text-neutral-100">{action.label}</LearningRichText>
                    {applied && <CircleCheck size={15} className="shrink-0 text-emerald-300" />}
                  </div>
                  <LearningRichText className="mt-1 text-xs leading-5 text-neutral-400">{action.description}</LearningRichText>
                  {action.type === 'gravity_experiment' && <p className="mt-2 text-[10px] text-neutral-500">Prévia: piso estático, esfera e cubo na mesma altura, gravidade do Rapier habilitada.</p>}
                  {action.type === 'geometry_demo' && <p className="mt-2 text-[10px] text-neutral-500">Prévia: quatro sólidos com materiais coloridos e nomes visíveis na árvore da cena.</p>}
                  {applied ? (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">Criada na cena</div>
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
        <section className="rounded-2xl border border-amber-900/40 bg-gradient-to-br from-amber-950/20 to-[#15181b] p-4 sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-100"><ClipboardCheck size={15} className="text-amber-300" /> Atividade prática</h3>
            <p className="mt-1 text-[11px] text-neutral-500">Agora é sua vez de testar a ideia.</p>
          </div>
          <span className="rounded-full border border-amber-900/50 bg-amber-950/30 px-2 py-1 text-[10px] text-amber-200">Mão na massa</span>
        </div>
          {lesson.activities.map((activity) => (
            <div key={activity.id} className="mb-3 rounded-2xl border border-amber-900/30 bg-neutral-950/30 p-3 last:mb-0">
              <LearningRichText className="text-xs font-semibold text-neutral-200">{activity.title}</LearningRichText>
              <LearningRichText className="mt-1 text-xs leading-5 text-neutral-400">{activity.instructions}</LearningRichText>
            </div>
          ))}
        </section>
      )}

      {lesson.questions.length > 0 && (
        <section className="rounded-2xl border border-sky-900/40 bg-gradient-to-br from-sky-950/20 to-[#15181b] p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-sky-100"><Lightbulb size={15} className="text-sky-300" /> Verifique o que aprendeu</h3>
              <p className="mt-1 text-[11px] text-neutral-500">Responda com suas palavras; o Coru ajuda a ajustar o raciocínio.</p>
            </div>
            <span className="rounded-full border border-sky-900/50 bg-sky-950/30 px-2 py-1 text-[10px] text-sky-200">Desafio</span>
          </div>
          <div className="space-y-4">
            {lesson.questions.map((question, index) => {
              const completed = doneQuestions.has(question.id);
              const busy = busyQuestionId === question.id;
              return (
                <div key={question.id} className="rounded-2xl border border-sky-900/30 bg-neutral-950/35 p-3.5">
                  <div className="flex gap-3 text-xs leading-5 text-neutral-200">
                    <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold ${completed ? 'bg-emerald-400 text-neutral-950' : 'bg-sky-400/10 text-sky-200'}`}>
                      {completed ? <Check size={12} /> : index + 1}
                    </span>
                    <div className="min-w-0">
                      <LearningRichText className="inline text-xs leading-5 text-neutral-200">{question.prompt}</LearningRichText>
                    </div>
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

function SubjectTree({
  subjectId,
  selectedTopic,
  onTopicSelect,
}: {
  subjectId: string;
  selectedTopic: string;
  onTopicSelect: (topic: string) => void;
}) {
  const subject = LEARNING_SUBJECTS.find((s) => s.id === subjectId);
  if (!subject) return null;

  return (
    <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/15 p-3 sm:p-4" role="listbox" aria-label={`Temas de ${subject.name}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-emerald-100">Escolha um tema para começar</p>
          <p className="mt-1 text-[11px] text-neutral-500">Você poderá ajustar o foco durante a aula.</p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-900/60 bg-emerald-950/40 px-2 py-1 text-[10px] text-emerald-200">
          {subject.topics.length} opções
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {subject.topics.map((topic, index) => {
          const isSelected = selectedTopic === topic;
          return (
          <button
            key={topic}
            type="button"
            onClick={() => onTopicSelect(topic)}
            className={`group flex min-w-0 items-start gap-3 rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${isSelected ? 'border-emerald-400/60 bg-emerald-400/10 shadow-[0_0_0_1px_rgba(52,211,153,0.12)]' : 'border-neutral-800 bg-neutral-950/45 hover:border-emerald-800/70 hover:bg-neutral-900/80'}`}
            role="option"
            aria-selected={isSelected}
          >
            <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${isSelected ? 'bg-emerald-300 text-neutral-950' : 'bg-neutral-800 text-neutral-500 group-hover:bg-emerald-950 group-hover:text-emerald-300'}`}>
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-xs font-medium ${isSelected ? 'text-emerald-100' : 'text-neutral-200'}`}>{topic}</span>
              <span className="mt-1 block text-[10px] text-neutral-600">{isSelected ? 'Tema selecionado' : 'Clique para estudar'}</span>
            </span>
            {isSelected && <Check size={15} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />}
          </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-emerald-900/40 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-4 text-neutral-500">
          {selectedTopic ? 'Tema escolhido. Você já pode iniciar sua aula.' : 'Selecione um tema para continuar.'}
        </p>
        <button
          type="submit"
          form="learning-start-form"
          disabled={!selectedTopic.trim()}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-xs font-semibold text-neutral-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <BookOpen size={14} />
          Começar com este tema
        </button>
      </div>
    </div>
  );
}

function LearningHistoryPanel({
  history,
  currentSession,
  onResume,
  onUseTopic,
}: {
  history: LearningProjectState['history'];
  currentSession: LearningProjectState['currentSession'];
  onResume: () => void;
  onUseTopic: (item: LearningSessionSummary) => void;
}) {
  return (
    <aside className="h-fit rounded-2xl border border-neutral-800 bg-[#111516]/95 p-4 shadow-xl shadow-black/10 lg:sticky lg:top-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-200"><FolderOpen size={17} /></span>
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Minhas aulas</h2>
            <p className="mt-1 text-[11px] leading-4 text-neutral-500">Seus estudos salvos neste projeto.</p>
          </div>
        </div>
        <span className="rounded-full border border-neutral-800 bg-neutral-950/60 px-2 py-1 text-[10px] text-neutral-500">{history.length + (currentSession ? 1 : 0)}</span>
      </div>

      <div className="mt-4 space-y-2">
        {currentSession && (
          <button
            type="button"
            onClick={onResume}
            className="flex w-full items-center gap-3 rounded-xl border border-emerald-800/60 bg-emerald-950/25 p-3 text-left transition hover:border-emerald-500/50 hover:bg-emerald-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><BookOpen size={14} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-emerald-100">{currentSession.topic}</span>
              <span className="mt-1 block text-[10px] text-emerald-300/70">{currentSession.lesson ? 'Continuar aula' : 'Preparar aula'}</span>
            </span>
            <ArrowRight size={14} className="shrink-0 text-emerald-300" />
          </button>
        )}

        {[...history].reverse().slice(0, 6).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onUseTopic(item)}
            className="group flex w-full items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950/35 p-3 text-left transition hover:border-neutral-700 hover:bg-neutral-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-500 group-hover:text-emerald-300"><BookOpen size={13} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-neutral-300">{item.topic}</span>
              <span className="mt-1 block truncate text-[10px] text-neutral-600">{item.subjectName} · {item.status === 'completed' ? 'Concluída' : 'Pausada'}</span>
              <span className="mt-1 block text-[10px] text-emerald-300/60">Clique para usar este tema</span>
            </span>
            <ArrowRight size={13} className="shrink-0 text-neutral-700 transition group-hover:translate-x-0.5 group-hover:text-emerald-300" />
          </button>
        ))}

        {!currentSession && history.length === 0 && (
          <div className="rounded-xl border border-dashed border-neutral-800 px-3 py-5 text-center">
            <FolderOpen size={18} className="mx-auto mb-2 text-neutral-700" />
            <p className="text-xs text-neutral-500">Sua primeira aula aparecerá aqui.</p>
            <p className="mt-1 text-[10px] text-neutral-700">Escolha um tema ao lado para começar.</p>
          </div>
        )}
      </div>
    </aside>
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
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const objects = useSceneStore((state) => state.objects);
  const addObject = useSceneStore((state) => state.addObject);
  const updateObject = useSceneStore((state) => state.updateObject);
  const createMaterialForObject = useMaterialStore((state) => state.createMaterialForObject);
  const updateMaterial = useMaterialStore((state) => state.updateMaterial);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);

  const [subjectId, setSubjectId] = useState('general');
  const [level, setLevel] = useState<LearningLevel>('beginner');
  const [topic, setTopic] = useState('');
  const [draft, setDraft] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [isGeneratingModel, setIsGeneratingModel] = useState(false);
  const [busyQuestionId, setBusyQuestionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [homeSessionId, setHomeSessionId] = useState<string | null>(null);
  const [preparedActionId, setPreparedActionId] = useState<string | null>(null);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [topicSearch, setTopicSearch] = useState('');
  const latestMessageRef = useRef<HTMLElement | null>(null);
  const teacherAbortRef = useRef<AbortController | null>(null);
  const session = project.currentSession;
  const firstTeacherMessageId = project.messages.find((message) => message.role === 'teacher')?.id;
  const latestMessageId = project.messages[project.messages.length - 1]?.id;

  useEffect(() => {
    latestMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [project.messages.length, isSending]);

  useEffect(() => () => {
    teacherAbortRef.current?.abort();
    teacherAbortRef.current = null;
  }, []);

  const beginTeacherRequest = () => {
    if (teacherAbortRef.current) return null;
    const controller = new AbortController();
    teacherAbortRef.current = controller;
    return controller;
  };

  const finishTeacherRequest = (controller: AbortController) => {
    if (teacherAbortRef.current === controller) teacherAbortRef.current = null;
  };

  const isAbortError = (value: unknown) => value instanceof Error && value.name === 'AbortError';

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

  const createModelFromPrompt = async (prompt: string, current: NonNullable<typeof session>, signal: AbortSignal) => {
    const modelContext = `\nContexto: ${current.topic} (${current.subjectName}).`;
    const instruction = '\nGere o modelo do pedido; se ele for genérico, modele o contexto.';
    const suffix = `${modelContext}${instruction}`;
    const modelPrompt = `${prompt.slice(0, Math.max(0, 800 - suffix.length))}${suffix}`;
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: modelPrompt }),
      signal,
    });
    const raw = await response.text();
    if (raw.length > MAX_CLIENT_RESPONSE_CHARS) throw new Error('A resposta do gerador 3D excedeu o limite permitido.');
    let payload: unknown = null;
    try {
      payload = raw ? JSON.parse(raw) as unknown : null;
    } catch {
      throw new Error('O gerador 3D retornou uma resposta inválida.');
    }
    if (!response.ok) {
      const message = isRecord(payload) && typeof payload.error === 'string'
        ? payload.error
        : 'Não foi possível gerar o modelo 3D.';
      throw new Error(message);
    }

    const generatedMeshes = parseGeneratedMeshes(payload).map((item) => ({
      ...item,
      editableMesh: buildEditableMeshFromAiData(item.vertices, item.faces),
    }));
    pushSnapshot();
    let lastObjectId: string | null = null;
    const createdObjects: Array<{
      uuid: string;
      name: string;
      parentName?: string;
      position: Vec3;
    }> = [];

    generatedMeshes.forEach((item) => {
      const object = addObject({
        name: item.name,
        kind: 'mesh',
        position: item.position,
        rotation: item.rotation,
        scale: item.scale,
        visible: item.visible,
        editableMesh: item.editableMesh,
      });
      createMaterialForObject(object.uuid, object.materialId, `Material ${item.name}`);
      updateMaterial(object.materialId, item.material);
      createdObjects.push({ uuid: object.uuid, name: item.name, parentName: item.parentName, position: item.position });
      lastObjectId = object.uuid;
    });

    const nameToPosition = new Map(createdObjects.map((item) => [item.name.toLocaleLowerCase('pt-BR'), item.position]));
    const nameToId = new Map(createdObjects.map((item) => [item.name.toLocaleLowerCase('pt-BR'), item.uuid]));
    createdObjects.forEach((item) => {
      if (!item.parentName) return;
      const parentKey = item.parentName.toLocaleLowerCase('pt-BR');
      const parentId = nameToId.get(parentKey);
      if (!parentId || parentId === item.uuid) return;
      const parentPosition = nameToPosition.get(parentKey);
      const position: Vec3 = parentPosition
        ? [
            Number((item.position[0] - parentPosition[0]).toFixed(3)),
            Number((item.position[1] - parentPosition[1]).toFixed(3)),
            Number((item.position[2] - parentPosition[2]).toFixed(3)),
          ]
        : item.position;
      updateObject(item.uuid, { parent: parentId, position });
    });

    if (lastObjectId) setSelectedObject(lastObjectId);
    setActiveTool('translate');
    setActiveMode('scene');
    addMessage({
      role: 'teacher',
      content: `Criei o modelo 3D solicitado e adicionei ${generatedMeshes.length} partes à cena. Você já pode explorá-lo no editor.`,
    });
  };

  const requestLesson = async (subject: { id: string; name: string }, lessonTopic: string, lessonLevel: LearningLevel, create = true) => {
    const controller = beginTeacherRequest();
    if (!controller) return;
    setIsSending(true);
    setIsResearching(true);
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
      }, controller.signal);
      if (!result.lesson) throw new Error('O Coru não conseguiu montar o plano da aula.');
      const wikipediaArticles = result.research?.wikipediaArticles
        ?? result.lesson.wikipediaArticles
        ?? targetSession.lesson?.wikipediaArticles;
      const lesson = {
        ...result.lesson,
        ...(wikipediaArticles?.length ? { wikipediaArticles } : {}),
        actions: result.lesson.actions.length > 0
          ? result.lesson.actions
          : builtInActions(result.lesson.subjectId, targetSession.topic),
      };
      setLesson(lesson);
      addMessage({ role: 'teacher', content: result.reply, modelInfo: result.modelInfo });
      addActions(result.actions ?? []);
    } catch (requestError) {
      if (!isAbortError(requestError)) {
        setError(requestError instanceof Error ? requestError.message : 'Não foi possível iniciar a aula.');
      }
    } finally {
      finishTeacherRequest(controller);
      setIsSending(false);
      setIsResearching(false);
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
    const controller = beginTeacherRequest();
    if (!controller) return;
    const trimmedPrompt = prompt.trim();
    const requestsModel = isExplicit3DModelRequest(trimmedPrompt);
    addMessage({ role: 'student', content: trimmedPrompt });
    setDraft('');
    setIsSending(true);
    setIsGeneratingModel(requestsModel);
    setError('');
    try {
      if (requestsModel) {
        await createModelFromPrompt(trimmedPrompt, current, controller.signal);
        return;
      }
      const response = await callTeacher({
        mode: 'chat',
        modelId: project.modelId,
        subjectId: current.subjectId,
        subjectName: current.subjectName,
        topic: current.topic,
        level: current.level,
        messages: teacherHistory(),
        prompt: trimmedPrompt,
        progress: learningProgress(current),
        lessonContext: current.lesson ? {
          ...current.lesson,
          explanation: current.lesson.explanation.slice(0, 7000),
          steps: current.lesson.steps.slice(0, 8),
          questions: current.lesson.questions.slice(0, 12),
          resources: current.lesson.resources?.slice(0, 12),
        } : undefined,
        scene: getSceneContext(),
      }, controller.signal);
      if (current.lesson && (response.lessonUpdate || response.research)) {
        setLesson(applyLessonUpdate(current.lesson, response.lessonUpdate, response.research));
      }
      addMessage({ role: 'teacher', content: response.reply, modelInfo: response.modelInfo });
      addActions(response.actions ?? []);
    } catch (requestError) {
      if (!isAbortError(requestError)) {
        setError(requestError instanceof Error ? requestError.message : 'O Coru não conseguiu responder.');
      }
    } finally {
      finishTeacherRequest(controller);
      setIsSending(false);
      setIsGeneratingModel(false);
    }
  };

  const assessAnswer = async (question: TeacherQuestion) => {
    const answer = answers[question.id]?.trim();
    const current = useLearningStore.getState().project.currentSession;
    if (!current || !answer || busyQuestionId) return;
    const controller = beginTeacherRequest();
    if (!controller) return;
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
      }, controller.signal);
      addMessage({ role: 'teacher', content: response.reply, assessment: response.assessment, modelInfo: response.modelInfo });
      if (response.assessment?.result === 'correct') markQuestionComplete(question.id);
    } catch (requestError) {
      if (!isAbortError(requestError)) {
        setError(requestError instanceof Error ? requestError.message : 'Não foi possível avaliar a resposta.');
      }
    } finally {
      finishTeacherRequest(controller);
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
    setExpandedSubjectId(null);
    setTopicSearch('');
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
  const normalizedTopicSearch = topicSearch.trim().toLocaleLowerCase('pt-BR');
  const matchingTopics = normalizedTopicSearch
    ? LEARNING_SUBJECTS.flatMap((subject) => subject.topics
      .filter((item) => `${subject.name} ${item}`.toLocaleLowerCase('pt-BR').includes(normalizedTopicSearch))
      .map((item) => ({ item, subject })))
    : [];
  const progressTotal = session?.lesson
    ? session.lesson.steps.length + session.lesson.questions.length
    : 0;
  const progressDone = session
    ? session.completedStepIds.length + session.completedQuestionIds.length
    : 0;
  const progressPercent = progressTotal > 0
    ? Math.min(100, Math.round((progressDone / progressTotal) * 100))
    : 0;

  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-[#0d0f10] text-neutral-100"
      data-tutorial="learning-workspace"
      style={{
        backgroundImage: "linear-gradient(rgba(5, 10, 7, 0.74), rgba(5, 10, 7, 0.90)), url('/background_leaning.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 bg-[#151719] px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center overflow-hidden rounded-xl border border-emerald-400/20 bg-emerald-400/10"><CoruAvatar className="size-10" /></div>
          <div>
            <p className="text-sm font-semibold text-neutral-100">Coru</p>
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
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 max-w-2xl">
              {/* <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-900/50 bg-emerald-950/20 px-3 py-1.5 text-[11px] font-medium text-emerald-200"><Lightbulb size={13} /> Aprender fazendo</div> */}
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">O que você quer aprender hoje?</h1>
              <p className="mt-3 text-sm leading-6 text-neutral-400">Comece pelo tema. O Coru organiza uma aula, propõe atividades e, quando ajudar, prepara uma demonstração dentro do editor.</p>
            </div>

            {project.currentSession && (
              <button type="button" onClick={handleResumeRequest} className="mb-5 flex w-full items-center justify-between rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-4 text-left transition hover:bg-emerald-950/35">
                <span className="flex items-center gap-3"><Clock3 size={18} className="text-emerald-300" /><span><span className="block text-xs font-semibold text-emerald-100">Retomar estudo</span><span className="mt-1 block text-xs text-neutral-400">{project.currentSession.subjectName} · {project.currentSession.topic}</span></span></span>
                <ArrowRight size={16} className="text-emerald-300" />
              </button>
            )}

            <div className="grid items-start gap-10 lg:grid-cols-[17rem_minmax(0,1fr)]">
              <LearningHistoryPanel
                history={project.history}
                currentSession={project.currentSession}
                onResume={handleResumeRequest}
                onUseTopic={(item) => {
                  const historySubject = LEARNING_SUBJECTS.find((subject) => subject.name === item.subjectName);
                  setTopic(item.topic);
                  setSubjectId(historySubject?.id ?? 'general');
                  setExpandedSubjectId(historySubject?.id ?? null);
                  setTopicSearch('');
                }}
              />
              <form id="learning-start-form" onSubmit={handleStartLesson} className="min-w-0 rounded-2xl border border-neutral-800 bg-[#15181b] p-4 shadow-xl shadow-black/10 sm:p-6">
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
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <div className="w-full sm:w-52">
                  <LearningLevelSelector level={level} onLevelChange={setLevel} />
                </div>
                <p className="pb-2 text-[11px] text-neutral-600">Você também pode escolher uma área e um tema abaixo.</p>
              </div>
              {selectedSubject && <p className="mt-2 text-[11px] text-neutral-600">{selectedSubject.description}</p>}
              {error && <p role="alert" className="mt-3 rounded-lg border border-rose-900/50 bg-rose-950/25 px-3 py-2 text-xs text-rose-200">{error}</p>}
              <button type="submit" disabled={isSending || !topic.trim()} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-semibold text-neutral-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60 sm:w-auto sm:min-w-48">
                {isSending ? <LoaderCircle size={16} className="animate-spin" /> : <BookOpen size={16} />}
                {isSending ? (isResearching ? 'Pesquisando fontes...' : 'Preparando sua aula...') : 'Começar a aprender'}
              </button>
              </form>
            </div>

            <section className="mt-7 rounded-2xl border border-neutral-800 bg-[#111516]/90 p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-100">Escolha uma área ou tema</h2>
                  <p className="mt-1 text-[11px] text-neutral-500">Comece por uma sugestão ou pesquise diretamente entre os temas.</p>
                </div>
                {topic && (
                  <span className="rounded-full border border-emerald-900/60 bg-emerald-950/35 px-2.5 py-1 text-[10px] text-emerald-200">
                    Tema: {topic}
                  </span>
                )}
              </div>

              <div className="relative mt-4">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" aria-hidden="true" />
                <input
                  value={topicSearch}
                  onChange={(event) => setTopicSearch(event.target.value)}
                  placeholder="Buscar tema, como gravidade, cores ou algoritmos"
                  aria-label="Buscar temas de estudo"
                  className="h-10 w-full rounded-xl border border-neutral-800 bg-neutral-950/80 pl-9 pr-10 text-xs text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-emerald-500/60"
                />
                {topicSearch && (
                  <button type="button" onClick={() => setTopicSearch('')} aria-label="Limpar busca de temas" className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubjectId('general');
                    setTopic('');
                    setExpandedSubjectId(null);
                  }}
                  className={`group rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${subjectId === 'general' ? 'border-emerald-400/60 bg-emerald-400/10' : 'border-emerald-900/50 bg-emerald-950/15 hover:border-emerald-700/70 hover:bg-emerald-950/25'}`}
                  aria-pressed={subjectId === 'general'}
                >
                  <span className="flex items-center justify-between">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><BookOpen size={15} /></span>
                    {subjectId === 'general' && <Check size={15} className="text-emerald-300" aria-hidden="true" />}
                  </span>
                  <span className="mt-3 block text-xs font-semibold text-emerald-100">Deixe o Coru escolher</span>
                  <span className="mt-1 block text-[11px] leading-5 text-neutral-500">Escreva qualquer tema e a IA identifica a melhor abordagem.</span>
                </button>
                {LEARNING_SUBJECTS.map((subject) => {
                  const Icon = subjectIcons[subject.id] ?? BookOpen;
                  const isExpanded = expandedSubjectId === subject.id;
                  const isSelected = subjectId === subject.id;
                  return (
                    <div key={subject.id} className={isExpanded && !normalizedTopicSearch ? 'sm:col-span-2 xl:col-span-3' : ''}>
                      <button
                        type="button"
                        onClick={() => {
                          setSubjectId(subject.id);
                          if (subjectId !== subject.id && !subject.topics.includes(topic)) setTopic('');
                          setExpandedSubjectId(isExpanded ? null : subject.id);
                        }}
                        className={`group w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${isSelected ? 'border-emerald-400/60 bg-emerald-400/10' : 'border-neutral-800 bg-[#131618] hover:border-emerald-800/60 hover:bg-[#171b1d]'}`}
                        aria-pressed={isSelected}
                        aria-expanded={isExpanded}
                        aria-controls={isExpanded ? `subject-tree-${subject.id}` : undefined}
                      >
                        <span className="flex items-center justify-between">
                          <span className={`flex size-8 items-center justify-center rounded-lg ${isSelected ? 'bg-emerald-400/15 text-emerald-200' : 'bg-neutral-800 text-emerald-300'}`}><Icon size={15} /></span>
                          <span className="flex items-center gap-2">
                            <span className="text-[10px] text-neutral-600">{subject.topics.length} temas</span>
                            {isSelected ? <Check size={15} className="text-emerald-300" aria-hidden="true" /> : <ChevronDown size={14} className={`text-neutral-700 transition group-hover:text-emerald-300 ${isExpanded ? 'rotate-180' : ''}`} />}
                          </span>
                        </span>
                        <span className={`mt-3 block text-xs font-semibold ${isSelected ? 'text-emerald-100' : 'text-neutral-200'}`}>{subject.name}</span>
                        <span className="mt-1 block text-[11px] leading-5 text-neutral-500">{subject.description}</span>
                      </button>
                      {isExpanded && !normalizedTopicSearch && (
                        <div id={`subject-tree-${subject.id}`} className="mt-2">
                          <SubjectTree subjectId={subject.id} selectedTopic={topic} onTopicSelect={setTopic} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {normalizedTopicSearch ? (
                <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-950/45 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">Resultados da busca</p>
                    <span className="text-[10px] text-neutral-600">{matchingTopics.length} encontrado{matchingTopics.length === 1 ? '' : 's'}</span>
                  </div>
                  {matchingTopics.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {matchingTopics.map(({ item, subject }) => {
                        const isSelected = topic === item && subjectId === subject.id;
                        return (
                          <button
                            key={`${subject.id}-${item}`}
                            type="button"
                            onClick={() => {
                              setSubjectId(subject.id);
                              setTopic(item);
                              setExpandedSubjectId(subject.id);
                              setTopicSearch('');
                            }}
                            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${isSelected ? 'border-emerald-400/60 bg-emerald-400/10' : 'border-neutral-800 bg-neutral-900/50 hover:border-emerald-800/70'}`}
                            aria-pressed={isSelected}
                          >
                            <span className="min-w-0"><span className="block truncate text-xs text-neutral-200">{item}</span><span className="mt-1 block text-[10px] text-neutral-600">{subject.name}</span></span>
                            {isSelected ? <Check size={14} className="shrink-0 text-emerald-300" /> : <ArrowRight size={14} className="shrink-0 text-neutral-600" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-dashed border-neutral-800 px-3 py-4 text-center text-xs text-neutral-500">Nenhum tema encontrado. Tente outro termo ou escreva um tema livre acima.</p>
                  )}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
          <section className="flex min-h-[45%] min-w-0 flex-1 flex-col bg-[#080c0a]/95 shadow-[inset_-1px_0_0_rgba(52,211,153,0.08)] backdrop-blur-sm xl:basis-1/2 xl:min-h-0 xl:border-r xl:border-neutral-800">
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-800/80 px-4 py-2.5 lg:px-6">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-neutral-200">{session.subjectName} · {session.topic}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-neutral-600">
                  <span>Nível {levelLabels[session.level].toLowerCase()} · {project.messages.length} mensagens</span>
                  {progressTotal > 0 && <span className="text-emerald-300">{progressPercent}% concluído</span>}
                </div>
                {progressTotal > 0 && (
                  <div className="mt-2 h-1 max-w-64 overflow-hidden rounded-full bg-neutral-800" aria-label={`${progressPercent}% da aula concluída`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                    <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                )}
              </div>
              <button type="button" onClick={() => setActiveMode('scene')} className="ml-3 shrink-0 rounded-lg border border-neutral-700 px-3 py-2 text-[10px] font-medium text-neutral-300 hover:border-emerald-700/50 hover:text-emerald-200">Abrir cena</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-8">
              <div className="mx-auto flex max-w-4xl flex-col gap-4">
                {project.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    messageRef={message.id === latestMessageId ? (element) => { latestMessageRef.current = element; } : undefined}
                    wikipediaArticles={message.id === firstTeacherMessageId ? session.lesson?.wikipediaArticles : undefined}
                  />
                ))}
                {isSending && (
                  <div className="flex items-center gap-3 text-xs text-neutral-500"><span className="flex size-8 items-center justify-center overflow-hidden rounded-xl bg-emerald-400/10 text-emerald-300"><CoruAvatar className="size-8" /></span><LoaderCircle size={14} className="animate-spin" /> {isGeneratingModel ? 'Criando seu modelo 3D...' : isResearching ? 'Pesquisando fontes e montando sua aula...' : 'Coru está pensando...'}</div>
                )}
                {error && (
                  <div role="alert" className="ml-11 rounded-xl border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs text-rose-200">
                    <span>{error}</span>
                    {session && !session.lesson && <button type="button" onClick={() => void requestLesson({ id: session.subjectId, name: session.subjectName }, session.topic, session.level, false)} className="ml-3 font-semibold underline underline-offset-2">Tentar novamente</button>}
                  </div>
                )}
                {project.messages.length === 0 && session.lesson && <p className="ml-11 text-xs text-neutral-500">Sua aula está pronta. Comece pela explicação ou escolha uma etapa no plano ao lado.</p>}
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
