'use client';

import { ChevronDown } from 'lucide-react';
import {
  createContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/*
 * Editor UI primitives — the shared design system for the page builder.
 * Consolidates the 3+ duplicated Section/Field components and introduces
 * consistent, premium controls used by the toolbar, properties, tree, canvas.
 */

export const fieldLabelClass =
  'text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500';
export const fieldInputClass =
  'ed-focus h-8 w-full rounded-md border border-neutral-700/80 bg-[#0d0f10] px-2.5 text-xs text-neutral-100 outline-none transition focus:border-emerald-400 focus:bg-[#101414]';

/* ------------------------------------------------------------------ Section */

export function Section({
  title,
  icon,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="grid">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group flex items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-neutral-800/50"
        aria-expanded={open}
      >
        {icon && <span className="text-neutral-500 transition group-hover:text-neutral-300">{icon}</span>}
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
          {title}
        </span>
        {badge && <span className="ml-1">{badge}</span>}
        <ChevronDown
          size={12}
          className={`ml-auto text-neutral-600 transition ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && <div className="grid gap-3 px-2 pb-3">{children}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------- Fields */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className={fieldLabelClass}>{label}</span>
      {children}
      {hint && <span className="text-[10px] leading-3 text-neutral-600">{hint}</span>}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`${fieldInputClass} ${mono ? 'font-mono' : ''}`}
    />
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <Field label={label}>
      <TextInput value={value} onChange={onChange} placeholder={placeholder} mono={mono} />
    </Field>
  );
}

export function SelectInput<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={fieldInputClass}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <Field label={label}>
      <SelectInput value={value} options={options} onChange={onChange} />
    </Field>
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`${fieldInputClass} pr-7 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-600">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <Field label={label}>
      <NumberInput value={value} onChange={onChange} min={min} max={max} step={step} suffix={suffix} />
    </Field>
  );
}

export function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const safe = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) ? value : '#000000';
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={safe}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-9 shrink-0 cursor-pointer rounded-md border border-neutral-700/80 bg-transparent p-0.5 outline-none transition ed-focus"
        aria-label="Cor"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldInputClass} font-mono`}
        placeholder="#000000"
      />
    </div>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <ColorInput value={value} onChange={onChange} />
    </Field>
  );
}

export function ToggleRow({
  label,
  enabled,
  onChange,
  hint,
}: {
  label: string;
  enabled: boolean;
  onChange: () => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={enabled}
      className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs transition ${
        enabled
          ? 'border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-100'
          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
      }`}
    >
      <span className="flex flex-col items-start gap-0.5">
        <span className="font-medium">{label}</span>
        {hint && <span className="text-[10px] text-neutral-600">{hint}</span>}
      </span>
      <span
        className={`relative h-4 w-7 shrink-0 rounded-full transition ${
          enabled ? 'bg-emerald-400/80' : 'bg-neutral-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${
            enabled ? 'left-3.5' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

/* -------------------------------------------------------------- Controls UI */

export function IconButton({
  icon,
  label,
  onClick,
  active,
  danger,
  disabled,
  size = 'md',
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-8 min-w-8 px-1.5';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`grid place-items-center rounded-md border transition ${
        active
          ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
          : danger
            ? 'border-red-400/25 text-red-300 hover:border-red-400/60 hover:bg-red-400/[0.08]'
            : 'border-neutral-700/60 text-neutral-400 hover:border-neutral-600 hover:text-neutral-100'
      } ${dim} disabled:cursor-not-allowed disabled:opacity-30`}
    >
      {icon}
    </button>
  );
}

export function Divider() {
  return <div className="ed-divider" />;
}

/* Segmented control (tab-like single select) */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T;
  options: Array<{ value: T; label: ReactNode; title?: string }>;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-neutral-800 bg-neutral-950/60 p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            title={option.title}
            onClick={() => onChange(option.value)}
            className={`flex items-center justify-center gap-1.5 rounded-md font-medium transition ${
              size === 'sm' ? 'h-7 px-2.5 text-[10px]' : 'h-8 px-3 text-[11px]'
            } ${
              active
                ? 'bg-emerald-400/15 text-emerald-200 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.35)]'
                : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- Panel shell */

export function PanelShell({
  title,
  icon,
  collapsed,
  onToggleCollapse,
  children,
  actions,
}: {
  title: string;
  icon?: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  if (collapsed) {
    return (
      <aside className="flex h-full min-h-0 flex-col border-neutral-800 bg-[#151719]">
        <div className="flex items-center justify-center border-b border-neutral-800 py-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="grid min-h-9 min-w-9 place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
            title="Expandir"
            aria-label="Expandir painel"
          >
            {icon ?? <ChevronDown className="rotate-90" size={15} />}
          </button>
        </div>
      </aside>
    );
  }
  return (
    <aside className="flex h-full min-h-0 flex-col bg-[#151719]">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <span className="text-emerald-300">{icon}</span>
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          {actions}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="grid min-h-8 min-w-8 place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
              title="Recolher"
              aria-label="Recolher painel"
            >
              <ChevronDown className="-rotate-90" size={14} />
            </button>
          )}
        </div>
      </div>
      {children}
    </aside>
  );
}

/* ----------------------------------------------------------------- Empty state */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center gap-2 px-6 py-10 text-center">
      {icon && (
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-neutral-800 bg-neutral-950/60 text-neutral-600">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-neutral-300">{title}</p>
        {description && <p className="max-w-[220px] text-[11px] leading-4 text-neutral-500">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------- Dropdown menu */

type DropdownCtx = { open: boolean; setOpen: (v: boolean) => void; id: string };
const DropdownContext = createContext<DropdownCtx | null>(null);

export function Dropdown({
  trigger,
  children,
  align = 'left',
  panelClassName = '',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (props: { close: () => void }) => ReactNode;
  align?: 'left' | 'right';
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={useMemo(() => ({ open, setOpen, id }), [open, id])}>
      <div ref={ref} className="relative">
        {trigger({ open, toggle: () => setOpen((v) => !v) })}
        {open && (
          <div
            role="menu"
            className={`absolute z-50 mt-1.5 min-w-[200px] rounded-lg border border-neutral-700/80 bg-neutral-950/95 p-1.5 shadow-2xl backdrop-blur ${
              align === 'right' ? 'right-0' : 'left-0'
            } ${panelClassName}`}
          >
            {children({ close: () => setOpen(false) })}
          </div>
        )}
      </div>
    </DropdownContext.Provider>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-600">
      {children}
    </div>
  );
}

export function MenuItem({
  icon,
  label,
  hint,
  onClick,
  danger,
  draggable: isDraggable,
  dragPayload,
  onDragStart,
}: {
  icon?: ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
  draggable?: boolean;
  dragPayload?: string;
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      draggable={isDraggable}
      onDragStart={isDraggable
        ? (event) => {
            if (dragPayload) {
              event.dataTransfer.setData('application/x-page-builder', dragPayload);
              event.dataTransfer.effectAllowed = 'copy';
            }
            onDragStart?.(event);
          }
        : undefined
      }
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-xs transition ${
        danger
          ? 'text-red-300 hover:bg-red-400/10'
          : isDraggable
            ? 'cursor-grab text-neutral-300 hover:bg-neutral-800 hover:text-emerald-200 active:cursor-grabbing'
            : 'text-neutral-300 hover:bg-neutral-800 hover:text-emerald-200'
      }`}
    >
      {icon && (
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border border-neutral-800 bg-neutral-950 ${danger ? 'text-red-300' : 'text-neutral-500'}`}>
          {icon}
        </span>
      )}
      <span className="flex flex-1 flex-col">
        <span className="font-medium leading-4">{label}</span>
        {hint && <span className="text-[10px] leading-3 text-neutral-600">{hint}</span>}
      </span>
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1 h-px bg-neutral-800/80" />;
}
