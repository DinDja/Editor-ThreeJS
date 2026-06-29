'use client';

import { useState } from 'react';
import { ChevronDown, Eye, EyeOff, MousePointer2, Plus, Trash2 } from 'lucide-react';
import { useExperienceStore } from '@/store/experienceStore';
import { CURSOR_ICONS, CURSOR_EFFECTS } from '@/lib/cursor-library/cursors';

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

function CursorCell({
  src,
  index,
  active,
  onClick,
}: {
  src: string;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-0.5 rounded-md border p-1 transition ${
        active
          ? 'border-emerald-400/50 bg-emerald-400/10 shadow-[0_0_8px_rgba(52,211,153,0.15)]'
          : 'border-neutral-800 bg-neutral-950/50 hover:border-neutral-600'
      }`}
      title={`Cursor ${index}`}
    >
      {!loaded && !error && (
        <div className="flex h-6 w-6 items-center justify-center">
          <div className="h-3 w-3 animate-pulse rounded-full bg-neutral-700" />
        </div>
      )}
      {error && (
        <div className="flex h-6 w-6 items-center justify-center">
          <MousePointer2 size={14} className={active ? 'text-emerald-300' : 'text-neutral-500'} />
        </div>
      )}
      <img
        src={src}
        alt={`Cursor ${index}`}
        className={`h-6 w-6 object-contain ${loaded && !error ? 'block' : 'hidden'}`}
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
      <span className={`text-[8px] ${active ? 'text-emerald-300/70' : 'text-neutral-600'}`}>{index}</span>
    </button>
  );
}

export function CursorLibrary() {
  const page = useExperienceStore((s) => s.page);
  const addEffect = useExperienceStore((s) => s.addEffect);
  const updateEffectProps = useExperienceStore((s) => s.updateEffectProps);
  const toggleEffect = useExperienceStore((s) => s.toggleEffect);
  const removeEffect = useExperienceStore((s) => s.removeEffect);

  const cursorEffect = page.effects?.items.find((e) => e.type === 'customCursor');
  const [icons] = useState<string[]>(CURSOR_ICONS);

  const hasEffect = !!cursorEffect;
  const iconIndex = cursorEffect ? Math.round(Number(cursorEffect.props.iconIndex ?? 0)) : 0;
  const effectName = cursorEffect ? String(cursorEffect.props.effect ?? 'trail') : 'trail';
  const effectColor = cursorEffect ? String(cursorEffect.props.effectColor ?? '#ffffff') : '#ffffff';
  const cursorSize = cursorEffect ? Number(cursorEffect.props.cursorSize ?? 32) : 32;
  const isEnabled = cursorEffect?.enabled ?? false;

  const handleAdd = () => addEffect('customCursor');

  const handleSelectIcon = (index: number) => {
    if (cursorEffect) updateEffectProps(cursorEffect.id, { iconIndex: index });
  };

  const handleToggle = () => {
    if (cursorEffect) toggleEffect(cursorEffect.id);
  };

  const handleRemove = () => {
    if (cursorEffect) removeEffect(cursorEffect.id);
  };

  const handleEffectChange = (value: string) => {
    if (cursorEffect) updateEffectProps(cursorEffect.id, { effect: value });
  };

  const handleColorChange = (value: string) => {
    if (cursorEffect) updateEffectProps(cursorEffect.id, { effectColor: value });
  };

  const handleSizeChange = (value: number) => {
    if (cursorEffect) updateEffectProps(cursorEffect.id, { cursorSize: value });
  };

  return (
    <Section title="Biblioteca de cursores" icon={<MousePointer2 size={11} />}>
      {hasEffect ? (
        <>
          <div className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950/50 px-2 py-1.5">
            <button
              type="button"
              onClick={handleToggle}
              className={`grid h-6 w-6 place-items-center rounded ${isEnabled ? 'text-emerald-300' : 'text-neutral-600'}`}
              title={isEnabled ? 'Desativar' : 'Ativar'}
            >
              {isEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
            <MousePointer2 size={13} className="text-neutral-500" />
            <span className="flex-1 truncate text-[11px] font-medium text-neutral-200">
              Ícone {iconIndex}
            </span>
            <span className="text-[10px] text-neutral-500">{cursorSize}px</span>
            <button
              type="button"
              onClick={handleRemove}
              className="grid h-6 w-6 place-items-center rounded text-red-400/70 transition hover:bg-red-400/10 hover:text-red-300"
            >
              <Trash2 size={12} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {icons.map((src, i) => (
              <CursorCell key={i} src={src} index={i} active={iconIndex === i} onClick={() => handleSelectIcon(i)} />
            ))}
          </div>

          <div className="grid gap-2 rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
            <label className="grid gap-1">
              <span className={labelClass}>Efeito visual</span>
              <select
                value={effectName}
                onChange={(e) => handleEffectChange(e.target.value)}
                className={inputClass}
              >
                {CURSOR_EFFECTS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1">
              <span className={labelClass}>Cor do efeito</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={effectColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-neutral-700 bg-transparent"
                />
                <input
                  value={effectColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className={inputClass}
                />
              </div>
            </label>

            <label className="grid gap-1">
              <div className="flex items-center justify-between">
                <span className={labelClass}>Tamanho</span>
                <span className="text-[10px] text-neutral-400">{cursorSize}px</span>
              </div>
              <input
                type="range"
                min={16}
                max={64}
                step={2}
                value={cursorSize}
                onChange={(e) => handleSizeChange(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 opacity-40 grayscale">
            {icons.slice(0, 14).map((src, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 p-1">
                <img src={src} alt="" className="h-5 w-5 object-contain" draggable={false} />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-400/8 text-[11px] font-medium text-emerald-200 transition hover:border-emerald-300/60"
          >
            <Plus size={12} />
            Adicionar cursor personalizado
          </button>
        </>
      )}
    </Section>
  );
}
