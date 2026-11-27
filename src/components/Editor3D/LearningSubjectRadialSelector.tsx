'use client';

import { useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Atom,
  BookOpen,
  BrainCircuit,
  Calculator,
  Check,
  Code2,
  Dna,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Network,
  Palette,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react';
import { LEARNING_SUBJECTS } from '@/lib/learning/subjects';
import type { LearningSubject } from '@/lib/learning/types';

type TopicSearchResult = {
  item: string;
  subject: LearningSubject;
};

type LearningSubjectRadialSelectorProps = {
  subjectId: string;
  expandedSubjectId: string | null;
  topic: string;
  topicSearch: string;
  matchingTopics: TopicSearchResult[];
  onChooseForMe: () => void;
  onSubjectSelect: (subject: LearningSubject) => void;
  onTopicSelect: (subject: LearningSubject, topic: string) => void;
  onReturnToSubjects: () => void;
  onTopicSearchChange: (value: string) => void;
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

const subjectTones: Record<string, string> = {
  mathematics: 'bg-slate-100 text-slate-900',
  physics: 'bg-violet-50 text-violet-700',
  chemistry: 'bg-emerald-50 text-emerald-700',
  biology: 'bg-rose-50 text-rose-700',
  geography: 'bg-teal-50 text-teal-700',
  history: 'bg-amber-50 text-amber-700',
  'arts-design': 'bg-purple-50 text-purple-700',
  computing: 'bg-pink-50 text-pink-700',
  languages: 'bg-orange-50 text-orange-700',
  interdisciplinary: 'bg-cyan-50 text-cyan-700',
};

const radialPositions = (count: number, radius: number) =>
  Array.from({ length: count }, (_, index) => {
    const angle = (-90 + (360 / count) * index) * (Math.PI / 180);
    return {
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
    };
  });

export default function LearningSubjectRadialSelector({
  subjectId,
  expandedSubjectId,
  topic,
  topicSearch,
  matchingTopics,
  onChooseForMe,
  onSubjectSelect,
  onTopicSelect,
  onReturnToSubjects,
  onTopicSearchChange,
}: LearningSubjectRadialSelectorProps) {
  const firstSubjectRef = useRef<HTMLButtonElement | null>(null);
  const activeSubject = LEARNING_SUBJECTS.find((subject) => subject.id === expandedSubjectId);
  const isTopicLevel = Boolean(activeSubject);
  const subjectPositions = radialPositions(LEARNING_SUBJECTS.length, 39);
  const topicPositions = radialPositions(activeSubject?.topics.length ?? 0, 39);
  const normalizedTopicSearch = topicSearch.trim();

  const renderSubjectButton = (subject: LearningSubject, index: number, compact = false) => {
    const Icon = subjectIcons[subject.id] ?? BookOpen;
    const isSelected = subjectId === subject.id;
    const position = subjectPositions[index];

    return (
      <button
        key={subject.id}
        ref={!compact && index === 0 ? firstSubjectRef : undefined}
        type="button"
        onClick={() => onSubjectSelect(subject)}
        title={subject.description}
        aria-pressed={isSelected}
        aria-expanded={expandedSubjectId === subject.id}
        tabIndex={isTopicLevel ? -1 : undefined}
        className={compact
          ? `group flex min-h-16 items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 motion-reduce:transition-none ${isSelected ? 'border-rose-300 bg-rose-50/80 shadow-sm ring-1 ring-rose-100' : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-100/50'}`
          : `absolute z-10 flex size-[clamp(4.1rem,11vw,6rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border p-1 text-center transition-all duration-500 ease-out hover:-translate-y-[calc(50%+4px)] hover:shadow-[0_16px_32px_-20px_rgba(15,23,42,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 active:scale-95 motion-reduce:transition-none ${isSelected ? 'border-rose-300 bg-white shadow-[0_12px_32px_-16px_rgba(225,29,72,0.3)] ring-4 ring-rose-100' : 'border-white bg-white/95 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.45)] ring-1 ring-slate-400/80 hover:border-slate-300 hover:ring-slate-200'}`}
        {...(!compact && position ? { style: { left: `${position.x}%`, top: `${position.y}%` } } : {})}
      >
        <span className={`flex shrink-0 items-center justify-center rounded-full ${compact ? 'size-9' : 'size-8 sm:size-9'} ${subjectTones[subject.id] ?? 'bg-slate-100 text-slate-900'}`}>
          <Icon size={compact ? 17 : 18} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <span className={compact ? 'min-w-0 flex-1' : 'min-w-0 max-w-full px-1'}>
          <span className={`block break-words ${compact ? 'text-xs' : 'text-[clamp(0.55rem,1.12vw,0.76rem)]'} font-semibold leading-tight text-slate-800`}>
            {subject.name}
          </span>
          {compact && <span className="mt-1 block text-[10px] text-slate-500">{subject.topics.length} assuntos</span>}
        </span>
        {isSelected && (
          <span className={compact ? 'ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white' : 'absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-rose-600 text-white'}>
            <Check size={compact ? 12 : 10} strokeWidth={3} aria-hidden="true" />
          </span>
        )}
      </button>
    );
  };

  const renderTopicButton = (subject: LearningSubject, item: string, index: number, compact = false, position?: { x: number; y: number }) => {
    const Icon = subjectIcons[subject.id] ?? BookOpen;
    const isSelected = topic === item && subjectId === subject.id;

    return (
      <button
        key={`${subject.id}-${item}`}
        type="button"
        onClick={() => onTopicSelect(subject, item)}
        title={item}
        aria-pressed={isSelected}
        tabIndex={isTopicLevel ? undefined : -1}
        className={compact
          ? `flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 motion-reduce:transition-none ${isSelected ? 'border-rose-300 bg-rose-50/80' : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-100/50'}`
          : `absolute z-10 flex size-[clamp(4.65rem,13vw,6.75rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border p-1.5 text-center transition-all duration-500 ease-out hover:-translate-y-[calc(50%+4px)] hover:shadow-[0_16px_32px_-20px_rgba(15,23,42,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 active:scale-95 motion-reduce:transition-none ${isSelected ? 'border-rose-300 bg-white shadow-[0_12px_32px_-16px_rgba(225,29,72,0.3)] ring-4 ring-rose-100' : 'border-white bg-white/95 shadow-[0_10px_26px_-18px_rgba(15,23,42,0.45)] ring-1 ring-slate-400/80 hover:border-slate-300 hover:ring-slate-200'}`}
        {...(!compact && position ? { style: { left: `${position.x}%`, top: `${position.y}%` } } : {})}
      >
        {compact ? (
          <>
            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${isSelected ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 text-xs font-medium leading-5 text-slate-800">{item}</span>
            {isSelected ? <Check size={15} className="shrink-0 text-rose-600" aria-hidden="true" /> : <ArrowRight size={14} className="shrink-0 text-slate-400" aria-hidden="true" />}
          </>
        ) : (
          <>
            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${subjectTones[subject.id] ?? 'bg-slate-100 text-slate-900'}`}>
              <Icon size={15} strokeWidth={2.1} aria-hidden="true" />
            </span>
            <span className="min-w-0 max-w-full break-words px-1 text-[clamp(0.52rem,1.05vw,0.72rem)] font-semibold leading-tight text-slate-800 text-balance">{item}</span>
            {isSelected && <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-rose-600 text-white"><Check size={10} strokeWidth={3} aria-hidden="true" /></span>}
          </>
        )}
      </button>
    );
  };

  return (
    <section className="relative mt-7 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_22px_70px_-52px_rgba(15,23,42,0.42)]">
      <div className="relative p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-900">Percurso de estudo</span>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">Explore as áreas do conhecimento</h2>
            <p className="mt-1 max-w-xl text-xs leading-5 text-slate-600">Escolha uma disciplina e aprofunde seu percurso até encontrar um assunto.</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-[10px] font-medium text-slate-600">{LEARNING_SUBJECTS.length} disciplinas</span>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          {isTopicLevel && activeSubject && (
            <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-100/70 px-3.5 py-3 sm:max-w-[19rem]">
              {(() => {
                const Icon = subjectIcons[activeSubject.id] ?? BookOpen;
                return <Icon size={16} className={subjectTones[activeSubject.id]?.split(' ')[1] ?? 'text-slate-900'} aria-hidden="true" />;
              })()}
              <span className="min-w-0"><span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Disciplina selecionada</span><span className="block truncate text-xs font-semibold text-slate-900">{activeSubject.name}</span></span>
              <button type="button" onClick={onReturnToSubjects} className="ml-auto flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-slate-900 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 motion-reduce:transition-none"><ArrowLeft size={13} aria-hidden="true" /> Trocar</button>
            </div>
          )}
        </div>
        {normalizedTopicSearch && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white/90" aria-label="Resultados da busca">
            <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">Resultados da busca</p>
              <span className="text-[10px] text-slate-500">{matchingTopics.length} encontrado{matchingTopics.length === 1 ? '' : 's'}</span>
            </div>
            {matchingTopics.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {matchingTopics.map(({ item, subject }) => {
                  const isSelected = topic === item && subjectId === subject.id;
                  const Icon = subjectIcons[subject.id] ?? BookOpen;
                  return (
                    <button
                      key={`${subject.id}-${item}`}
                      type="button"
                      onClick={() => onTopicSelect(subject, item)}
                      aria-pressed={isSelected}
                      className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-500 motion-reduce:transition-none ${isSelected ? 'bg-rose-50/80' : 'hover:bg-slate-100/60'}`}
                    >
                      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${subjectTones[subject.id] ?? 'bg-slate-100 text-slate-900'}`}><Icon size={15} aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1"><span className="block text-xs font-medium text-slate-900">{item}</span><span className="mt-0.5 block text-[10px] text-slate-500">{subject.name}</span></span>
                      {isSelected ? <Check size={14} className="shrink-0 text-rose-600" aria-hidden="true" /> : <ArrowRight size={14} className="shrink-0 text-slate-400" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="px-3.5 py-4 text-center text-xs text-slate-600">Nenhum assunto encontrado. Tente outro termo ou escreva um tema livre acima.</p>
            )}
          </div>
        )}

        <div className="relative mt-5 hidden min-[400px]:block" role="group" aria-label="Navegação radial de disciplinas e assuntos">
          <div className="relative mx-auto aspect-square w-full max-w-[700px] overflow-hidden">
            <div className="pointer-events-none absolute inset-[5%] rounded-full border border-slate-400/90" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-[15%] rounded-full border border-slate-400/90" aria-hidden="true" />

            <div className={`absolute inset-0 transition-all duration-500 ease-out motion-reduce:transition-none ${isTopicLevel ? 'pointer-events-none scale-[0.86] opacity-0' : 'pointer-events-auto scale-100 opacity-100'}`} aria-hidden={isTopicLevel}>
              <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
                {subjectPositions.map((position, index) => (
                  <line key={index} x1="50" y1="50" x2={position.x} y2={position.y} stroke={subjectId === LEARNING_SUBJECTS[index]?.id ? 'rgba(225,29,72,0.25)' : 'rgba(51,65,85,0.48)'} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                ))}
              </svg>
              {LEARNING_SUBJECTS.map((subject, index) => renderSubjectButton(subject, index))}
              <button
                type="button"
                onClick={() => firstSubjectRef.current?.focus()}
                aria-label="Selecionar uma disciplina"
                tabIndex={isTopicLevel ? -1 : 0}
                className="absolute left-1/2 top-1/2 z-20 flex size-[clamp(7.25rem,22vw,9.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white bg-white/95 text-center shadow-[0_20px_55px_-28px_rgba(15,23,42,0.22)] ring-1 ring-slate-400 transition-all duration-300 hover:scale-[1.03] hover:ring-4 hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400 motion-reduce:transition-none"
              >
                <span className="mb-1.5 flex size-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-900"><BookOpen size={20} aria-hidden="true" /></span>
                <span className="max-w-[8rem] text-[clamp(0.68rem,1.35vw,0.9rem)] font-semibold leading-tight text-slate-900">Selecionar disciplina</span>
                <span className="mt-1 text-[9px] font-medium text-slate-500">toque em uma área</span>
              </button>
            </div>

            {activeSubject && (
              <div key={activeSubject.id} className={`learning-radial-enter absolute inset-0 transition-all duration-500 ease-out motion-reduce:transition-none ${isTopicLevel ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-[0.86] opacity-0'}`} aria-hidden={!isTopicLevel}>
                <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
                  {topicPositions.map((position, index) => (
                    <line key={index} x1="50" y1="50" x2={position.x} y2={position.y} stroke={topic === activeSubject.topics[index] ? 'rgba(225,29,72,0.28)' : 'rgba(51,65,85,0.48)'} strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                  ))}
                </svg>
                {activeSubject.topics.map((item, index) => renderTopicButton(activeSubject, item, index, false, topicPositions[index]))}
                <button
                  type="button"
                  onClick={onReturnToSubjects}
                  aria-label={`Voltar às disciplinas de ${activeSubject.name}`}
                  tabIndex={isTopicLevel ? 0 : -1}
                  className="absolute left-1/2 top-1/2 z-20 flex size-[clamp(7.25rem,22vw,9.5rem)] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-rose-200 bg-white/95 p-3 text-center shadow-[0_20px_55px_-28px_rgba(15,23,42,0.2)] ring-1 ring-slate-400 transition-all duration-300 hover:scale-[1.03] hover:ring-4 hover:ring-rose-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400 motion-reduce:transition-none"
                >
                  {(() => {
                    const Icon = subjectIcons[activeSubject.id] ?? BookOpen;
                    return <span className={`mb-1.5 flex size-9 items-center justify-center rounded-2xl ${subjectTones[activeSubject.id] ?? 'bg-slate-100 text-slate-900'}`}><Icon size={19} aria-hidden="true" /></span>;
                  })()}
                  <span className="max-w-full text-[clamp(0.68rem,1.35vw,0.9rem)] font-semibold leading-tight text-slate-900">{activeSubject.name}</span>
                  <span className="mt-1 text-[9px] font-medium text-slate-900">{activeSubject.topics.length} assuntos · voltar</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 min-[400px]:hidden">
          {activeSubject ? (
            <div>
              <button type="button" onClick={onReturnToSubjects} className="mb-3 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 motion-reduce:transition-none"><ArrowLeft size={14} aria-hidden="true" /> Todas as disciplinas <span className="font-normal text-slate-500">/ {activeSubject.name}</span></button>
              <div className="space-y-2" aria-label={`Assuntos de ${activeSubject.name}`}>
                {activeSubject.topics.map((item, index) => renderTopicButton(activeSubject, item, index, true))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2" aria-label="Disciplinas disponíveis">
              {LEARNING_SUBJECTS.map((subject, index) => renderSubjectButton(subject, index, true))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/75 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <p className="text-[11px] leading-5 text-slate-600" role="status">
            {isTopicLevel && activeSubject
              ? topic.trim() ? `Assunto selecionado: ${topic}` : `Explore os assuntos cadastrados em ${activeSubject.name}.`
              : subjectId === 'general' ? 'O Coru vai identificar a melhor área a partir do tema que você escrever.' : 'Escolha uma disciplina para abrir seus assuntos.'}
          </p>
          {isTopicLevel && (
            <button type="submit" form="learning-start-form" disabled={!topic.trim()} className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600 disabled:opacity-100 motion-reduce:transition-none">
              <BookOpen size={14} aria-hidden="true" /> Começar com este assunto
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
