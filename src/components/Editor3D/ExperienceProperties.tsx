'use client';

import { useMemo, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowRight,
  Box,
  Check,
  ChevronDown,
  Circle,
  Code2,
  Component,
  Copy,
  Database,
  Eye,
  EyeOff,
  Grid3X3,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Link2,
  Lock,
  LockOpen,
  Maximize,
  Minimize,
  Minus,
  Monitor,
  MousePointer2,
  Move,
  Package,
  Palette,
  PanelRight,
  Pencil,
  Plus,
  RectangleHorizontal,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  Type,
  Unlink,
  Zap,
} from 'lucide-react';
import {
  INTERACTION_ACTION_LABELS,
  INTERACTION_ACTIONS,
  INTERACTION_TRIGGER_LABELS,
  INTERACTION_TRIGGERS,
  type AnimationSettings,
  type InteractionAction,
  type InteractionTrigger,
} from '@/lib/interaction-engine/types';
import { exportTargetLabel } from '@/lib/export-engine/exportExperience';
import { flattenPageNodes, findPageNode } from '@/lib/page-builder/tree';
import type { ExportTarget, PageNode, PageStyle, PseudoClass } from '@/lib/page-builder/types';
import { computePreviewRuntimeMetrics } from '@/lib/preview-runtime/metrics';
import { useEditorStore } from '@/store/editorStore';
import { useDataModelStore } from '@/store/dataModelStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { useVariableStore } from '@/store/variableStore';
import { CursorLibrary } from './CursorLibrary';
import { EffectsPanel, GlobalStylePanel } from './EffectsPanel';
import {
  EmptyState,
  Field,
  Section,
  SegmentedControl,
  SelectField,
  TextField,
  ToggleRow,
  fieldInputClass,
  fieldLabelClass,
} from './ui/primitives';

const labelClass = fieldLabelClass;
const inputClass = fieldInputClass;

/* ----------------------------------------------------------------- Helpers */

const TYPE_LABELS: Record<string, string> = {
  section: 'Seção',
  container: 'Container',
  text: 'Texto',
  button: 'Botão',
  image: 'Imagem',
  video: 'Vídeo',
  card: 'Cartão',
  navbar: 'Barra de navegação',
  footer: 'Rodapé',
  sceneCanvas: 'Cena 3D',
  form: 'Formulário',
  input: 'Campo de texto',
  select: 'Lista de opções',
  textarea: 'Área de texto',
  label: 'Rótulo',
  modal: 'Modal',
  menu: 'Menu',
  menuitem: 'Item de menu',
  dataTable: 'Tabela de dados',
  dataForm: 'Formulário de dados',
  dataList: 'Lista de dados',
  dataChart: 'Gráfico',
  dataStat: 'Indicador',
  pageRoute: 'Rota de página',
};

const toCssNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const isColorLike = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)
    || /^rgba?\(/i.test(v)
    || /^hsla?\(/i.test(v)
    || v.startsWith('linear-gradient')
    || v.startsWith('radial-gradient');
};

const isOnlyColor = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)
    || /^rgba?\(/i.test(v)
    || /^hsla?\(/i.test(v);
};

const isTransparentValue = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  return v === 'transparent' || v === 'none' || v === '';
};

type Sides = { top: number; right: number; bottom: number; left: number };

const parseSides = (value: unknown): Sides => {
  const fallback: Sides = { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const parts = value.trim().split(/\s+/).map((p) => Number.parseFloat(p));
  if (parts.some((n) => !Number.isFinite(n))) return fallback;
  const [top = 0, right = 0, bottom = 0, left = 0] = parts;
  if (parts.length === 1) return { top, right: top, bottom: top, left: top };
  if (parts.length === 2) return { top, right, bottom: top, left: right };
  return { top, right, bottom, left };
};

const sidesToCss = (sides: Sides): string =>
  `${sides.top}px ${sides.right}px ${sides.bottom}px ${sides.left}px`;

/* -------------------------------------------------- Friendly Field widgets */

function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = 'px',
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <span className={labelClass}>{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
            className="h-6 w-14 rounded border border-neutral-700/60 bg-[#0d0f10] px-1.5 text-right text-[11px] text-neutral-100 outline-none transition focus:border-emerald-400"
          />
          <span className="text-[9px] uppercase text-neutral-600">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-neutral-800 accent-emerald-400"
        aria-label={label}
      />
      {hint && <span className="text-[10px] text-neutral-600">{hint}</span>}
    </div>
  );
}

