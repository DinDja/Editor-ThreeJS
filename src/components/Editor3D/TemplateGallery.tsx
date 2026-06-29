'use client';

import { useMemo, useState } from 'react';
import { Check, Cpu, Gauge, Sparkles, X, Zap } from 'lucide-react';
import { EXPERIENCE_TEMPLATES, type ExperienceTemplate, type ExperienceTemplateId, type TemplateCategory } from '@/lib/template-engine/templates';
import { getVisualPreset, VISUAL_PRESETS, type VisualPresetId } from '@/lib/template-engine/presets';
import type { PageNode } from '@/lib/page-builder/types';
import { useExperienceStore } from '@/store/experienceStore';

const CATEGORY_LABELS: Record<TemplateCategory | 'all', string> = {
  all: 'Todos',
  landing: 'Landing',
  institutional: 'Institucional',
  portfolio: 'Portfólio',
  saas: 'SaaS',
  product: 'Produto',
  event: 'Evento',
  education: 'Educação',
  immersive: 'Imersiva',
  editorial: 'Editorial',
  startup: 'Startup',
  game: 'Game',
};

const CATEGORIES: Array<TemplateCategory | 'all'> = [
  'all', 'landing', 'saas', 'product', 'portfolio', 'institutional', 'event', 'education', 'immersive', 'editorial', 'startup', 'game',
];

const PERFORMANCE_META: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  low: { label: 'Leve', color: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/8', icon: Gauge },
  medium: { label: 'Médio', color: 'text-amber-300 border-amber-400/30 bg-amber-400/8', icon: Cpu },
  high: { label: 'Pesado', color: 'text-rose-300 border-rose-400/30 bg-rose-400/8', icon: Zap },
};

const TYPE_LABELS: Record<string, string> = {
  sceneCanvas: '3D',
  form: 'Form',
  input: 'Input',
  textarea: 'Texto',
  image: 'Imagem',
  video: 'Vídeo',
  card: 'Cards',
  button: 'CTA',
  navbar: 'Nav',
  footer: 'Footer',
};

const PREVIEW_WIDTHS = [86, 64, 78, 92, 58, 74, 68, 84];

const countNodes = (nodes: PageNode[]): number =>
  nodes.reduce((total, node) => total + 1 + countNodes(node.children ?? []), 0);

const collectTypes = (nodes: PageNode[], set = new Set<string>()): Set<string> => {
  for (const node of nodes) {
    if (TYPE_LABELS[node.type]) set.add(node.type);
    collectTypes(node.children ?? [], set);
  }
  return set;
};

function TemplateCard({
  template,
  onApply,
}: {
  template: ExperienceTemplate;
  onApply: (id: ExperienceTemplateId) => void;
}) {
  const preset = getVisualPreset(template.presetId);
  const perf = PERFORMANCE_META[template.performance] ?? PERFORMANCE_META.medium;
  const PerfIcon = perf.icon;
  const preview = useMemo(() => {
    const page = template.createPage();
    const types = Array.from(collectTypes(page.children)).slice(0, 4);

    return {
      sections: page.children.slice(0, 8).map((node, index) => ({
        type: node.type,
        width: PREVIEW_WIDTHS[index % PREVIEW_WIDTHS.length],
      })),
      sectionCount: page.children.length,
      nodeCount: countNodes(page.children),
      types,
    };
  }, [template]);

  return (
    <button
      type="button"
      onClick={() => onApply(template.id)}
      className="group flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-left transition hover:border-emerald-400/50 hover:bg-neutral-900"
      style={{ background: `linear-gradient(160deg, ${preset.palette.surfaceAlt}55, ${preset.palette.background})` }}
    >
      <div
        className="relative h-32 w-full overflow-hidden rounded-lg border border-neutral-800"
        style={{ background: preset.background }}
      >
        <div className="absolute inset-x-3 top-8 grid gap-1.5">
          {preview.sections.map((section, index) => (
            <span
              key={`${section.type}-${index}`}
              className="h-2 rounded-full border border-white/10"
              style={{
                width: `${section.width}%`,
                background: index % 2 === 0 ? `${preset.palette.primary}55` : `${preset.palette.surfaceAlt}aa`,
                boxShadow: index === 0 ? `0 0 18px ${template.accent}55` : undefined,
              }}
            />
          ))}
        </div>
        <div className="absolute inset-x-3 bottom-3 flex items-end gap-1.5">
          {preset.swatch.map((color, i) => (
            <span
              key={i}
              className="h-6 w-6 rounded-md border border-white/10 shadow-lg"
              style={{ background: color, transform: `translateY(${i * 2}px)` }}
            />
          ))}
        </div>
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-neutral-700/60 bg-black/40 px-2 py-0.5 text-[9px] font-medium text-neutral-300 backdrop-blur">
          <PerfIcon size={10} className={perf.color.split(' ')[0]} />
          <span className={perf.color.split(' ')[0]}>{perf.label}</span>
        </div>
        <div
          className="absolute left-2 top-2 h-2 w-2 rounded-full"
          style={{ background: template.accent, boxShadow: `0 0 12px ${template.accent}` }}
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-neutral-100">{template.name}</h3>
        </div>
        <p className="text-[11px] leading-4 text-neutral-400">{template.description}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <span className="rounded border border-neutral-800 bg-black/10 px-1.5 py-0.5 text-[9px] text-neutral-500">
            {preview.sectionCount} seções
          </span>
          <span className="rounded border border-neutral-800 bg-black/10 px-1.5 py-0.5 text-[9px] text-neutral-500">
            {preview.nodeCount} componentes
          </span>
          {preview.types.map((type) => (
            <span key={type} className="rounded border border-neutral-800 bg-black/10 px-1.5 py-0.5 text-[9px] text-neutral-500">
              {TYPE_LABELS[type]}
            </span>
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="rounded border border-neutral-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-neutral-500">
            {CATEGORY_LABELS[template.category]}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-300 opacity-0 transition group-hover:opacity-100">
            <Check size={11} /> Aplicar
          </span>
        </div>
      </div>
    </button>
  );
}

export default function TemplateGallery({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  const [presetFilter, setPresetFilter] = useState<VisualPresetId | 'all'>('all');
  const applyTemplate = useExperienceStore((state) => state.applyTemplate);

  const filtered = useMemo(
    () =>
      EXPERIENCE_TEMPLATES.filter(
        (template) =>
          (category === 'all' || template.category === category) &&
          (presetFilter === 'all' || template.presetId === presetFilter),
      ),
    [category, presetFilter],
  );

  const handleApply = (id: ExperienceTemplateId) => {
    applyTemplate(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-[#151719] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-300" />
            <h2 className="text-sm font-semibold text-neutral-100">Galeria de Templates</h2>
            <span className="text-[11px] text-neutral-500">{EXPERIENCE_TEMPLATES.length} templates</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-neutral-800 px-5 py-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition ${
                category === cat
                  ? 'bg-emerald-400/12 text-emerald-200'
                  : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-neutral-600">Preset</span>
            <select
              value={presetFilter}
              onChange={(e) => setPresetFilter(e.target.value as VisualPresetId | 'all')}
              className="h-7 rounded-md border border-neutral-700/60 bg-neutral-900 px-2 text-[10px] text-neutral-300 outline-none focus:border-emerald-400"
            >
              <option value="all">Todos</option>
              {VISUAL_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid auto-rows-min grid-cols-2 gap-3 overflow-auto p-5 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((template) => (
            <TemplateCard key={template.id} template={template} onApply={handleApply} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full grid place-items-center py-16 text-sm text-neutral-500">
              Nenhum template nesta combinação de filtros.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
