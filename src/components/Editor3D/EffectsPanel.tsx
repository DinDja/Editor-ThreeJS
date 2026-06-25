'use client';

import { useState } from 'react';
import { ChevronDown, Eye, EyeOff, Palette, Plus, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { EFFECT_LIST, EFFECT_REGISTRY, getEffectDefinition } from '@/lib/effects-system/registry';
import type { EffectType, PageEffect } from '@/lib/effects-system/types';
import { VISUAL_PRESETS, type VisualPresetId } from '@/lib/template-engine/presets';
import { useExperienceStore } from '@/store/experienceStore';

const labelClass = 'text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500';
const inputClass =
  'h-8 w-full rounded-md border border-neutral-700/80 bg-[#0d0f10] px-2.5 text-xs text-neutral-100 outline-none transition focus:border-emerald-400 focus:bg-[#101414]';

function Section({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="grid">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-neutral-800/50"
      >
        {icon && <span className="text-neutral-500">{icon}</span>}
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{title}</span>
        <ChevronDown size={12} className={`ml-auto text-neutral-600 transition ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="grid gap-3 px-2 pb-3">{children}</div>}
    </div>
  );
}

const PERFORMANCE_COLORS: Record<string, string> = {
  low: 'text-emerald-300',
  medium: 'text-amber-300',
  high: 'text-rose-300',
};

function EffectPropsEditor({ effect }: { effect: PageEffect }) {
  const updateEffectProps = useExperienceStore((state) => state.updateEffectProps);
  const def = getEffectDefinition(effect.type);

  return (
    <div className="grid gap-2 rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-neutral-200">{def.label}</span>
        <span className={`text-[9px] uppercase ${PERFORMANCE_COLORS[def.cost] ?? 'text-neutral-500'}`}>{def.cost}</span>
      </div>
      <p className="text-[10px] leading-3 text-neutral-500">{def.description}</p>
      {def.props.map((schema) => {
        const value = effect.props[schema.key] ?? schema.default;
        if (schema.type === 'toggle') {
          return (
            <button
              key={schema.key}
              type="button"
              onClick={() => updateEffectProps(effect.id, { [schema.key]: !value })}
              className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-[11px] transition ${
                value ? 'border-emerald-400/30 bg-emerald-400/8 text-emerald-100' : 'border-neutral-800 bg-neutral-950 text-neutral-400'
              }`}
            >
              <span>{schema.label}</span>
              {value ? <Eye size={11} /> : <EyeOff size={11} />}
            </button>
          );
        }
        if (schema.type === 'color') {
          return (
            <label key={schema.key} className="grid gap-1">
              <span className={labelClass}>{schema.label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={String(value)}
                  onChange={(e) => updateEffectProps(effect.id, { [schema.key]: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-neutral-700 bg-transparent"
                />
                <input
                  value={String(value)}
                  onChange={(e) => updateEffectProps(effect.id, { [schema.key]: e.target.value })}
                  className={inputClass}
                />
              </div>
            </label>
          );
        }
        if (schema.type === 'select') {
          return (
            <label key={schema.key} className="grid gap-1">
              <span className={labelClass}>{schema.label}</span>
              <select
                value={String(value)}
                onChange={(e) => updateEffectProps(effect.id, { [schema.key]: e.target.value })}
                className={inputClass}
              >
                {schema.options?.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                ))}
              </select>
            </label>
          );
        }
        if (schema.type === 'range') {
          const min = schema.min ?? 0;
          const max = schema.max ?? 1;
          return (
            <label key={schema.key} className="grid gap-1">
              <div className="flex items-center justify-between">
                <span className={labelClass}>{schema.label}</span>
                <span className="text-[10px] text-neutral-400">{String(value)}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={schema.step ?? 1}
                value={Number(value)}
                onChange={(e) => updateEffectProps(effect.id, { [schema.key]: Number(e.target.value) })}
                className="w-full accent-emerald-400"
              />
            </label>
          );
        }
        return (
          <label key={schema.key} className="grid gap-1">
            <span className={labelClass}>{schema.label}</span>
            <input
              value={String(value)}
              onChange={(e) => updateEffectProps(effect.id, { [schema.key]: e.target.value })}
              className={inputClass}
            />
          </label>
        );
      })}
    </div>
  );
}