function SpacingField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: unknown;
  onChange: (css: string) => void;
  hint?: string;
}) {
  const initial = parseSides(value);
  const [linked, setLinked] = useState(true);
  const [sides, setSides] = useState<Sides>(initial);

  // If the parent value changes externally, re-parse it.
  const current = parseSides(value);
  const isStale = (
    sides.top !== current.top
    || sides.right !== current.right
    || sides.bottom !== current.bottom
    || sides.left !== current.left
  );
  if (isStale && (current.top + current.right + current.bottom + current.left > 0 || isTransparentValue(value))) {
    // sync state with the latest value
    setSides(current);
  }

  const update = (next: Partial<Sides>) => {
    const merged = { ...sides, ...next };
    setSides(merged);
    onChange(linked ? sidesToCss({
      top: merged.top, right: merged.left, bottom: merged.top, left: merged.left,
    }) : sidesToCss(merged));
  };

  return (
    <div className="grid gap-2 rounded-md border border-neutral-800 bg-neutral-950/30 p-2.5">
      <div className="flex items-center justify-between">
        <span className={labelClass}>{label}</span>
        <button
          type="button"
          onClick={() => {
            const next = !linked;
            setLinked(next);
            if (next) {
              onChange(sidesToCss({
                top: sides.top, right: sides.left, bottom: sides.top, left: sides.left,
              }));
            } else {
              onChange(sidesToCss(sides));
            }
          }}
          className={`grid h-6 w-6 place-items-center rounded transition ${
            linked ? 'bg-emerald-400/15 text-emerald-300' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
          }`}
          title={linked ? 'Valores vinculados (mude um e todos acompanham)' : 'Valores independentes por lado'}
          aria-label="Vincular lados"
          aria-pressed={linked}
        >
          <Link2 size={11} />
        </button>
      </div>
      <div className="relative aspect-square w-full max-w-[120px] self-center">
        <div className="absolute inset-0 rounded border border-dashed border-neutral-700 bg-neutral-950" />
        <div
          className="absolute rounded border border-emerald-400/50 bg-emerald-400/10"
          style={{
            top: Math.min(sides.top, 60),
            right: Math.min(sides.right, 60),
            bottom: Math.min(sides.bottom, 60),
            left: Math.min(sides.left, 60),
          }}
        />
        {[
          { key: 'top', pos: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' },
          { key: 'right', pos: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2' },
          { key: 'bottom', pos: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' },
          { key: 'left', pos: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2' },
        ].map((side) => (
          <input
            key={side.key}
            type="number"
            value={sides[side.key as keyof Sides]}
            min={0}
            max={500}
            onChange={(e) => update({ [side.key]: Math.max(0, Number(e.target.value) || 0) } as Partial<Sides>)}
            className={`absolute h-6 w-10 -translate-x-1/2 -translate-y-1/2 rounded border border-neutral-700/60 bg-[#0d0f10] px-1 text-center text-[10px] text-neutral-100 outline-none transition focus:border-emerald-400 ${
              side.pos
            }`}
            aria-label={side.key}
            placeholder="0"
          />
        ))}
      </div>
      {hint && <span className="text-[10px] text-neutral-600">{hint}</span>}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const safe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : '#000000';
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <span className={labelClass}>{label}</span>
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={safe}
            onChange={(event) => onChange(event.target.value)}
            className="h-7 w-8 shrink-0 cursor-pointer rounded-md border border-neutral-700/80 bg-transparent p-0.5 outline-none transition focus:border-emerald-400"
            aria-label={`${label} cor`}
          />
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="#000000 ou rgba(…)"
            className="h-7 w-32 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 font-mono text-[11px] text-neutral-100 outline-none transition focus:border-emerald-400"
          />
        </div>
      </div>
    </div>
  );
}

function BackgroundField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isColor = isOnlyColor(value);
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-950/40 p-0.5">
        {(['Cor', 'Gradiente', 'Imagem'] as const).map((tab) => {
          const isActive =
            tab === 'Cor'
              ? (isColor || isTransparentValue(value))
              : tab === 'Gradiente'
                ? typeof value === 'string' && value.startsWith('linear-gradient')
                : typeof value === 'string' && value.startsWith('url(');
          return (
            <button
              key={tab}
              type="button"
              onClick={() => {
                if (tab === 'Cor' && !isColor) onChange('#34d399');
                else if (tab === 'Gradiente' && !value.startsWith('linear-gradient')) {
                  onChange('linear-gradient(135deg, #34d399 0%, #38bdf8 100%)');
                } else if (tab === 'Imagem' && !value.startsWith('url(')) {
                  onChange('url(https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280)');
                }
              }}
              className={`flex-1 rounded px-2 py-1 text-[10px] font-medium transition ${
                isActive
                  ? 'bg-emerald-400/15 text-emerald-200'
                  : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              {tab}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange('transparent')}
          className="rounded px-2 py-1 text-[10px] text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-300"
          title="Remover fundo"
        >
          Nenhum
        </button>
      </div>
      {isColor || isTransparentValue(value) ? (
        <ColorField label="Cor de fundo" value={value || '#000000'} onChange={onChange} />
      ) : (
        <div className="grid gap-1.5">
          <span className={labelClass}>Valor</span>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={`${fieldInputClass} font-mono`}
            placeholder="linear-gradient(…) ou url(…)"
          />
        </div>
      )}
    </div>
  );
}

function SegmentedIcons<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; icon: React.ReactNode; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-neutral-800 bg-neutral-950/60 p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.label}
            aria-label={option.label}
            aria-pressed={active}
            className={`grid h-7 w-7 place-items-center rounded transition ${
              active
                ? 'bg-emerald-400/15 text-emerald-200 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.35)]'
                : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
            }`}
          >
            {option.icon}
          </button>
        );
      })}
    </div>
  );
}

function QuickPresets({
  node,
  onApply,
}: {
  node: PageNode;
  onApply: (patch: Partial<PageStyle>) => void;
}) {
  const presets: Array<{ id: string; label: string; icon: React.ReactNode; patch: Partial<PageStyle> }> = [
    {
      id: 'card-soft',
      label: 'Cartão suave',
      icon: <Square size={11} />,
      patch: {
        background: '#181b1d',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '24px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
      },
    },
    {
      id: 'button-primary',
      label: 'Botão primário',
      icon: <Box size={11} />,
      patch: {
        background: '#34d399',
        color: '#06231b',
        padding: '12px 24px',
        borderRadius: 8,
        fontWeight: 700,
        textAlign: 'center',
        display: 'flex',
      },
    },
    {
      id: 'section-hero',
      label: 'Seção hero',
      icon: <Maximize size={11} />,
      patch: {
        width: '100%',
        minHeight: 520,
        padding: '96px 72px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #101214 0%, #17201d 48%, #101419 100%)',
      },
    },
    {
      id: 'container-narrow',
      label: 'Container',
      icon: <RectangleHorizontal size={11} />,
      patch: {
        width: '100%',
        maxWidth: 1160,
        margin: '0 auto',
        padding: '24px',
        display: 'flex',
        gap: 24,
      },
    },
    {
      id: 'text-large',
      label: 'Título grande',
      icon: <Type size={11} />,
      patch: {
        fontSize: 48,
        fontWeight: 700,
        lineHeight: 1.1,
        color: '#f9fafb',
      },
    },
    {
      id: 'pill',
      label: 'Pílula',
      icon: <Circle size={11} />,
      patch: {
        borderRadius: 9999,
        padding: '8px 20px',
        display: 'flex',
      },
    },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {presets.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onApply(preset.patch)}
          className="flex flex-col items-center gap-1 rounded-md border border-neutral-800 bg-neutral-950/40 p-2 text-[10px] font-medium text-neutral-300 transition hover:border-emerald-400/40 hover:bg-emerald-400/5 hover:text-emerald-200"
        >
          <span className="grid h-6 w-6 place-items-center rounded bg-emerald-400/10 text-emerald-300">
            {preset.icon}
          </span>
          {preset.label}
        </button>
      ))}
    </div>
  );
}

function PseudoField({ label, placeholder, node, pseudo, bp, prop, onChange }: {
  label: string;
  placeholder: string;
  node: PageNode;
  pseudo: PseudoClass | null;
  bp: string;
  prop: keyof PageStyle;
  onChange: (value: string) => void;
}) {
  const pseudoStyles = pseudo && node.pseudo?.[pseudo]?.[bp];
  const value = pseudoStyles ? String((pseudoStyles as Record<string, unknown>)?.[prop] ?? '') : '';
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-2">
      <span className="text-[10px] text-neutral-500">{label}</span>
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

function WebNodeProperties() {
  const page = useExperienceStore((state) => state.page);
  const selectedPageNodeId = useExperienceStore((state) => state.selectedPageNodeId);
  const selectedPageNodeIds = useExperienceStore((state) => state.selectedPageNodeIds);
  const setSelectedPageNode = useExperienceStore((state) => state.setSelectedPageNode);
  const updatePageNode = useExperienceStore((state) => state.updatePageNode);
  const updatePageNodeStyle = useExperienceStore((state) => state.updatePageNodeStyle);
  const updatePageNodePseudoStyle = useExperienceStore((state) => state.updatePageNodePseudoStyle);
  const updatePageNodeProps = useExperienceStore((state) => state.updatePageNodeProps);
  const removePageNode = useExperienceStore((state) => state.removePageNode);
  const duplicatePageNode = useExperienceStore((state) => state.duplicatePageNode);
  const addPageNode = useExperienceStore((state) => state.addPageNode);
  const togglePageNodeLock = useExperienceStore((state) => state.togglePageNodeLock);
  const togglePageNodeVisibility = useExperienceStore((state) => state.togglePageNodeVisibility);
  const syncComponentInstances = useExperienceStore((state) => state.syncComponentInstances);
  const detachComponentInstance = useExperienceStore((state) => state.detachComponentInstance);
  const removePageNodes = useExperienceStore((state) => state.removePageNodes);
  const duplicatePageNodes = useExperienceStore((state) => state.duplicatePageNodes);
  const isMultiSelect = selectedPageNodeIds.length > 1;
  const node = findPageNode(page.children, selectedPageNodeId);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingPseudo, setEditingPseudo] = useState<PseudoClass | null>(null);

  if (isMultiSelect) {
    return (
      <div className="ed-scroll flex h-full min-h-0 flex-col overflow-auto">
        <div className="border-b border-neutral-800 bg-[#151719] px-3 py-2.5">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Propriedades</div>
          <div className="text-[11px] text-neutral-300">{selectedPageNodeIds.length} elementos</div>
        </div>
        <div className="flex-1 space-y-3 px-3 py-3">
          <div className="rounded-md border border-sky-400/30 bg-sky-400/[0.06] p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-sky-200">
              <Package size={12} />
              {selectedPageNodeIds.length} elementos selecionados
            </div>
            <p className="mt-2 text-[11px] leading-4 text-neutral-300">
              Para editar o visual de vários elementos ao mesmo tempo, use os botões na barra superior:
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] text-neutral-300">
              <li className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded bg-neutral-800 text-[9px]">⤓</span>
                Subir/Descer — mover na lista
              </li>
              <li className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded bg-neutral-800 text-[9px]">⊟</span>
                Alinhar — esquerda/centro/direita/topo/meio/base
              </li>
              <li className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded bg-neutral-800 text-[9px]">⇅</span>
                Ordem Z — frente/trás
              </li>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => duplicatePageNodes(selectedPageNodeIds)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/[0.08] px-3 py-2.5 text-[12px] font-medium text-emerald-200 transition hover:border-emerald-400/60 hover:bg-emerald-400/[0.12]"
          >
            <Copy size={13} />
            Duplicar {selectedPageNodeIds.length} elementos
          </button>
          <button
            type="button"
            onClick={() => removePageNodes(selectedPageNodeIds)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-red-400/30 bg-red-400/[0.08] px-3 py-2.5 text-[12px] font-medium text-red-200 transition hover:border-red-400/60 hover:bg-red-400/[0.12]"
          >
            <Trash2 size={13} />
            Remover {selectedPageNodeIds.length} elementos
          </button>
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="ed-scroll min-h-0 flex-1 space-y-1 overflow-auto py-3">
        <GlobalStylePanel />
        <CursorLibrary />
        <EffectsPanel />
        <EmptyState
          icon={<MousePointer2 size={20} />}
          title="Nada selecionado"
          description="Clique em um elemento no canvas ou na árvore para editar suas propriedades."
          action={
            <div className="flex flex-wrap justify-center gap-1.5">
              <button
                type="button"
                onClick={() => addPageNode('section')}
                className="flex h-8 items-center gap-1.5 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 text-[11px] font-medium text-emerald-200 transition hover:border-emerald-300/60"
              >
                <Plus size={12} />
                Seção
              </button>
              <button
                type="button"
                onClick={() => addPageNode('text')}
                className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-700/60 px-3 text-[11px] font-medium text-neutral-300 transition hover:border-emerald-400/40 hover:text-emerald-200"
              >
                <Plus size={12} />
                Texto
              </button>
              <button
                type="button"
                onClick={() => addPageNode('button')}
                className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-700/60 px-3 text-[11px] font-medium text-medium text-neutral-300 transition hover:border-emerald-400/40 hover:text-emerald-200"
              >
                <Plus size={12} />
                Botão
              </button>
            </div>
          }
        />
      </div>
    );
  }

  const style = node.styles.base ?? {};
  const styleValue = (key: keyof PageStyle) => style[key] ?? '';
  const setStyle = (key: keyof PageStyle, value: string | number) => {
    updatePageNodeStyle(node.id, { [key]: value } as Partial<PageStyle>, 'base');
  };
  const setProp = (key: string, value: unknown) => updatePageNodeProps(node.id, { [key]: value });

  const showTypography = ['text', 'button', 'card', 'navbar', 'footer', 'label', 'menuitem', 'modal', 'dataForm', 'dataStat'].includes(node.type);

  return (
    <div className="ed-scroll min-h-0 flex-1 space-y-1 overflow-auto py-3">
      <GlobalStylePanel />
      <CursorLibrary />
      <EffectsPanel />

      {/* Header: tipo + ações rápidas */}
      <div className="px-2">
        <div className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950/50 px-2.5 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-emerald-400/10 text-emerald-300">
            {node.type === 'section' ? <Maximize size={16} /> :
             node.type === 'container' ? <Grid3X3 size={16} /> :
             node.type === 'text' ? <Type size={16} /> :
             node.type === 'button' ? <Box size={16} /> :
             node.type === 'image' ? <ImageIcon size={16} /> :
             node.type === 'card' ? <Layers size={16} /> :
             node.type === 'navbar' ? <PanelRight size={16} /> :
             node.type === 'footer' ? <PanelRight size={16} className="rotate-180" /> :
             node.type === 'video' ? <ImageIcon size={16} /> :
             <Box size={16} />}
          </span>
          <div className="min-w-0 flex-1">
            <input
              value={node.name}
              onChange={(event) => updatePageNode(node.id, { name: event.target.value })}
              className="h-6 w-full truncate rounded bg-transparent px-1 text-[13px] font-semibold text-neutral-100 outline-none transition focus:bg-[#0d0f10]"
              placeholder="Nome do elemento"
            />
            <div className="px-1 text-[10px] uppercase tracking-[0.14em] text-neutral-500">{TYPE_LABELS[node.type] ?? node.type}</div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => duplicatePageNode(node.id)}
            className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-neutral-700/60 text-[11px] text-neutral-300 transition hover:border-emerald-400/50 hover:text-emerald-200"
          >
            <Copy size={12} />
            Duplicar
          </button>
          <button
            type="button"
            onClick={() => togglePageNodeLock(node.id)}
            className={`grid h-8 w-8 place-items-center rounded-md border transition ${
              node.locked
                ? 'border-amber-400/60 bg-amber-400/10 text-amber-200'
                : 'border-neutral-700/60 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200'
            }`}
            title={node.locked ? 'Desbloquear' : 'Bloquear'}
            aria-pressed={node.locked}
          >
            {node.locked ? <LockOpen size={12} /> : <Lock size={12} />}
          </button>
          <button
            type="button"
            onClick={() => togglePageNodeVisibility(node.id)}
            className={`grid h-8 w-8 place-items-center rounded-md border transition ${
              node.hidden
                ? 'border-amber-400/60 bg-amber-400/10 text-amber-200'
                : 'border-neutral-700/60 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200'
            }`}
            title={node.hidden ? 'Mostrar' : 'Ocultar'}
            aria-pressed={node.hidden}
          >
            {node.hidden ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Remover "${node.name}"?`)) removePageNode(node.id);
            }}
            className="grid h-8 w-8 place-items-center rounded-md border border-red-400/20 text-red-300 transition hover:border-red-400/60 hover:bg-red-400/[0.08]"
            title="Remover"
            aria-label="Remover"
          >
            <Trash2 size={12} />
          </button>
        </div>
        {node.componentId && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/[0.08] px-2.5 py-1.5 text-[11px]">
            <Component size={12} className="shrink-0 text-emerald-300" />
            <span className="flex-1 text-emerald-200">Vinculado a um componente</span>
            <button
              type="button"
              onClick={() => syncComponentInstances(node.componentId!)}
              className="grid h-6 w-6 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200"
              title="Atualizar do original"
            >
              <Copy size={11} />
            </button>
            <button
              type="button"
              onClick={() => detachComponentInstance(node.id)}
              className="grid h-6 w-6 place-items-center rounded text-neutral-400 transition hover:bg-amber-500/15 hover:text-amber-200"
              title="Desvincular (vira cópia independente)"
            >
              <Unlink size={11} />
            </button>
          </div>
        )}
      </div>

      <Section title="Conteúdo" icon={<Type size={11} />} defaultOpen={true}>
        {renderContentEditor(node.type, node.props, setProp)}
      </Section>

      <Section title="Estilo rápido" icon={<Sparkles size={11} />} defaultOpen={true}>
        <QuickPresets
          node={node}
          onApply={(patch) => updatePageNodeStyle(node.id, patch, 'base')}
        />
        <p className="text-[10px] leading-3 text-neutral-500">
          Aplica um conjunto de estilos prontos. Você pode ajustar tudo abaixo.
        </p>
      </Section>

      <Section title="Tamanho" icon={<Maximize size={11} />} defaultOpen={true}>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <span className={labelClass}>Largura</span>
            <div className="flex gap-1">
              <input
                value={String(styleValue('width'))}
                onChange={(event) => setStyle('width', event.target.value)}
                placeholder="auto"
                className={`${inputClass} font-mono`}
              />
            </div>
            <div className="flex gap-0.5">
              {[
                { label: 'Auto', value: 'auto' },
                { label: 'Cheia', value: '100%' },
                { label: 'Tela', value: '100vw' },
                { label: 'Ajustar', value: 'fit-content' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setStyle('width', preset.value)}
                  className="flex-1 rounded border border-neutral-800 px-1 py-0.5 text-[9px] text-neutral-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <span className={labelClass}>Altura</span>
            <input
              value={String(styleValue('height'))}
              onChange={(event) => setStyle('height', event.target.value)}
              placeholder="auto"
              className={`${inputClass} font-mono`}
            />
            <div className="flex gap-0.5">
              {[
                { label: 'Auto', value: 'auto' },
                { label: 'Cheia', value: '100%' },
                { label: 'Tela', value: '100vh' },
                { label: 'Mínima', value: 'min-content' },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setStyle('height', preset.value)}
                  className="flex-1 rounded border border-neutral-800 px-1 py-0.5 text-[9px] text-neutral-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {(String(styleValue('width')) || String(styleValue('height')) || String(styleValue('minHeight')) || String(styleValue('maxWidth'))) && (
          <button
            type="button"
            onClick={() => updatePageNodeStyle(node.id, { width: undefined, height: undefined, minHeight: undefined, maxWidth: undefined }, 'base')}
            className="flex items-center gap-1 text-[10px] text-neutral-500 transition hover:text-rose-300"
          >
            <Minimize size={10} />
            Resetar tamanho para automático
          </button>
        )}
      </Section>

      <Section title="Espaçamento" icon={<Move size={11} />} defaultOpen={true}>
        <SpacingField
          label="Espaçamento interno (padding)"
          value={styleValue('padding')}
          onChange={(value) => setStyle('padding', value)}
          hint="Distância entre o conteúdo e a borda."
        />
        <SpacingField
          label="Espaçamento externo (margin)"
          value={styleValue('margin')}
          onChange={(value) => setStyle('margin', value)}
          hint="Distância até outros elementos."
        />
        <SliderField
          label="Distância entre itens"
          value={toCssNumber(styleValue('gap'))}
          onChange={(value) => setStyle('gap', value)}
          min={0}
          max={128}
          hint="Usado em containers, listas e grids."
        />
      </Section>

      <Section title="Cores" icon={<Palette size={11} />} defaultOpen={true}>
        <BackgroundField value={String(styleValue('background'))} onChange={(value) => setStyle('background', value)} />
        <ColorField
          label="Cor do texto"
          value={String(styleValue('color'))}
          onChange={(value) => setStyle('color', value)}
        />
      </Section>

      {showTypography && (
        <Section title="Texto" icon={<Type size={11} />} defaultOpen={true}>
          <div className="grid gap-2">
            <span className={labelClass}>Tamanho da fonte</span>
            <div className="flex flex-wrap gap-1">
              {[
                { label: 'P', size: 12 },
                { label: 'M', size: 16 },
                { label: 'G', size: 20 },
                { label: 'XG', size: 28 },
                { label: '2XG', size: 40 },
                { label: '3XG', size: 56 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setStyle('fontSize', preset.size)}
                  className="min-w-[40px] rounded border border-neutral-800 px-2 py-1 text-[11px] font-medium text-neutral-300 transition hover:border-emerald-400/50 hover:text-emerald-200"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <SliderField
              label="Personalizado"
              value={toCssNumber(styleValue('fontSize'))}
              onChange={(value) => setStyle('fontSize', value)}
              min={8}
              max={120}
            />
          </div>
          <div className="grid gap-1.5">
            <span className={labelClass}>Espessura</span>
            <SegmentedIcons
              value={String(styleValue('fontWeight') || '400')}
              onChange={(value) => setStyle('fontWeight', value)}
              options={[
                { value: '300', label: 'Leve', icon: <Minus size={12} /> },
                { value: '400', label: 'Normal', icon: <span className="text-[10px]">N</span> },
                { value: '600', label: 'Forte', icon: <span className="text-[10px] font-bold">B</span> },
                { value: '700', label: 'Negrito', icon: <span className="text-[11px] font-black">B</span> },
              ]}
            />
          </div>
          <div className="grid gap-1.5">
            <span className={labelClass}>Alinhamento</span>
            <SegmentedIcons
              value={String(styleValue('textAlign') || 'left')}
              onChange={(value) => setStyle('textAlign', value as 'left' | 'center' | 'right')}
              options={[
                { value: 'left', label: 'Esquerda', icon: <AlignLeft size={12} /> },
                { value: 'center', label: 'Centro', icon: <AlignCenter size={12} /> },
                { value: 'right', label: 'Direita', icon: <AlignRight size={12} /> },
              ]}
            />
          </div>
          <SliderField
            label="Altura da linha"
            value={toCssNumber(styleValue('lineHeight')) || 1.5}
            onChange={(value) => setStyle('lineHeight', value)}
            min={0.8}
            max={3}
            step={0.1}
            unit=""
            hint="Multiplicador (ex: 1.5 = 150%)."
          />
        </Section>
      )}

      <Section title="Disposição" icon={<LayoutGrid size={11} />} defaultOpen={false}>
        <div className="grid gap-1.5">
          <span className={labelClass}>Como os filhos se organizam</span>
          <SegmentedIcons
            value={String(styleValue('display') || 'block')}
            onChange={(value) => setStyle('display', value)}
            options={[
              { value: 'block', label: 'Em bloco', icon: <Square size={12} /> },
              { value: 'flex', label: 'Em linha', icon: <ArrowRight size={12} /> },
              { value: 'grid', label: 'Em grade', icon: <Grid3X3 size={12} /> },
              { value: 'none', label: 'Ocultar', icon: <EyeOff size={12} /> },
            ]}
          />
        </div>
        {String(styleValue('display')) === 'flex' && (
          <>
            <div className="grid gap-1.5">
              <span className={labelClass}>Direção</span>
              <SegmentedIcons
                value={String(styleValue('flexDirection') || 'row')}
                onChange={(value) => setStyle('flexDirection', value as 'row' | 'column')}
                options={[
                  { value: 'row', label: 'Horizontal', icon: <ArrowRight size={12} /> },
                  { value: 'column', label: 'Vertical', icon: <ArrowDown size={12} /> },
                ]}
              />
            </div>
            <div className="grid gap-1.5">
              <span className={labelClass}>Alinhar filhos (horizontal)</span>
              <SegmentedIcons
                value={String(styleValue('justifyContent') || 'flex-start')}
                onChange={(value) => setStyle('justifyContent', value)}
                options={[
                  { value: 'flex-start', label: 'Início', icon: <AlignLeft size={12} /> },
                  { value: 'center', label: 'Centro', icon: <AlignCenter size={12} /> },
                  { value: 'flex-end', label: 'Fim', icon: <AlignRight size={12} /> },
                ]}
              />
            </div>
            <div className="grid gap-1.5">
              <span className={labelClass}>Alinhar filhos (vertical)</span>
              <SegmentedIcons
                value={String(styleValue('alignItems') || 'stretch')}
                onChange={(value) => setStyle('alignItems', value)}
                options={[
                  { value: 'flex-start', label: 'Topo', icon: <AlignLeft size={12} className="rotate-90" /> },
                  { value: 'center', label: 'Centro', icon: <AlignCenter size={12} /> },
                  { value: 'flex-end', label: 'Base', icon: <AlignRight size={12} className="rotate-90" /> },
                  { value: 'stretch', label: 'Esticar', icon: <Minus size={12} className="rotate-90" /> },
                ]}
              />
            </div>
          </>
        )}
        <div className="grid gap-1.5">
          <span className={labelClass}>Posição</span>
          <SegmentedIcons
            value={String(styleValue('position') || 'relative')}
            onChange={(value) => setStyle('position', value)}
            options={[
              { value: 'static', label: 'Normal', icon: <Square size={12} /> },
              { value: 'relative', label: 'Relativo', icon: <Move size={12} /> },
              { value: 'absolute', label: 'Absoluto', icon: <Layers size={12} /> },
              { value: 'fixed', label: 'Fixo', icon: <Maximize size={12} /> },
            ]}
          />
        </div>
      </Section>

      <Section title="Borda" icon={<Square size={11} />} defaultOpen={false}>
        <div className="grid gap-1.5">
          <span className={labelClass}>Borda</span>
          <input
            value={String(styleValue('border'))}
            onChange={(event) => setStyle('border', event.target.value)}
            placeholder="1px solid #cccccc"
            className={`${inputClass} font-mono`}
          />
          <div className="flex gap-1">
            {[
              { label: 'Nenhuma', value: 'none' },
              { label: 'Fina', value: '1px solid rgba(255,255,255,0.15)' },
              { label: 'Média', value: '2px solid rgba(255,255,255,0.2)' },
              { label: 'Espessa', value: '4px solid rgba(255,255,255,0.25)' },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setStyle('border', preset.value)}
                className="flex-1 rounded border border-neutral-800 px-1 py-1 text-[10px] text-neutral-300 transition hover:border-emerald-400/50 hover:text-emerald-200"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <SliderField
          label="Arredondamento"
          value={toCssNumber(styleValue('borderRadius'))}
          onChange={(value) => setStyle('borderRadius', value)}
          min={0}
          max={64}
        />
        <div className="flex gap-0.5">
          {[
            { label: 'Quadrado', value: 0 },
            { label: 'Suave', value: 8 },
            { label: 'Arredondado', value: 16 },
            { label: 'Pílula', value: 9999 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setStyle('borderRadius', preset.value)}
              className="flex-1 rounded border border-neutral-800 px-1 py-1 text-[10px] text-neutral-300 transition hover:border-emerald-400/50 hover:text-emerald-200"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid gap-1.5">
          <span className={labelClass}>Sombra</span>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Nenhuma', value: 'none' },
              { label: 'Suave', value: '0 2px 8px rgba(0,0,0,0.15)' },
              { label: 'Média', value: '0 8px 24px rgba(0,0,0,0.25)' },
              { label: 'Forte', value: '0 16px 40px rgba(0,0,0,0.4)' },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setStyle('boxShadow', preset.value)}
                className="flex h-12 flex-col items-center justify-center gap-1 rounded border border-neutral-800 text-[10px] text-neutral-300 transition hover:border-emerald-400/50 hover:text-emerald-200"
                style={{ boxShadow: preset.value === 'none' ? 'none' : preset.value }}
              >
                <span>Aa</span>
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <SliderField
          label="Opacidade"
          value={toCssNumber(styleValue('opacity') || 1)}
          onChange={(value) => setStyle('opacity', value)}
          min={0}
          max={1}
          step={0.05}
          unit=""
        />
      </Section>

      <Section title="Estados" icon={<Zap size={11} />} defaultOpen={false}>
        <div className="grid grid-cols-4 gap-1 rounded-md border border-neutral-800 bg-neutral-950/60 p-0.5">
          {[
            { value: null, label: 'Normal' },
            { value: 'hover' as const, label: 'Hover' },
            { value: 'active' as const, label: 'Pressionado' },
            { value: 'focus' as const, label: 'Foco' },
          ].map((state) => {
            const active = editingPseudo === state.value;
            return (
              <button
                key={state.label}
                type="button"
                onClick={() => setEditingPseudo(state.value)}
                className={`h-8 rounded text-[10px] font-medium uppercase tracking-[0.12em] transition ${
                  active ? 'bg-emerald-400/15 text-emerald-200' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
                }`}
              >
                {state.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] leading-3 text-neutral-500">
          Estados diferentes do elemento ao interagir. As mudanças de cor e fundo são as mais comuns.
        </p>
        {editingPseudo && (
          <div className="grid gap-3 rounded-md border border-emerald-400/20 bg-emerald-400/[0.04] p-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
              Estilo de :{editingPseudo}
            </div>
            <BackgroundField
              value={String(node.pseudo?.[editingPseudo]?.base?.background ?? '')}
              onChange={(value) => updatePageNodePseudoStyle(node.id, editingPseudo, { background: value } as Partial<PageStyle>, 'base')}
            />
            <ColorField
              label="Cor do texto"
              value={String(node.pseudo?.[editingPseudo]?.base?.color ?? '')}
              onChange={(value) => updatePageNodePseudoStyle(node.id, editingPseudo, { color: value } as Partial<PageStyle>, 'base')}
            />
            <SliderField
              label="Escala"
              value={toCssNumber(node.pseudo?.[editingPseudo]?.base?.transform?.toString().match(/scale\(([^)]+)\)/)?.[1] ?? 1) || 1}
              onChange={(value) => updatePageNodePseudoStyle(node.id, editingPseudo, { transform: `scale(${value})` } as Partial<PageStyle>, 'base')}
              min={0.5}
              max={2}
              step={0.05}
              unit="x"
            />
          </div>
        )}
      </Section>

      <div className="px-2 pt-1">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950/30 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 transition hover:border-neutral-700 hover:text-neutral-200"
        >
          <Code2 size={11} />
          {showAdvanced ? 'Ocultar opções avançadas' : 'Opções avançadas (CSS)'}
          <ChevronDown size={11} className={`ml-auto transition ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showAdvanced && (
        <Section title="Avançado" icon={<Code2 size={11} />} defaultOpen={true}>
          <p className="text-[10px] leading-3 text-neutral-500">
            Acesso direto às propriedades CSS para usuários avançados.
          </p>
          <Field label="Background (CSS)">
            <input
              value={String(styleValue('background'))}
              onChange={(event) => setStyle('background', event.target.value)}
              placeholder="rgba, gradient, url…"
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Background image">
            <input
              value={String(styleValue('backgroundImage'))}
              onChange={(event) => setStyle('backgroundImage', event.target.value)}
              placeholder="url(…)"
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Colunas do grid">
            <input
              value={String(styleValue('gridTemplateColumns'))}
              onChange={(event) => setStyle('gridTemplateColumns', event.target.value)}
              placeholder="1fr 1fr 1fr"
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Transform">
            <input
              value={String(styleValue('transform'))}
              onChange={(event) => setStyle('transform', event.target.value)}
              placeholder="rotate(15deg) scale(1.1)"
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Transição">
            <input
              value={String(styleValue('transition'))}
              onChange={(event) => setStyle('transition', event.target.value)}
              placeholder="all 0.2s ease"
              className={`${inputClass} font-mono`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Top">
              <input value={String(styleValue('top'))} onChange={(event) => setStyle('top', event.target.value)} placeholder="auto" className={`${inputClass} font-mono`} />
            </Field>
            <Field label="Right">
              <input value={String(styleValue('right'))} onChange={(event) => setStyle('right', event.target.value)} placeholder="auto" className={`${inputClass} font-mono`} />
            </Field>
            <Field label="Bottom">
              <input value={String(styleValue('bottom'))} onChange={(event) => setStyle('bottom', event.target.value)} placeholder="auto" className={`${inputClass} font-mono`} />
            </Field>
            <Field label="Left">
              <input value={String(styleValue('left'))} onChange={(event) => setStyle('left', event.target.value)} placeholder="auto" className={`${inputClass} font-mono`} />
            </Field>
          </div>
          <SliderField
            label="Camada (z-index)"
            value={toCssNumber(styleValue('zIndex'))}
            onChange={(value) => setStyle('zIndex', value)}
            min={-10}
            max={50}
            hint="Camada de empilhamento. Maior = fica por cima."
          />
          <SelectField
            label="Overflow"
            value={String(styleValue('overflow') || 'visible')}
            options={[
              { value: 'visible', label: 'Visível' },
              { value: 'hidden', label: 'Oculto' },
              { value: 'auto', label: 'Auto (scroll)' },
              { value: 'clip', label: 'Recortado' },
            ].map((value) => ({ value: value.value, label: value.label }))}
            onChange={(value) => setStyle('overflow', value)}
          />
          {(node.type === 'image' || node.type === 'video') && (
            <SelectField
              label="Ajuste da imagem"
              value={String(styleValue('objectFit') || 'cover')}
              options={[
                { value: 'cover', label: 'Cobrir (cover)' },
                { value: 'contain', label: 'Conter' },
                { value: 'fill', label: 'Preencher' },
              ]}
              onChange={(value) => setStyle('objectFit', value as 'cover' | 'contain' | 'fill')}
            />
          )}
        </Section>
      )}

      <div className="px-2 pb-3">
        <p className="text-center text-[10px] text-neutral-600">
          💡 Dica: clique e arraste elementos no canvas para mover
        </p>
      </div>
    </div>
  );
}

function renderContentEditor(
  type: string,
  props: Record<string, unknown>,
  setProp: (key: string, value: unknown) => void,
) {
  const text = (key: string, label: string, multiline = false) => (
    <Field key={key} label={label}>
      <textarea
        value={String(props[key] ?? '')}
        onChange={(event) => setProp(key, event.target.value)}
        rows={multiline ? 3 : 1}
        className={`${inputClass} font-sans ${multiline ? 'min-h-[60px] resize-y py-1.5' : ''}`}
      />
    </Field>
  );

  if (type === 'text') {
    return (
      <>
        {text('text', 'Texto', true)}
        <Field label="Tamanho do texto">
          <SegmentedIcons
            value={String(props.as ?? 'p')}
            onChange={(value) => setProp('as', value)}
            options={[
              { value: 'h1', label: 'Título grande', icon: <span className="text-[14px] font-black">H1</span> },
              { value: 'h2', label: 'Título', icon: <span className="text-[12px] font-black">H2</span> },
              { value: 'h3', label: 'Subtítulo', icon: <span className="text-[11px] font-bold">H3</span> },
              { value: 'p', label: 'Parágrafo', icon: <span className="text-[11px]">P</span> },
            ]}
          />
        </Field>
      </>
    );
  }

  if (type === 'button') {
    return (
      <>
        {text('label', 'Texto do botão')}
        <Field label="Link (URL)">
          <input
            value={String(props.href ?? '')}
            onChange={(event) => setProp('href', event.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
      </>
    );
  }

  if (type === 'card') {
    return (
      <>
        {text('title', 'Título do cartão')}
        {text('body', 'Descrição', true)}
      </>
    );
  }

  if (type === 'navbar') {
    return <>{text('brand', 'Nome da marca')}</>;
  }

  if (type === 'footer') {
    return <>{text('text', 'Texto do rodapé')}</>;
  }

  if (type === 'label') {
    return (
      <>
        {text('text', 'Texto do rótulo')}
        <Field label="Vinculado ao campo">
          <input
            value={String(props.htmlFor ?? '')}
            onChange={(event) => setProp('htmlFor', event.target.value)}
            placeholder="id do campo"
            className={inputClass}
          />
        </Field>
      </>
    );
  }

  if (type === 'menuitem') {
    return (
      <>
        {text('label', 'Texto do item')}
        <Field label="Link (URL)">
          <input
            value={String(props.href ?? '')}
            onChange={(event) => setProp('href', event.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
      </>
    );
  }

  if (type === 'modal') {
    return (
      <>
        {text('title', 'Título do modal')}
        <ToggleRow label="Pode ser fechado" enabled={Boolean(props.closable)} onChange={() => setProp('closable', !props.closable)} />
        <ToggleRow label="Aparecer aberto" enabled={Boolean(props.open)} onChange={() => setProp('open', !props.open)} />
      </>
    );
  }

  if (type === 'image') {
    return (
      <>
        <Field label="Endereço da imagem (URL)">
          <input
            value={String(props.src ?? '')}
            onChange={(event) => setProp('src', event.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
        {text('alt', 'Texto alternativo (acessibilidade)')}
      </>
    );
  }

  if (type === 'video') {
    return (
      <>
        <Field label="Endereço do vídeo (URL)">
          <input
            value={String(props.src ?? '')}
            onChange={(event) => setProp('src', event.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
        {text('poster', 'Imagem de capa (URL)')}
        <ToggleRow label="Mostrar controles" enabled={props.controls !== false} onChange={() => setProp('controls', props.controls === false)} />
      </>
    );
  }

  if (type === 'form') {
    return (
      <>
        {text('name', 'Nome do formulário')}
        <Field label="Para onde enviar">
          <input
            value={String(props.action ?? '#')}
            onChange={(event) => setProp('action', event.target.value)}
            placeholder="https://…"
            className={inputClass}
          />
        </Field>
      </>
    );
  }

  if (type === 'input') {
    return (
      <>
        {text('label', 'Rótulo do campo')}
        {text('placeholder', 'Exemplo (placeholder)')}
        <Field label="Tipo do campo">
          <SegmentedIcons
            value={String(props.type ?? 'text')}
            onChange={(value) => setProp('type', value)}
            options={[
              { value: 'text', label: 'Texto', icon: <Type size={12} /> },
              { value: 'email', label: 'Email', icon: <span className="text-[10px]">@</span> },
              { value: 'number', label: 'Número', icon: <span className="text-[10px]">#</span> },
              { value: 'tel', label: 'Telefone', icon: <span className="text-[10px]">☎</span> },
            ]}
          />
        </Field>
        <ToggleRow label="Campo obrigatório" enabled={Boolean(props.required)} onChange={() => setProp('required', !props.required)} />
      </>
    );
  }

  if (type === 'textarea') {
    return (
      <>
        {text('label', 'Rótulo do campo')}
        {text('placeholder', 'Exemplo (placeholder)')}
        <SliderField
          label="Quantidade de linhas"
          value={Number(props.rows ?? 4)}
          onChange={(value) => setProp('rows', value)}
          min={2}
          max={20}
        />
      </>
    );
  }

  if (type === 'select') {
    return (
      <>
        {text('label', 'Rótulo do campo')}
        {text('placeholder', 'Texto inicial')}
        <Field label="Opções (uma por linha)">
          <textarea
            value={String((props.options as string[] | undefined)?.join('\n') ?? '')}
            onChange={(event) => setProp('options', event.target.value.split('\n').map((s) => s.trim()).filter(Boolean))}
            rows={4}
            className={`${inputClass} font-sans min-h-[80px] resize-y py-1.5`}
            placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
          />
        </Field>
      </>
    );
  }

  if (type === 'sceneCanvas') {
    return (
      <div className="rounded-md border border-sky-400/20 bg-sky-400/[0.05] p-3 text-[11px] text-sky-100">
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <Zap size={12} className="text-sky-300" />
          Cena 3D
        </div>
        <p className="text-sky-200/80">
          Mostra a cena 3D atual do projeto. Edite a cena no modo Cena (canto superior).
        </p>
        <ToggleRow label="Interativa (responde ao mouse)" enabled={Boolean(props.interactive)} onChange={() => setProp('interactive', !props.interactive)} />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950/30 p-3 text-[11px] text-neutral-400">
      Este elemento não tem propriedades de conteúdo para editar.
    </div>
  );
}


function InteractionProperties() {
  const page = useExperienceStore((state) => state.page);
  const interactions = useExperienceStore((state) => state.interactions);
  const selectedInteractionId = useExperienceStore((state) => state.selectedInteractionId);
  const addInteraction = useExperienceStore((state) => state.addInteraction);
  const updateInteraction = useExperienceStore((state) => state.updateInteraction);
  const setInteractionAction = useExperienceStore((state) => state.setInteractionAction);
  const removeInteraction = useExperienceStore((state) => state.removeInteraction);
  const sceneObjects = useSceneStore((state) => state.objects);
  const dataSchema = useDataModelStore((state) => state.schema);
  const variables = useVariableStore((state) => state.document.variables);
  const pageNodes = useMemo(() => flattenPageNodes(page), [page]);
  const interaction = interactions.find((item) => item.id === selectedInteractionId) ?? interactions[0] ?? null;

  if (!interaction) {
    return (
      <div className="grid gap-3 px-4 py-5">
        <button
          type="button"
          onClick={() => addInteraction()}
          className="flex h-9 items-center justify-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 text-xs font-medium text-emerald-200 transition hover:border-emerald-300/60"
        >
          <Plus size={14} />
          Nova interacao
        </button>
      </div>
    );
  }

  const updateParam = (key: string, value: unknown) => {
    updateInteraction(interaction.id, {
      params: { ...interaction.params, [key]: value },
    });
  };

  return (
    <div className="ed-scroll min-h-0 flex-1 space-y-1 overflow-auto py-3">
      <Section title="Interacao" icon={<MousePointer2 size={11} />}>
        <TextField label="Nome" value={interaction.name} onChange={(name) => updateInteraction(interaction.id, { name })} />
        <ToggleRow label="Ativa" enabled={interaction.enabled} onChange={() => updateInteraction(interaction.id, { enabled: !interaction.enabled })} />
        <SelectField
          label="Evento"
          value={interaction.trigger}
          options={INTERACTION_TRIGGERS.map((value) => ({ value, label: INTERACTION_TRIGGER_LABELS[value] }))}
          onChange={(trigger: InteractionTrigger) => updateInteraction(interaction.id, { trigger })}
        />
        <SelectField
          label="Acao"
          value={interaction.action}
          options={INTERACTION_ACTIONS.map((value) => ({ value, label: INTERACTION_ACTION_LABELS[value] }))}
          onChange={(action: InteractionAction) => setInteractionAction(interaction.id, action)}
        />
      </Section>

      <Section title="Origem e alvo" icon={<PanelRight size={11} />}>
        <SelectField
          label="Source"
          value={interaction.sourceId}
          options={pageNodes.map(({ node }) => ({ value: node.id, label: node.name }))}
          onChange={(sourceId) => updateInteraction(interaction.id, { sourceId })}
        />
        <SelectField
          label="Target"
          value={interaction.targetId}
          options={[
            { value: 'current-scene', label: 'Scene atual' },
            ...sceneObjects.map((object) => ({ value: object.uuid, label: object.name })),
            ...pageNodes.map(({ node }) => ({ value: node.id, label: node.name })),
          ]}
          onChange={(targetId) => updateInteraction(interaction.id, { targetId })}
        />
      </Section>

      <Section title="Parametros" icon={<Settings size={11} />}>
        {(interaction.action === 'changeColor' || interaction.action === 'changeMaterial') && (
          <TextField label="Cor" value={String(interaction.params.color ?? '#00ffcc')} onChange={(value) => updateParam('color', value)} />
        )}
        {interaction.action === 'changeOpacity' && (
          <TextField label="Opacidade" value={String(interaction.params.opacity ?? 0.65)} onChange={(value) => updateParam('opacity', Number(value))} />
        )}
        {interaction.action === 'changeText' && (
          <TextField label="Texto" value={String(interaction.params.text ?? '')} onChange={(value) => updateParam('text', value)} />
        )}
        {interaction.action === 'navigateToLink' && (
          <TextField label="Link" value={String(interaction.params.href ?? '#')} onChange={(value) => updateParam('href', value)} />
        )}
        {['createRecord', 'updateRecord', 'deleteRecord', 'loadCollection', 'runQuery'].includes(interaction.action) && (
          <SelectField
            label="Colecao"
            value={String(interaction.params.collectionId ?? dataSchema.collections[0]?.id ?? '')}
            options={dataSchema.collections.map((collection) => ({ value: collection.id, label: collection.label }))}
            onChange={(value) => updateParam('collectionId', value)}
          />
        )}
        {interaction.action === 'runQuery' && (
          <>
            <SelectField
              label="Query"
              value={String(interaction.params.queryId ?? '')}
              options={[
                { value: '', label: 'Sem query' },
                ...(dataSchema.collections.find((collection) => collection.id === interaction.params.collectionId)?.queries ?? []).map((query) => ({ value: query.id, label: query.name })),
              ]}
              onChange={(value) => updateParam('queryId', value)}
            />
            <TextField label="Salvar em var" value={String(interaction.params.resultVariable ?? 'queryResult')} onChange={(value) => updateParam('resultVariable', value)} />
          </>
        )}
        {(interaction.action === 'updateRecord' || interaction.action === 'deleteRecord') && (
          <TextField label="Record ID" value={String(interaction.params.recordId ?? '{{record.id}}')} onChange={(value) => updateParam('recordId', value)} />
        )}
        {interaction.action === 'createRecord' && (
          <TextField label="Record JSON" value={JSON.stringify(interaction.params.record ?? {})} onChange={(value) => {
            try { updateParam('record', JSON.parse(value)); } catch { updateParam('record', {}); }
          }} />
        )}
        {interaction.action === 'updateRecord' && (
          <TextField label="Patch JSON" value={JSON.stringify(interaction.params.patch ?? {})} onChange={(value) => {
            try { updateParam('patch', JSON.parse(value)); } catch { updateParam('patch', {}); }
          }} />
        )}
        {['setVariable', 'incrementVariable', 'toggleVariable', 'setLoading', 'setError'].includes(interaction.action) && (
          <SelectField
            label="Variavel"
            value={String(interaction.params.variableName ?? variables[0]?.name ?? '')}
            options={variables.map((variable) => ({ value: variable.name, label: variable.label }))}
            onChange={(value) => updateParam('variableName', value)}
          />
        )}
        {(interaction.action === 'setVariable' || interaction.action === 'setLoading' || interaction.action === 'setError') && (
          <TextField label="Valor" value={String(interaction.params.value ?? '')} onChange={(value) => updateParam('value', value)} />
        )}
        {interaction.action === 'incrementVariable' && (
          <TextField label="Incremento" value={String(interaction.params.amount ?? 1)} onChange={(value) => updateParam('amount', Number(value) || 1)} />
        )}
        {interaction.action === 'showToast' && (
          <>
            <TextField label="Mensagem" value={String(interaction.params.message ?? 'Acao executada')} onChange={(value) => updateParam('message', value)} />
            <SelectField
              label="Tom"
              value={String(interaction.params.tone ?? 'success')}
              options={['success', 'info', 'error'].map((value) => ({ value, label: value }))}
              onChange={(value) => updateParam('tone', value)}
            />
          </>
        )}
        {['moveObject3D', 'rotateObject3D', 'scaleObject3D', 'moveCamera', 'animateCamera'].includes(interaction.action) && (
          <TextField
            label="Vetor"
            value={String(interaction.params.position ?? interaction.params.rotation ?? interaction.params.scale ?? '[0,0,0]')}
            onChange={(value) => {
              const parsed = value.split(',').map((item) => Number(item.replace(/[\[\]]/g, '').trim()));
              const vector = parsed.length >= 3 && parsed.every(Number.isFinite) ? [parsed[0], parsed[1], parsed[2]] : [0, 0, 0];
              if (interaction.action === 'rotateObject3D') updateParam('rotation', vector);
              else if (interaction.action === 'scaleObject3D') updateParam('scale', vector);
              else updateParam('position', vector);
            }}
          />
        )}
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Duracao" value={String(interaction.duration ?? 0.4)} onChange={(value) => updateInteraction(interaction.id, { duration: Number(value) })} />
          <SelectField
            label="Easing"
            value={interaction.easing ?? 'easeOut'}
            options={['linear', 'ease', 'easeIn', 'easeOut', 'easeInOut', 'spring'].map((value) => ({ value, label: value }))}
            onChange={(easing) => updateInteraction(interaction.id, { easing: easing as AnimationSettings['easing'] })}
          />
        </div>
        <button
          type="button"
          onClick={() => removeInteraction(interaction.id)}
          className="flex h-8 items-center justify-center gap-1 rounded-md border border-red-400/25 text-[10px] text-red-300 transition hover:border-red-400/60 hover:bg-red-400/8"
        >
          <Trash2 size={12} />
          Remover
        </button>
      </Section>
    </div>
  );
}

function PreviewProperties() {
  const page = useExperienceStore((state) => state.page);
  const objects = useSceneStore((state) => state.objects);
  const materials = useMaterialStore((state) => state.materials);
  const settings = useExperienceStore((state) => state.settings);
  const metrics = useMemo(
    () => computePreviewRuntimeMetrics({ page, objects, materials, settings }),
    [page, objects, materials, settings],
  );
  const formatCount = (value: number) => value.toLocaleString('pt-BR');

  return (
    <div className="ed-scroll min-h-0 flex-1 space-y-1 overflow-auto py-3">
      <Section title="Runtime" icon={<Settings size={11} />}>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
            <span className={labelClass}>Objetos</span>
            <div className="mt-1 text-lg font-semibold text-neutral-100">{formatCount(metrics.objectCount)}</div>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
            <span className={labelClass}>FPS alvo</span>
            <div className="mt-1 text-lg font-semibold text-neutral-100">{settings.performanceBudget.targetFps}</div>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
            <span className={labelClass}>Modelos</span>
            <div className="mt-1 text-lg font-semibold text-neutral-100">{formatCount(metrics.modelCount)}</div>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
            <span className={labelClass}>Assets URL</span>
            <div className="mt-1 text-lg font-semibold text-neutral-100">{formatCount(metrics.assetUrlCount)}</div>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
            <span className={labelClass}>Triangulos</span>
            <div className="mt-1 text-lg font-semibold text-neutral-100">{formatCount(metrics.knownTriangleCount)}</div>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
            <span className={labelClass}>Texturas</span>
            <div className="mt-1 text-lg font-semibold text-neutral-100">{formatCount(metrics.textureCount)}</div>
          </div>
        </div>
        <div className="grid gap-1 rounded-md border border-neutral-800 bg-neutral-950/40 p-2 text-xs text-neutral-400">
          <div className="flex justify-between gap-3">
            <span>Vertices conhecidos</span>
            <strong className="text-neutral-200">{formatCount(metrics.knownVertexCount)}</strong>
          </div>
          <div className="flex justify-between gap-3">
            <span>Geometrias sem estatistica</span>
            <strong className="text-neutral-200">{formatCount(metrics.unknownGeometryCount)}</strong>
          </div>
          <div className="flex justify-between gap-3">
            <span>Luzes / Cameras</span>
            <strong className="text-neutral-200">{metrics.lightCount} / {metrics.cameraCount}</strong>
          </div>
        </div>
        {metrics.warnings.length > 0 && (
          <div className="grid gap-1.5">
            {metrics.warnings.map((warning) => (
              <div key={warning} className="rounded-md border border-amber-400/25 bg-amber-400/8 px-2 py-1.5 text-xs text-amber-100">
                {warning}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function ExportSettingsProperties() {
  const settings = useExperienceStore((state) => state.settings);
  const exportTarget = useExperienceStore((state) => state.exportTarget);
  const setExportTarget = useExperienceStore((state) => state.setExportTarget);
  const updateSettings = useExperienceStore((state) => state.updateSettings);

  return (
    <div className="ed-scroll min-h-0 flex-1 space-y-1 overflow-auto py-3">
      <Section title="Projeto" icon={<Settings size={11} />}>
        <TextField label="Nome" value={settings.name} onChange={(name) => updateSettings({ name })} />
        <SelectField
          label="Formato"
          value={exportTarget}
          options={(Object.keys(exportTargetLabel) as ExportTarget[]).map((value) => ({ value, label: exportTargetLabel[value] }))}
          onChange={setExportTarget}
        />
        <ToggleRow label="Tailwind" enabled={settings.tailwind} onChange={() => updateSettings({ tailwind: !settings.tailwind })} />
      </Section>
      <Section title="Budget" icon={<Palette size={11} />}>
        <TextField
          label="Model MB"
          value={String(settings.performanceBudget.maxModelMb)}
          onChange={(value) => updateSettings({ performanceBudget: { ...settings.performanceBudget, maxModelMb: Number(value) || 1 } })}
        />
        <TextField
          label="Texture"
          value={String(settings.performanceBudget.maxTextureSize)}
          onChange={(value) => updateSettings({ performanceBudget: { ...settings.performanceBudget, maxTextureSize: Number(value) || 1024 } })}
        />
        <TextField
          label="FPS"
          value={String(settings.performanceBudget.targetFps)}
          onChange={(value) => updateSettings({ performanceBudget: { ...settings.performanceBudget, targetFps: Number(value) || 30 } })}
        />
      </Section>
    </div>
  );
}

export default function ExperienceProperties() {
  const activeMode = useExperienceStore((state) => state.activeMode);
  const rightPanelCollapsed = useEditorStore((state) => state.rightPanelCollapsed);
  const setRightPanelCollapsed = useEditorStore((state) => state.setRightPanelCollapsed);
  const title =
    activeMode === 'interactions'
      ? 'Interactions'
      : activeMode === 'preview'
        ? 'Preview'
        : activeMode === 'export'
          ? 'Export'
          : 'Properties';

  if (rightPanelCollapsed) {
    return (
      <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-[#151719]">
        <div className="flex items-center justify-center border-b border-neutral-800 py-3">
          <button
            type="button"
            onClick={() => setRightPanelCollapsed(false)}
            className="grid min-h-9 min-w-9 place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
            title="Expandir"
          >
            <PanelRight size={15} className="rotate-180" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-[#151719]">
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <PanelRight size={14} className="text-emerald-300" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{title}</h2>
        </div>
        <button
          type="button"
          onClick={() => setRightPanelCollapsed(true)}
          className="grid min-h-8 min-w-8 place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
          title="Recolher"
        >
          <PanelRight size={14} />
        </button>
      </div>
      {activeMode === 'interactions' ? (
        <InteractionProperties />
      ) : activeMode === 'preview' ? (
        <PreviewProperties />
      ) : activeMode === 'export' ? (
        <ExportSettingsProperties />
      ) : (
        <WebNodeProperties />
      )}
    </aside>
  );
}