export function EffectsPanel() {
  const [adding, setAdding] = useState(false);
  const page = useExperienceStore((state) => state.page);
  const addEffect = useExperienceStore((state) => state.addEffect);
  const toggleEffect = useExperienceStore((state) => state.toggleEffect);
  const removeEffect = useExperienceStore((state) => state.removeEffect);
  const reorderEffect = useExperienceStore((state) => state.reorderEffect);
  const setEffectIntensity = useExperienceStore((state) => state.setEffectIntensity);

  const effects = page.effects?.items ?? [];
  const intensity = page.effects?.intensity ?? 1;

  return (
    <Section title="Efeitos da página" icon={<Sparkles size={11} />}>
      <label className="grid gap-1">
        <div className="flex items-center justify-between">
          <span className={labelClass}>Intensidade global</span>
          <span className="text-[10px] text-neutral-400">{Math.round(intensity * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={intensity}
          onChange={(e) => setEffectIntensity(Number(e.target.value))}
          className="w-full accent-emerald-400"
        />
      </label>

      {effects.length === 0 && (
        <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-3 text-center text-[11px] text-neutral-500">
          Nenhum efeito ativo. Adicione partículas, shaders, glow e mais.
        </div>
      )}

      {effects.map((effect) => {
        const def = EFFECT_REGISTRY[effect.type];
        if (!def) return null;
        return (
          <div key={effect.id} className="grid gap-1.5">
            <div className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-950/50 px-2 py-1.5">
              <button
                type="button"
                onClick={() => toggleEffect(effect.id)}
                className={`grid h-6 w-6 place-items-center rounded ${effect.enabled ? 'text-emerald-300' : 'text-neutral-600'}`}
                title={effect.enabled ? 'Desativar' : 'Ativar'}
              >
                {effect.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
              <span className="flex-1 truncate text-[11px] font-medium text-neutral-200">{def.label}</span>
              <button type="button" onClick={() => reorderEffect(effect.id, 'up')} className="text-[9px] text-neutral-500 hover:text-neutral-200">▲</button>
              <button type="button" onClick={() => reorderEffect(effect.id, 'down')} className="text-[9px] text-neutral-500 hover:text-neutral-200">▼</button>
              <button
                type="button"
                onClick={() => removeEffect(effect.id)}
                className="grid h-6 w-6 place-items-center rounded text-red-400/70 transition hover:bg-red-400/10 hover:text-red-300"
              >
                <Trash2 size={12} />
              </button>
            </div>
            {effect.enabled && <EffectPropsEditor effect={effect} />}
          </div>
        );
      })}

      {adding ? (
        <div className="grid gap-1.5 rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
          <div className="flex items-center justify-between">
            <span className={labelClass}>Adicionar efeito</span>
            <button type="button" onClick={() => setAdding(false)} className="text-[10px] text-neutral-500 hover:text-neutral-200">Fechar</button>
          </div>
          <div className="grid max-h-48 gap-1 overflow-auto">
            {EFFECT_LIST.map((def) => (
              <button
                key={def.type}
                type="button"
                onClick={() => {
                  addEffect(def.type as EffectType);
                  setAdding(false);
                }}
                className="flex items-center gap-2 rounded-md border border-neutral-800 px-2 py-1.5 text-left text-[11px] text-neutral-300 transition hover:border-emerald-400/40 hover:text-emerald-200"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${PERFORMANCE_COLORS[def.cost] ?? 'bg-neutral-500'} bg-current`} />
                <span className="flex-1">
                  <span className="block font-medium">{def.label}</span>
                  <span className="block text-[9px] text-neutral-500">{def.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-400/8 text-[11px] font-medium text-emerald-200 transition hover:border-emerald-300/60"
        >
          <Plus size={12} />
          Adicionar efeito
        </button>
      )}
    </Section>
  );
}

export function GlobalStylePanel() {
  const page = useExperienceStore((state) => state.page);
  const applyPreset = useExperienceStore((state) => state.applyPreset);
  const currentPresetId = page.effects?.presetId;

  return (
    <Section title="Estilo global" icon={<Palette size={11} />} defaultOpen={false}>
      <p className="text-[10px] leading-3 text-neutral-500">
        Aplique um preset visual para trocar paleta, tipografia, botões, cards e intensidade dos efeitos sem perder o conteúdo.
      </p>
      <div className="grid gap-1.5">
        {VISUAL_PRESETS.map((preset) => {
          const active = currentPresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id as VisualPresetId)}
              className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left transition ${
                active ? 'border-emerald-400/50 bg-emerald-400/8' : 'border-neutral-800 bg-neutral-950/50 hover:border-neutral-600'
              }`}
            >
              <div className="flex gap-1">
                {preset.swatch.slice(0, 4).map((color, i) => (
                  <span key={i} className="h-4 w-4 rounded-sm border border-white/10" style={{ background: color }} />
                ))}
              </div>
              <span className="flex-1">
                <span className="block text-[11px] font-medium text-neutral-200">{preset.name}</span>
                <span className="block text-[9px] text-neutral-500">{preset.description}</span>
              </span>
              {active && <Wand2 size={12} className="text-emerald-300" />}
            </button>
          );
        })}
      </div>
    </Section>
  );
}
