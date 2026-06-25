'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Atom,
  Box,
  Brush,
  Check,
  ChevronDown,
  Circle,
  Copy,
  Crosshair,
  Cuboid,
  Eye,
  EyeOff,
  FileCode,
  FlipHorizontal2,
  Folder,
  Grid3X3,
  Image,
  ImagePlus,
  Layers,
  Move3D,
  PanelRight,
  Plus,
  Rotate3D,
  RotateCcw,
  Scale3D,
  Sun,
  Torus,
  Trash2,
  Type,
} from 'lucide-react';
import * as THREE from 'three';
import { TEXTURE_FILE_ACCEPT } from '@/lib/fileOps';
import { primitiveKinds, primitiveLabels } from '@/lib/geometryOps';
import { createPrimitiveEditableMesh } from '@/lib/meshOps';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { useTimelineStore } from '@/store/timelineStore';
import type {
  BehaviorConfig,
  BehaviorKind,
  EditorMaterial,
  EffectConfig,
  EffectKind,
  LightConfig,
  MaterialApplicationScope,
  PhysicsAxisLocks,
  PhysicsBodyType,
  PhysicsColliderType,
  ReferenceImage,
  SceneObject,
  ScenePhysicsConfig,
  Script,
  SvgConfig,
  Text3DConfig,
  Vec3,
} from '@/store/types';
import { EFFECT_KINDS, EFFECT_LABELS, EFFECT_PRESETS } from '@/lib/effects';
import { BEHAVIOR_KINDS, BEHAVIOR_LABELS, BEHAVIOR_DEFAULTS } from '@/lib/behaviors';
import {
  canObjectUsePhysics,
  createDefaultPhysicsConfig,
  getPhysicsConfig,
  getPhysicsWarnings,
  PHYSICS_BODY_LABELS,
  PHYSICS_BODY_TYPES,
  PHYSICS_COLLIDER_LABELS,
  PHYSICS_COLLIDER_TYPES,
} from '@/lib/physics';
import { createId } from '@/store/types';
import ModelingTools from './ModelingTools';
import ImageTo3DPanel from './ImageTo3D/ImageTo3DPanel';
import { canObjectHaveMaterial, getDescendantIds, getMaterialTargetObjects } from '@/store/sceneTree';

/* ── Shared styling constants ── */

const labelClass = 'text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500';
const inputClass =
  'h-8 w-full rounded-md border border-neutral-700/80 bg-[#0d0f10] px-2.5 text-xs text-neutral-100 outline-none transition focus:border-emerald-400 focus:bg-[#101414]';
const axisColors = ['text-red-400', 'text-emerald-400', 'text-sky-400'];
const axisLabels = ['X', 'Y', 'Z'];

/* ── Section ── */

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
  const id = useRef(`section-${title.replace(/\s+/g, '-').toLowerCase()}`).current;

  return (
    <div className="grid">
      <button
        type="button"
        id={id}
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-neutral-800/50"
      >
        {icon && <span className="text-neutral-500">{icon}</span>}
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{title}</span>
        <ChevronDown
          size={12}
          className={`ml-auto text-neutral-600 transition ${open ? 'rotate-0' : '-rotate-90'}`}
        />
      </button>
      {open && <div className="grid gap-3 px-2 pb-3">{children}</div>}
    </div>
  );
}

/* ── NumericInput ── */

function NumericInput({
  label,
  value,
  step,
  axis,
  onChange,
  onFocus,
}: {
  label?: string;
  value: number;
  step?: number;
  axis?: number;
  onChange: (v: number) => void;
  onFocus?: () => void;
}) {
  return (
    <label className="relative grid cursor-text gap-0.5">
      {axis !== undefined && (
        <span className={`text-[9px] font-bold leading-none ${axisColors[axis]}`}>{axisLabels[axis]}</span>
      )}
      {label && !axis && (
        <span className={labelClass}>{label}</span>
      )}
      <input
        type="number"
        step={step ?? 0.1}
        value={Number(value.toFixed(3))}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className={inputClass}
      />
    </label>
  );
}

/* ── SliderInput ── */

function SliderInput({
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  accent = 'emerald',
  onChange,
  onFocus,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  accent?: string;
  onChange: (v: number) => void;
  onFocus?: () => void;
}) {
  const display =
    suffix === '%'
      ? `${Math.round(value * 100)}%`
      : `${value.toFixed(step < 0.1 ? 2 : 1)}${suffix}`;

  return (
    <label className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <span className={labelClass}>{label}</span>
        <span className="w-12 text-right text-xs tabular-nums text-neutral-400">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onFocus={onFocus}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`h-1.5 w-full cursor-pointer accent-${accent}-400`}
      />
    </label>
  );
}

/* ── ColorInput ── */

function ColorInput({
  label,
  value,
  onChange,
  onFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className={labelClass}>{label}</span>
      <div className="flex h-8 items-center gap-2 overflow-hidden rounded-md border border-neutral-700/80 bg-[#0d0f10] px-2 transition focus-within:border-emerald-400">
        <span
          className="h-5 w-5 shrink-0 rounded border border-neutral-700"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onFocus={onFocus}
          onChange={(e) => onChange(e.target.value)}
          className="h-full min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 text-xs text-neutral-100 outline-none"
        />
      </div>
    </label>
  );
}

/* ── ToggleRow ── */

function ToggleRow({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-xs transition ${
        enabled
          ? 'border-emerald-400/30 bg-emerald-400/8 text-emerald-100'
          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
      }`}
    >
      <span className="font-medium">{label}</span>
      <span
        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${
          enabled ? 'bg-emerald-400/20 text-emerald-300' : 'bg-neutral-800 text-neutral-500'
        }`}
      >
        {enabled ? 'Ligado' : 'Desligado'}
      </span>
    </button>
  );
}

/* ── TransformRow ── */

type TransformField = 'position' | 'rotation' | 'scale';

const fieldMeta: Record<TransformField, { label: string; icon: React.ReactNode; step: number; suffix?: string }> = {
  position: { label: 'Posicao', icon: <Move3D size={12} />, step: 0.1 },
  rotation: { label: 'Rotacao', icon: <Rotate3D size={12} />, step: 1, suffix: '°' },
  scale: { label: 'Escala', icon: <Scale3D size={12} />, step: 0.05 },
};

function TransformRow({ object, field }: { object: SceneObject; field: TransformField }) {
  const updateObject = useSceneStore((s) => s.updateObject);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const autoKey = useTimelineStore((s) => s.autoKey);
  const addTransformKeyframe = useTimelineStore((s) => s.addTransformKeyframe);
  const values = object[field];
  const meta = fieldMeta[field];

  const setValue = (axis: number, raw: number) => {
    if (!Number.isFinite(raw)) return;
    const next = [...values] as Vec3;
    next[axis] = field === 'rotation' ? THREE.MathUtils.degToRad(raw) : raw;
    updateObject(object.uuid, { [field]: next });
    if (autoKey) addTransformKeyframe({ ...object, [field]: next });
  };

  return (
    <div className="grid gap-1.5">
      <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
        {meta.icon}
        {meta.label}
      </span>
      <div className="grid grid-cols-3 gap-1.5 xl:grid-cols-3 lg:grid-cols-2">
        {values.map((value, i) => {
          const display = field === 'rotation' ? THREE.MathUtils.radToDeg(value) : value;
          return (
            <NumericInput
              key={i}
              axis={i}
              value={display}
              step={meta.step}
              onChange={(v) => setValue(i, v)}
              onFocus={pushSnapshot}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── EffectPanel ── */

function EffectPanel({ object }: { object: SceneObject }) {
  const updateObject = useSceneStore((s) => s.updateObject);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const effect = object.effect!;

  const updateEffect = (patch: Partial<EffectConfig>) => {
    if (patch.kind) {
      updateObject(object.uuid, { effect: { ...EFFECT_PRESETS[patch.kind], ...patch } });
    } else {
      updateObject(object.uuid, { effect: { ...effect, ...patch } });
    }
  };

  return (
    <Section title="Efeito" icon={<Circle size={11} className="text-amber-400" />}>
      <label className="grid gap-1.5">
        <span className={labelClass}>Tipo</span>
        <select
          value={effect.kind}
          onChange={(e) => { pushSnapshot(); updateEffect({ kind: e.target.value as EffectKind }); }}
          className={inputClass}
        >
          {EFFECT_KINDS.map((k) => (
            <option key={k} value={k}>{EFFECT_LABELS[k]}</option>
          ))}
        </select>
      </label>
      <ColorInput label="Cor" value={effect.color} onChange={(v) => updateEffect({ color: v })} />
      <SliderInput label="Intensidade" value={effect.intensity} min={0.1} max={2} step={0.05} onChange={(v) => updateEffect({ intensity: v })} />
      <SliderInput label="Tamanho" value={effect.size} min={0.05} max={2} step={0.05} onChange={(v) => updateEffect({ size: v })} />
      <SliderInput label="Particulas" value={effect.count} min={10} max={effect.kind === 'imageParticles' ? 20000 : 300} step={effect.kind === 'imageParticles' ? 500 : 10} onChange={(v) => updateEffect({ count: v })} />
      {effect.kind === 'imageParticles' && (
        <ImageParticleFields effect={effect} updateEffect={updateEffect} />
      )}
    </Section>
  );
}

function ImageParticleFields({
  effect,
  updateEffect,
}: {
  effect: EffectConfig;
  updateEffect: (patch: Partial<EffectConfig>) => void;
}) {
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        pushSnapshot();
        updateEffect({ imageUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  return (
    <div className="grid gap-2">
      <div className="border-t border-neutral-800/60 pt-2" />

      <label className="grid gap-1.5">
        <span className={labelClass}>Imagem / SVG</span>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-4 transition ${
            dragOver
              ? 'border-emerald-400 bg-emerald-400/8'
              : 'border-neutral-700/60 bg-neutral-950/40 hover:border-neutral-600'
          }`}
        >
          {effect.imageUrl ? (
            <div className="flex w-full items-center gap-2">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-neutral-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={effect.imageUrl} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] text-neutral-300">Imagem carregada</p>
                <p className="text-[9px] text-neutral-500">Clique para trocar</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); pushSnapshot(); updateEffect({ imageUrl: '' }); }}
                className="grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded bg-neutral-800 text-neutral-400 transition hover:bg-red-500/60 hover:text-white"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ) : (
            <>
              <ImagePlus size={18} className="text-neutral-500" />
              <span className="text-[10px] text-neutral-500">
                Arraste uma imagem ou clique
              </span>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.svg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageFile(file);
          }}
        />
      </label>

      {effect.imageUrl && (
        <>
          <SliderInput
            label="Passo Pixel"
            value={effect.pixelStep ?? 2}
            min={1}
            max={8}
            step={1}
            onChange={(v) => updateEffect({ pixelStep: v })}
          />
          <SliderInput
            label="Profundidade Z"
            value={effect.depthScale ?? 0.4}
            min={0.05}
            max={1.5}
            step={0.05}
            onChange={(v) => updateEffect({ depthScale: v })}
          />
          <label className="grid gap-1.5">
            <span className={labelClass}>URL da imagem</span>
            <input
              type="text"
              value={effect.imageUrl?.startsWith('data:') ? '' : (effect.imageUrl ?? '')}
              placeholder="https://... (ou use upload acima)"
              onChange={(e) => updateEffect({ imageUrl: e.target.value })}
              className={inputClass}
            />
          </label>
        </>
      )}
    </div>
  );
}

/* ── BehaviorPanel ── */

function BehaviorPanel({ object }: { object: SceneObject }) {
  const updateObject = useSceneStore((s) => s.updateObject);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const behaviors = object.behaviors ?? [];

  const toggleBehavior = (kind: BehaviorKind) => {
    pushSnapshot();
    const existing = behaviors.find((b) => b.type === kind);
    if (existing) {
      updateObject(object.uuid, {
        behaviors: behaviors.map((b) => (b.type === kind ? { ...b, enabled: !b.enabled } : b)),
      });
    } else {
      updateObject(object.uuid, {
        behaviors: [...behaviors, { ...BEHAVIOR_DEFAULTS[kind], enabled: true }],
      });
    }
  };

  const updateBehavior = (kind: BehaviorKind, patch: Partial<BehaviorConfig>) => {
    updateObject(object.uuid, {
      behaviors: behaviors.map((b) => (b.type === kind ? { ...b, ...patch } : b)),
    });
  };

  const getBehavior = (kind: BehaviorKind) =>
    behaviors.find((b) => b.type === kind) ?? BEHAVIOR_DEFAULTS[kind];

  return (
    <Section title="Comportamentos" icon={<Layers size={11} className="text-violet-400" />}>
      <div className="grid gap-1.5">
        {BEHAVIOR_KINDS.map((kind) => {
          const config = getBehavior(kind);
          const enabled = config.enabled;

          return (
            <div key={kind} className="grid gap-2 rounded-md border border-neutral-800 bg-neutral-950/50 p-2.5">
              <ToggleRow
                label={BEHAVIOR_LABELS[kind]}
                enabled={enabled}
                onChange={() => toggleBehavior(kind)}
              />

              {enabled && kind === 'jump' && (
                <div className="grid grid-cols-2 gap-2">
                  <NumericInput label="Altura" value={config.jumpHeight ?? 1.5} step={0.1} onChange={(v) => updateBehavior(kind, { jumpHeight: v })} />
                  <NumericInput label="Intervalo" value={config.jumpCooldown ?? 1.2} step={0.1} onChange={(v) => updateBehavior(kind, { jumpCooldown: v })} />
                </div>
              )}
              {enabled && kind === 'walk' && (
                <div className="grid grid-cols-2 gap-2">
                  <NumericInput label="Velocidade" value={config.walkSpeed ?? 1.5} step={0.1} onChange={(v) => updateBehavior(kind, { walkSpeed: v })} />
                  <NumericInput label="Amplitude" value={config.walkAmplitude ?? 0.15} step={0.05} onChange={(v) => updateBehavior(kind, { walkAmplitude: v })} />
                </div>
              )}
              {enabled && kind === 'accelerate' && (
                <div className="grid grid-cols-2 gap-2">
                  <NumericInput label="Aceleracao" value={config.acceleration ?? 1.5} step={0.1} onChange={(v) => updateBehavior(kind, { acceleration: v })} />
                  <NumericInput label="Vel. Max" value={config.maxSpeed ?? 5} step={0.1} onChange={(v) => updateBehavior(kind, { maxSpeed: v })} />
                </div>
              )}
              {enabled && kind === 'roll' && (
                <div className="grid grid-cols-2 gap-2">
                  <NumericInput label="Velocidade" value={config.rollSpeed ?? 2} step={0.1} onChange={(v) => updateBehavior(kind, { rollSpeed: v })} />
                  <label className="grid gap-0.5">
                    <span className={labelClass}>Eixo</span>
                    <select
                      value={config.rollAxis ?? 'z'}
                      onChange={(e) => updateBehavior(kind, { rollAxis: e.target.value as 'x' | 'z' })}
                      className={inputClass}
                    >
                      <option value="z">Z</option>
                      <option value="x">X</option>
                    </select>
                  </label>
                </div>
              )}
              {enabled && kind === 'gravity' && (
                <div className="grid grid-cols-2 gap-2">
                  <NumericInput label="Forca" value={config.gravityStrength ?? 9.8} step={0.5} onChange={(v) => updateBehavior(kind, { gravityStrength: v })} />
                  <NumericInput label="Chao (Y)" value={config.groundY ?? 0} step={0.1} onChange={(v) => updateBehavior(kind, { groundY: v })} />
                </div>
              )}
              {enabled && kind === 'bubble' && (
                <div className="grid grid-cols-2 gap-2">
                  <NumericInput label="Amplitude" value={config.bubbleAmplitude ?? 0.3} step={0.05} onChange={(v) => updateBehavior(kind, { bubbleAmplitude: v })} />
                  <NumericInput label="Frequencia" value={config.bubbleFrequency ?? 1.2} step={0.1} onChange={(v) => updateBehavior(kind, { bubbleFrequency: v })} />
                </div>
              )}
              {enabled && kind === 'massDeform' && (
                <div className="grid grid-cols-2 gap-2">
                  <NumericInput label="Intensidade" value={config.deformStrength ?? 0.3} step={0.05} onChange={(v) => updateBehavior(kind, { deformStrength: v })} />
                  <NumericInput label="Retorno" value={config.deformReturnSpeed ?? 5} step={0.1} onChange={(v) => updateBehavior(kind, { deformReturnSpeed: v })} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ── PhysicsPanel ── */

function AxisLockButtons({
  label,
  locks,
  onToggle,
}: {
  label: string;
  locks: PhysicsAxisLocks;
  onToggle: (axis: keyof PhysicsAxisLocks) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <span className={labelClass}>{label}</span>
      <div className="grid grid-cols-3 gap-1.5">
        {(['x', 'y', 'z'] as Array<keyof PhysicsAxisLocks>).map((axis, index) => (
          <button
            key={axis}
            type="button"
            onClick={() => onToggle(axis)}
            className={`h-8 rounded-md border text-[10px] font-bold uppercase transition ${
              locks[axis]
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                : 'border-neutral-800 bg-neutral-950 text-neutral-500 hover:border-neutral-700 hover:text-neutral-200'
            }`}
          >
            <span className={axisColors[index]}>{axis.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PhysicsPanel({ object, objects }: { object: SceneObject; objects: SceneObject[] }) {
  const updateObject = useSceneStore((s) => s.updateObject);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const physics = getPhysicsConfig(object);
  const supported = canObjectUsePhysics(object);
  const warnings = getPhysicsWarnings(object, objects);

  const setPhysics = (next: ScenePhysicsConfig) => {
    updateObject(object.uuid, {
      metadata: {
        physics: {
          ...next,
          lockTranslation: { ...next.lockTranslation },
          lockRotation: { ...next.lockRotation },
        },
      },
    });
  };

  const updatePhysics = (patch: Partial<ScenePhysicsConfig>) => {
    setPhysics({
      ...physics,
      ...patch,
      lockTranslation: patch.lockTranslation ? { ...patch.lockTranslation } : { ...physics.lockTranslation },
      lockRotation: patch.lockRotation ? { ...patch.lockRotation } : { ...physics.lockRotation },
    });
  };

  const toggleEnabled = () => {
    pushSnapshot();
    if (!supported) return;

    if (physics.enabled) {
      updatePhysics({ enabled: false });
      return;
    }

    const next = object.metadata.physics
      ? { ...physics, enabled: true }
      : createDefaultPhysicsConfig(object);
    setPhysics(next);
  };

  const resetPhysics = () => {
    pushSnapshot();
    setPhysics(createDefaultPhysicsConfig(object));
  };

  const toggleTranslationLock = (axis: keyof PhysicsAxisLocks) => {
    pushSnapshot();
    updatePhysics({
      lockTranslation: {
        ...physics.lockTranslation,
        [axis]: !physics.lockTranslation[axis],
      },
    });
  };

  const toggleRotationLock = (axis: keyof PhysicsAxisLocks) => {
    pushSnapshot();
    updatePhysics({
      lockRotation: {
        ...physics.lockRotation,
        [axis]: !physics.lockRotation[axis],
      },
    });
  };

  return (
    <Section title="Physics" icon={<Atom size={11} className="text-cyan-400" />}>
      <ToggleRow label="Fisica" enabled={supported && physics.enabled} onChange={toggleEnabled} />

      {!supported && (
        <div className="rounded-md border border-amber-400/20 bg-amber-400/8 p-2 text-[11px] leading-relaxed text-amber-100">
          Luzes, cameras e efeitos nao recebem rigid body nesta base inicial.
        </div>
      )}

      {supported && physics.enabled && (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-2 lg:grid-cols-1">
            <label className="grid gap-0.5">
              <span className={labelClass}>Rigid body</span>
              <select
                value={physics.bodyType}
                onChange={(e) => {
                  pushSnapshot();
                  updatePhysics({ bodyType: e.target.value as PhysicsBodyType });
                }}
                className={inputClass}
              >
                {PHYSICS_BODY_TYPES.map((type) => (
                  <option key={type} value={type}>{PHYSICS_BODY_LABELS[type]}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-0.5">
              <span className={labelClass}>Collider</span>
              <select
                value={physics.colliderType}
                onChange={(e) => {
                  pushSnapshot();
                  updatePhysics({ colliderType: e.target.value as PhysicsColliderType });
                }}
                className={inputClass}
              >
                {PHYSICS_COLLIDER_TYPES.map((type) => (
                  <option key={type} value={type}>{PHYSICS_COLLIDER_LABELS[type]}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 xl:grid-cols-2 lg:grid-cols-1">
            <NumericInput label="Massa" value={physics.mass} step={0.1} onChange={(v) => updatePhysics({ mass: Math.max(0.001, v) })} onFocus={pushSnapshot} />
            <NumericInput label="Gravidade" value={physics.gravityScale} step={0.1} onChange={(v) => updatePhysics({ gravityScale: v })} onFocus={pushSnapshot} />
          </div>

          <div className="grid gap-2">
            <SliderInput label="Atrito" value={physics.friction} min={0} max={2} step={0.05} onChange={(v) => updatePhysics({ friction: v })} onFocus={pushSnapshot} />
            <SliderInput label="Restituicao" value={physics.restitution} min={0} max={1} step={0.05} onChange={(v) => updatePhysics({ restitution: v })} onFocus={pushSnapshot} />
          </div>

          <div className="grid grid-cols-2 gap-2 xl:grid-cols-2 lg:grid-cols-1">
            <NumericInput label="Damping lin." value={physics.linearDamping} step={0.05} onChange={(v) => updatePhysics({ linearDamping: Math.max(0, v) })} onFocus={pushSnapshot} />
            <NumericInput label="Damping ang." value={physics.angularDamping} step={0.05} onChange={(v) => updatePhysics({ angularDamping: Math.max(0, v) })} onFocus={pushSnapshot} />
          </div>

          <div className="grid grid-cols-2 gap-2 xl:grid-cols-2 lg:grid-cols-1">
            <ToggleRow
              label="Usar gravidade"
              enabled={physics.gravityScale !== 0}
              onChange={() => {
                pushSnapshot();
                updatePhysics({ gravityScale: physics.gravityScale === 0 ? 1 : 0 });
              }}
            />
            <ToggleRow
              label="Trigger"
              enabled={physics.isTrigger}
              onChange={() => {
                pushSnapshot();
                updatePhysics({ isTrigger: !physics.isTrigger });
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 xl:grid-cols-2 lg:grid-cols-1">
            <AxisLockButtons label="Congelar pos." locks={physics.lockTranslation} onToggle={toggleTranslationLock} />
            <AxisLockButtons label="Congelar rot." locks={physics.lockRotation} onToggle={toggleRotationLock} />
          </div>

          {warnings.length > 0 && (
            <div className="grid gap-1.5">
              {warnings.map((warning) => (
                <div key={warning} className="flex gap-2 rounded-md border border-amber-400/20 bg-amber-400/8 p-2 text-[11px] leading-relaxed text-amber-100">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-300" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={resetPhysics}
            className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-neutral-700/60 text-[11px] font-medium text-neutral-400 transition hover:border-cyan-400/50 hover:text-cyan-200"
          >
            <RotateCcw size={12} />
            Resetar fisica
          </button>
        </div>
      )}
    </Section>
  );
}

/* ── ScriptPanel ── */

function ScriptPanel({ object }: { object: SceneObject }) {
  const updateObject = useSceneStore((s) => s.updateObject);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const scripts = object.scripts ?? [];

  const addScript = () => {
    pushSnapshot();
    updateObject(object.uuid, {
      scripts: [
        ...scripts,
        { id: createId(), name: `Script ${scripts.length + 1}`, code: '// api.group.position.y += Math.sin(api.elapsed) * 0.1', enabled: true },
      ],
    });
  };

  const removeScript = (id: string) => {
    pushSnapshot();
    updateObject(object.uuid, { scripts: scripts.filter((s) => s.id !== id) });
  };

  const updateScript = (id: string, patch: Partial<Omit<Script, 'id'>>) => {
    updateObject(object.uuid, {
      scripts: scripts.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  return (
    <Section title="Scripts" icon={<Grid3X3 size={11} className="text-cyan-400" />}>
      <div className="grid gap-2">
        {scripts.length === 0 && (
          <p className="text-[11px] text-neutral-500">Nenhum script.</p>
        )}
        {scripts.map((script) => (
          <div key={script.id} className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2.5">
            <div className="mb-2 flex items-center gap-2">
              <input
                type="text"
                value={script.name}
                onChange={(e) => updateScript(script.id, { name: e.target.value })}
                onFocus={pushSnapshot}
                className="h-7 min-w-0 flex-1 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs font-medium text-neutral-100 outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => updateScript(script.id, { enabled: !script.enabled })}
                className={`cursor-pointer rounded px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] transition ${
                  script.enabled
                    ? 'bg-emerald-400/15 text-emerald-300'
                    : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                }`}
              >
                {script.enabled ? 'Ligado' : 'Desligado'}
              </button>
              <button
                type="button"
                onClick={() => removeScript(script.id)}
                className="grid h-7 w-7 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-red-500/15 hover:text-red-200"
              >
                <Trash2 size={11} />
              </button>
            </div>
            <textarea
              value={script.code}
              onChange={(e) => updateScript(script.id, { code: e.target.value })}
              onFocus={pushSnapshot}
              spellCheck={false}
              rows={6}
              className="w-full resize-y rounded border border-neutral-700/80 bg-[#0a0b0c] px-2.5 py-2 font-mono text-[11px] leading-relaxed text-neutral-100 outline-none transition focus:border-emerald-400"
              placeholder="// Codigo aqui"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addScript}
          className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-700/60 text-[11px] font-medium text-neutral-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
        >
          <Plus size={12} />
          Adicionar Script
        </button>
      </div>
    </Section>
  );
}

/* ── MaterialEditor (inline redesigned) ── */

function MaterialEditor({
  material,
  onPatch,
}: {
  material: EditorMaterial;
  onPatch?: (patch: Partial<Omit<EditorMaterial, 'uuid' | 'objectId'>>) => void;
}) {
  const updateMaterial = useMaterialStore((s) => s.updateMaterial);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasTexture = Boolean(material.textureUrl);

  const update = (patch: Partial<Omit<EditorMaterial, 'uuid' | 'objectId'>>) => {
    if (onPatch) {
      onPatch(patch);
      return;
    }

    updateMaterial(material.uuid, patch);
  };

  const handleTexture = (file: File | undefined) => {
    if (!file) return;
    pushSnapshot();
    update({
      textureUrl: URL.createObjectURL(file),
      textureName: file.name,
      normalMapUrl: null,
      roughnessMapUrl: null,
      displacementMapUrl: null,
    });
  };

  const clearTexture = () => {
    pushSnapshot();
    update({
      textureUrl: null,
      textureName: null,
      normalMapUrl: null,
      roughnessMapUrl: null,
      displacementMapUrl: null,
      textureRepeatX: 1,
      textureRepeatY: 1,
      textureOffsetX: 0,
      textureOffsetY: 0,
      textureRotation: 0,
    });
  };

  return (
    <Section title="Material" icon={<Circle size={11} className="text-emerald-400" />}>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-2 lg:grid-cols-1">
        <ColorInput label="Cor" value={material.color} onChange={(v) => update({ color: v })} />
        <ColorInput label="Emissiva" value={material.emissive} onChange={(v) => update({ emissive: v })} />
      </div>
      <SliderInput label="Metalness" value={material.metalness} min={0} max={1} step={0.01} onChange={(v) => update({ metalness: v })} />
      <SliderInput label="Roughness" value={material.roughness} min={0} max={1} step={0.01} onChange={(v) => update({ roughness: v })} />
      <SliderInput label="Emissao" value={material.emissiveIntensity} min={0} max={3} step={0.05} onChange={(v) => update({ emissiveIntensity: v })} />
      <SliderInput label="Opacidade" value={material.opacity} min={0.05} max={1} step={0.01} suffix="%" onChange={(v) => update({ opacity: v })} />

      <div className="grid gap-1.5">
        <span className={labelClass}>Textura</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md border border-neutral-700/80 bg-[#0d0f10] px-3 text-xs text-neutral-300 transition hover:border-emerald-400/70 hover:text-emerald-100"
          >
            <ImagePlus size={13} className="shrink-0 text-neutral-500" />
            <span className="truncate">{material.textureName ?? 'Selecionar'}</span>
          </button>
          <input ref={inputRef} type="file" accept={TEXTURE_FILE_ACCEPT} className="hidden" onChange={(e) => { handleTexture(e.target.files?.[0]); e.currentTarget.value = ''; }} />
          <button
            type="button"
            onClick={clearTexture}
            disabled={!hasTexture}
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md border border-neutral-700/80 text-neutral-400 transition hover:border-red-400/70 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Trash2 size={12} />
          </button>
        </div>
        {hasTexture && (
          <div className="flex flex-wrap gap-1 text-[10px] tracking-[0.1em] text-neutral-500">
            <span className="rounded border border-neutral-800 px-1.5 py-0.5">Diffuse</span>
            {material.normalMapUrl && <span className="rounded border border-neutral-800 px-1.5 py-0.5">Normal</span>}
            {material.roughnessMapUrl && <span className="rounded border border-neutral-800 px-1.5 py-0.5">Roughness</span>}
            {material.displacementMapUrl && <span className="rounded border border-neutral-800 px-1.5 py-0.5">Displace</span>}
          </div>
        )}
      </div>

      <details className="group">
        <summary className="flex cursor-pointer items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500 transition hover:text-neutral-300">
          <ChevronDown size={11} className="-ml-0.5 transition group-open:rotate-0 -rotate-90" />
          UV Map
        </summary>
        <div className="mt-2 grid gap-2 rounded-md border border-neutral-800 bg-[#0d0f10]/50 p-2.5">
          <SliderInput label="Tile X" value={material.textureRepeatX} min={0.1} max={8} step={0.1} onChange={(v) => update({ textureRepeatX: v })} />
          <SliderInput label="Tile Y" value={material.textureRepeatY} min={0.1} max={8} step={0.1} onChange={(v) => update({ textureRepeatY: v })} />
          <SliderInput label="Off X" value={material.textureOffsetX} min={-2} max={2} step={0.01} onChange={(v) => update({ textureOffsetX: v })} />
          <SliderInput label="Off Y" value={material.textureOffsetY} min={-2} max={2} step={0.01} onChange={(v) => update({ textureOffsetY: v })} />
          <SliderInput
            label="Rotacao"
            value={material.textureRotation * (180 / Math.PI)}
            min={-180} max={180} step={1}
            onChange={(v) => update({ textureRotation: (v * Math.PI) / 180 })}
            suffix="°"
          />
          <button
            type="button"
            onClick={() => { pushSnapshot(); update({ textureRepeatX: 1, textureRepeatY: 1, textureOffsetX: 0, textureOffsetY: 0, textureRotation: 0 }); }}
            disabled={!hasTexture}
            className="h-7 rounded border border-neutral-700/80 px-2 text-[10px] uppercase tracking-[0.14em] text-neutral-400 transition hover:border-emerald-400/70 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Reset
          </button>
        </div>
      </details>
    </Section>
  );
}

/* ── LightPanel ── */

const LIGHT_KINDS: LightConfig['kind'][] = ['spot', 'point', 'directional', 'ambient'];
const LIGHT_KIND_LABELS: Record<LightConfig['kind'], string> = {
  spot: 'Spotlight',
  point: 'Puntual',
  directional: 'Direcional',
  ambient: 'Ambiente',
};

function LightPanel({ object }: { object: SceneObject }) {
  const updateObject = useSceneStore((s) => s.updateObject);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const config = object.lightConfig!;

  const update = (patch: Partial<LightConfig>) => {
    pushSnapshot();
    updateObject(object.uuid, { lightConfig: { ...config, ...patch } });
  };

  return (
    <Section title="Luz" icon={<Circle size={11} className="text-yellow-400" />}>
      <label className="grid gap-1.5">
        <span className={labelClass}>Tipo</span>
        <select
          value={config.kind}
          onChange={(e) => update({ kind: e.target.value as LightConfig['kind'] })}
          className={inputClass}
        >
          {LIGHT_KINDS.map((k) => (
            <option key={k} value={k}>{LIGHT_KIND_LABELS[k]}</option>
          ))}
        </select>
      </label>
      <ColorInput label="Cor" value={config.color} onChange={(v) => update({ color: v })} />
      <SliderInput label="Intensidade" value={config.intensity} min={0} max={20} step={0.1} onChange={(v) => update({ intensity: v })} />
      {config.kind !== 'ambient' && (
        <>
          <SliderInput label="Distancia" value={config.distance} min={0} max={50} step={0.5} onChange={(v) => update({ distance: v })} />
          <SliderInput label="Decaimento" value={config.decay} min={0} max={4} step={0.1} onChange={(v) => update({ decay: v })} />
        </>
      )}
      {config.kind === 'spot' && (
        <>
          <SliderInput label="Angulo" value={config.angle} min={0.05} max={1.5} step={0.05} suffix="rad" onChange={(v) => update({ angle: v })} />
          <SliderInput label="Penumbra" value={config.penumbra} min={0} max={1} step={0.05} suffix="%" onChange={(v) => update({ penumbra: v })} />
        </>
      )}
      {config.kind !== 'ambient' && (
        <ToggleRow label="Sombra" enabled={config.castShadow} onChange={() => update({ castShadow: !config.castShadow })} />
      )}
      {config.castShadow && config.kind !== 'ambient' && (
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-2 lg:grid-cols-1">
          <NumericInput label="Bias" value={config.shadowBias} step={0.001} onChange={(v) => update({ shadowBias: v })} />
          <NumericInput label="Raio" value={config.shadowRadius} step={0.5} onChange={(v) => update({ shadowRadius: v })} />
        </div>
      )}
      {config.kind !== 'ambient' && (
        <div className="grid gap-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
            <Move3D size={11} className="text-neutral-600" />
            Alvo
          </span>
          <div className="grid grid-cols-3 gap-1.5 xl:grid-cols-3 lg:grid-cols-2">
            {([0, 1, 2] as const).map((i) => (
              <NumericInput
                key={i}
                axis={i}
                value={config.target[i]}
                step={0.1}
                onChange={(v) => {
                  const next = [...config.target] as Vec3;
                  next[i] = v;
                  update({ target: next });
                }}
              />
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}

/* ── ReferenceManager ── */

function ReferenceManager() {
  const referenceImages = useSceneStore((s) => s.referenceImages);
  const removeReferenceImage = useSceneStore((s) => s.removeReferenceImage);
  const updateReferenceImage = useSceneStore((s) => s.updateReferenceImage);
  const selectedReferenceId = useEditorStore((s) => s.selectedReferenceId);
  const setSelectedReference = useEditorStore((s) => s.setSelectedReference);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const selectedRef = referenceImages.find((r) => r.id === selectedReferenceId);

  return (
    <div className="grid gap-2 px-2 pb-2">
      <div className="flex items-center gap-2 px-2 py-2">
        <ImagePlus size={13} className="text-rose-400" />
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Referencias</h2>
      </div>

      {referenceImages.length === 0 && (
        <p className="px-2 text-[11px] text-neutral-500">
          Nenhuma referencia.
        </p>
      )}

      <div className="grid gap-1">
        {referenceImages.map((ref) => (
          <div
            key={ref.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedReference(selectedReferenceId === ref.id ? null : ref.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedReference(selectedReferenceId === ref.id ? null : ref.id); } }}
            className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-left text-xs transition ${
              selectedReferenceId === ref.id
                ? 'border-rose-400/50 bg-rose-400/10 text-rose-100'
                : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            <Image size={12} className="shrink-0 text-neutral-500" />
            <span className="min-w-0 flex-1 truncate">{ref.name}</span>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); pushSnapshot(); updateReferenceImage(ref.id, { visible: !ref.visible }); }}
                className={`grid h-7 w-7 cursor-pointer place-items-center rounded ${ref.visible ? 'text-emerald-300' : 'text-neutral-600'}`}
              >
                {ref.visible ? <Eye size={11} /> : <EyeOff size={11} />}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); pushSnapshot(); removeReferenceImage(ref.id); setSelectedReference(null); }}
                className="grid h-7 w-7 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-red-500/15 hover:text-red-200"
              >
                <Trash2 size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedRef && (
        <div className="grid gap-2.5 rounded-md border border-neutral-800 bg-neutral-950/60 p-2.5">
          <label className="grid gap-0.5">
            <span className={labelClass}>Nome</span>
            <input
              type="text"
              value={selectedRef.name}
              onFocus={pushSnapshot}
              onChange={(e) => updateReferenceImage(selectedRef.id, { name: e.target.value })}
              className={inputClass}
            />
          </label>
          <SliderInput label="Opacidade" value={selectedRef.opacity} min={0.05} max={1} step={0.05} suffix="%" accent="rose" onChange={(v) => updateReferenceImage(selectedRef.id, { opacity: v })} />

          <div className="grid gap-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
              <Move3D size={11} className="text-neutral-600" />
              Posicao
            </span>
            <div className="grid grid-cols-3 gap-1.5 xl:grid-cols-3 lg:grid-cols-2">
          {([0, 1, 2] as const).map((i) => (
                <NumericInput
                  key={i}
                  axis={i}
                  value={selectedRef.position[i]}
                  step={0.1}
                  onChange={(v) => {
                    const pos = [...selectedRef.position] as Vec3;
                    pos[i] = v;
                    updateReferenceImage(selectedRef.id, { position: pos });
                  }}
                  onFocus={pushSnapshot}
                />
              ))}
            </div>
          </div>

          <NumericInput label="Tamanho" value={selectedRef.scale[1]} step={0.5} onChange={(v) => {
            updateReferenceImage(selectedRef.id, { scale: [v, v, v] });
          }} />
        </div>
      )}
    </div>
  );
}


/* ── TextConfigPanel ── */

function TextConfigPanel({ object }: { object: SceneObject }) {
  const updateObject = useSceneStore((s) => s.updateObject);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const config = object.textConfig!;

  const update = (patch: Partial<Text3DConfig>) => {
    updateObject(object.uuid, { textConfig: { ...config, ...patch } });
  };

  return (
    <div className="grid gap-2.5">
      <label className="grid gap-0.5">
        <span className={labelClass}>Texto</span>
        <input
          type="text"
          value={config.text}
          onFocus={pushSnapshot}
          onChange={(e) => update({ text: e.target.value })}
          className={inputClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-2 lg:grid-cols-1">
        <NumericInput label="Tamanho" value={config.size} step={0.1} onChange={(v) => { pushSnapshot(); update({ size: v }); }} />
        <NumericInput label="Profund." value={config.depth} step={0.05} onChange={(v) => { pushSnapshot(); update({ depth: v }); }} />
      </div>
      <NumericInput label="Segmentos" value={config.curveSegments} step={1} onChange={(v) => { pushSnapshot(); update({ curveSegments: Math.max(1, Math.round(v)) }); }} />
      <ToggleRow label="Bisel" enabled={config.bevelEnabled} onChange={() => { pushSnapshot(); update({ bevelEnabled: !config.bevelEnabled }); }} />
      {config.bevelEnabled && (
        <div className="grid grid-cols-3 gap-2 xl:grid-cols-3 lg:grid-cols-2">
          <NumericInput label="Espessura" value={config.bevelThickness} step={0.01} onChange={(v) => update({ bevelThickness: v })} />
          <NumericInput label="Tamanho" value={config.bevelSize} step={0.01} onChange={(v) => update({ bevelSize: v })} />
          <NumericInput label="Segments" value={config.bevelSegments} step={1} onChange={(v) => update({ bevelSegments: Math.max(1, Math.round(v)) })} />
        </div>
      )}
    </div>
  );
}

function SvgConfigPanel({ object }: { object: SceneObject }) {
  const updateObject = useSceneStore((s) => s.updateObject);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const config = object.svgConfig!;

  const update = (patch: Partial<SvgConfig>) => {
    updateObject(object.uuid, { svgConfig: { ...config, ...patch } });
  };

  const isRasterImage = (() => {
    const src = object.source ?? '';
    if (src.startsWith('data:image/') && !src.startsWith('data:image/svg')) return true;
    if (/\.(png|jpe?g|webp|gif|bmp)(\?|$)/i.test(src)) return true;
    return false;
  })();

  return (
    <div className="grid gap-2.5">
      <SliderInput
        label="Profundidade"
        value={config.depth}
        min={0.05}
        max={2}
        step={0.05}
        onChange={(v) => { pushSnapshot(); update({ depth: v }); }}
      />
      <ToggleRow label="Bisel" enabled={config.bevelEnabled} onChange={() => { pushSnapshot(); update({ bevelEnabled: !config.bevelEnabled }); }} />
      {config.bevelEnabled && (
        <div className="grid grid-cols-2 gap-2">
          <NumericInput label="Bisel Esp." value={config.bevelThickness} step={0.01} onChange={(v) => update({ bevelThickness: v })} />
          <NumericInput label="Bisel Tam." value={config.bevelSize} step={0.01} onChange={(v) => update({ bevelSize: v })} />
        </div>
      )}
      {object.source && (
        <div className="rounded-md border border-neutral-800 bg-neutral-950/40 p-2">
          <p className="truncate text-[9px] text-neutral-500">
            {isRasterImage ? 'Imagem' : 'SVG'}: {object.source.startsWith('data:') ? 'carregado' : object.source}
          </p>
        </div>
      )}
    </div>
  );
}

const materialScopeLabels: Record<MaterialApplicationScope, string> = {
  self: 'Subelemento',
  children: 'Filhos',
  subtree: 'Objeto inteiro',
};

function MaterialScopeSelector({
  scope,
  onChange,
  disabled,
}: {
  scope: MaterialApplicationScope;
  onChange: (scope: MaterialApplicationScope) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-1.5 px-2">
      <span className={labelClass}>Aplicar material em</span>
      <div className="grid grid-cols-3 gap-1 rounded-md border border-neutral-800 bg-neutral-950/60 p-1">
        {(['self', 'children', 'subtree'] as MaterialApplicationScope[]).map((item) => (
          <button
            key={item}
            type="button"
            disabled={disabled}
            onClick={() => onChange(item)}
            className={`h-7 rounded text-[10px] font-medium transition disabled:cursor-not-allowed disabled:opacity-35 ${
              scope === item
                ? 'bg-emerald-400 text-neutral-950'
                : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
            }`}
          >
            {materialScopeLabels[item]}
          </button>
        ))}
      </div>
    </div>
  );
}

function GroupPanel({ object, objects }: { object: SceneObject; objects: SceneObject[] }) {
  const setSelectedObject = useEditorStore((s) => s.setSelectedObject);
  const children = objects.filter((item) => item.parentId === object.uuid);
  const descendantCount = getDescendantIds(objects, object.uuid).length;

  return (
    <Section title="Grupo" icon={<Folder size={11} className="text-emerald-400" />}>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
          <span className={labelClass}>Filhos diretos</span>
          <div className="mt-1 text-lg font-semibold text-neutral-100">{children.length}</div>
        </div>
        <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
          <span className={labelClass}>Subárvore</span>
          <div className="mt-1 text-lg font-semibold text-neutral-100">{descendantCount}</div>
        </div>
      </div>
      <div className="grid gap-1.5">
        {children.length === 0 ? (
          <p className="text-[11px] text-neutral-500">Nenhum filho.</p>
        ) : (
          children.map((child) => (
            <button
              key={child.uuid}
              type="button"
              onClick={() => setSelectedObject(child.uuid)}
              className="flex h-8 items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950/50 px-2 text-left text-xs text-neutral-300 transition hover:border-emerald-400/50 hover:text-emerald-100"
            >
              <Box size={12} className="shrink-0 text-neutral-500" />
              <span className="min-w-0 flex-1 truncate">{child.name}</span>
              <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-neutral-600">{child.type}</span>
            </button>
          ))
        )}
      </div>
    </Section>
  );
}

function MeshInfoPanel({ object }: { object: SceneObject }) {
  const vertexCount = object.editableMesh?.vertices.length ?? null;
  const faceCount = object.editableMesh ? Math.floor(object.editableMesh.indices.length / 3) : null;
  const materialSlotCount = object.materialIds?.length ?? 1;

  return (
    <Section title="Mesh" icon={<Grid3X3 size={11} className="text-sky-400" />}>
      <div className="grid grid-cols-3 gap-2 xl:grid-cols-3 lg:grid-cols-2">
        <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
          <span className={labelClass}>Geometria</span>
          <div className="mt-1 truncate text-xs text-neutral-200">
            {object.primitive ? primitiveLabels[object.primitive] : object.metadata.gltfNodeType ? String(object.metadata.gltfNodeType) : 'Buffer'}
          </div>
        </div>
        <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
          <span className={labelClass}>Vertices</span>
          <div className="mt-1 text-xs tabular-nums text-neutral-200">{vertexCount ?? 'Fonte'}</div>
        </div>
        <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
          <span className={labelClass}>Faces</span>
          <div className="mt-1 text-xs tabular-nums text-neutral-200">{faceCount ?? 'GLB'}</div>
        </div>
      </div>
      <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2 text-xs text-neutral-400">
        {materialSlotCount} {materialSlotCount === 1 ? 'material' : 'materiais'} neste subelemento
      </div>
    </Section>
  );
}

/* ── Object type icon helper ── */

const objectIcon = (object: SceneObject) => {
  if (object.type === 'Group' || object.kind === 'group') return <Folder size={14} className="text-emerald-400" />;
  if (object.textConfig) return <Type size={14} className="text-sky-400" />;
  if (object.svgConfig) return <FileCode size={14} className="text-amber-400" />;
  if (object.effect) return <Circle size={14} className="text-amber-400" />;
  if (object.lightConfig) return <Sun size={14} className="text-yellow-400" />;
  if (object.kind === 'model') return <Box size={14} className="text-sky-400" />;
  switch (object.primitive) {
    case 'sphere': return <Circle size={14} className="text-emerald-400" />;
    case 'cylinder': return <Cuboid size={14} className="text-emerald-400" />;
    case 'torus': return <Torus size={14} className="text-emerald-400" />;
    default: return <Box size={14} className="text-emerald-400" />;
  }
};

const typeLabel = (object: SceneObject) => {
  if (object.type === 'Group' || object.kind === 'group') return 'Group';
  if (object.kind === 'mesh') return 'Mesh';
  if (object.kind === 'object3d') return 'Object3D';
  if (object.kind === 'camera') return 'Camera';
  if (object.textConfig) return 'Texto 3D';
  if (object.svgConfig) return 'SVG';
  if (object.effect) return 'Efeito';
  if (object.lightConfig) return 'Luz';
  if (object.kind === 'model') return 'Modelo 3D';
  return object.primitive ? primitiveLabels[object.primitive] : 'Primitiva';
};

/* ── Quick action buttons (small) ── */

function ActionButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md border px-2 text-[10px] font-medium transition ${
        danger
          ? 'border-red-400/30 text-red-300 hover:border-red-400/60 hover:bg-red-400/8'
          : 'border-neutral-700/60 text-neutral-400 hover:border-emerald-400/50 hover:text-emerald-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* ── Main Properties ── */

export default function Properties() {
  const selectedObjectIds = useEditorStore((s) => s.selectedObjectIds);
  const selectedReferenceId = useEditorStore((s) => s.selectedReferenceId);
  const activeTool = useEditorStore((s) => s.activeTool);
  const objects = useSceneStore((s) => s.objects);
  const updateObject = useSceneStore((s) => s.updateObject);
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot);
  const rightPanelCollapsed = useEditorStore((s) => s.rightPanelCollapsed);
  const setRightPanelCollapsed = useEditorStore((s) => s.setRightPanelCollapsed);
  const allMaterials = useMaterialStore((s) => s.materials);
  const updateMaterial = useMaterialStore((s) => s.updateMaterial);
  const [materialScope, setMaterialScope] = useState<MaterialApplicationScope>('self');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const object = objects.find((item) => item.uuid === (selectedObjectIds[0] ?? null));
  const propertiesBodyRef = useRef<HTMLDivElement>(null);
  const prevSelectedId = useRef<string | null>(null);

  useEffect(() => {
    if (!object || selectedObjectIds[0] === prevSelectedId.current) return;
    prevSelectedId.current = selectedObjectIds[0] ?? null;

    let sectionId: string | null = null;
    switch (activeTool) {
      case 'translate':
      case 'rotate':
      case 'scale':
        sectionId = 'section-transformar';
        break;
      case 'edit':
      case 'sculpt':
        sectionId = 'section-modelagem';
        break;
    }

    if (sectionId && propertiesBodyRef.current) {
      const el = propertiesBodyRef.current.querySelector(`#${sectionId}`) as HTMLElement | null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedObjectIds, activeTool, object]);

  const materialIds = object?.materialIds?.length ? object.materialIds : object ? [object.materialId] : [];
  const activeMaterialId = materialIds.includes(selectedMaterialId ?? '') ? selectedMaterialId! : object?.materialId;
  const material = activeMaterialId ? allMaterials[activeMaterialId] ?? null : null;
  const canEditMaterial = object ? canObjectHaveMaterial(object) || getDescendantIds(objects, object.uuid).some((id) => {
    const child = objects.find((item) => item.uuid === id);
    return Boolean(child && canObjectHaveMaterial(child));
  }) : false;
  const materialTargets = useMemo(
    () => (object ? getMaterialTargetObjects(objects, object.uuid, materialScope) : []),
    [materialScope, object, objects],
  );

  const applyMaterialPatch = (patch: Partial<Omit<EditorMaterial, 'uuid' | 'objectId'>>) => {
    if (!object) return;

    const targets = materialTargets.length > 0 ? materialTargets : canObjectHaveMaterial(object) ? [object] : [];
    const targetMaterialIds =
      materialScope === 'self' && activeMaterialId
        ? [activeMaterialId]
        : Array.from(new Set(targets.flatMap((target) => target.materialIds?.length ? target.materialIds : [target.materialId])));

    targetMaterialIds.forEach((materialId) => updateMaterial(materialId, patch));
    targets.forEach((target) => {
      const ids = target.materialIds?.length ? target.materialIds : [target.materialId];
      updateObject(target.uuid, {
        metadata: {
          materialOverrides: {
            ...(target.metadata.materialOverrides ?? {}),
            ...Object.fromEntries(ids.filter((id) => targetMaterialIds.includes(id)).map((id) => [id, true])),
          },
        },
      });
    });
  };

  /* ── Collapsed state ── */
  if (rightPanelCollapsed) {
    return (
      <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-[#151719]">
        <div className="flex items-center justify-center border-b border-neutral-800 py-3">
          <button
            type="button"
            onClick={() => setRightPanelCollapsed(false)}
            className="grid min-h-9 min-w-9 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
            title="Expandir"
          >
            <PanelRight size={15} className="rotate-180" />
          </button>
        </div>
      </aside>
    );
  }

  /* ── No object selected → show references ── */
  if (!object) {
    return (
      <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-[#151719]">
        {/* Collapsed header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <PanelRight size={14} className="text-emerald-300" />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Properties</h2>
          </div>
          <button
            type="button"
            onClick={() => setRightPanelCollapsed(true)}
            className="grid min-h-8 min-w-8 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
            title="Recolher"
          >
            <PanelRight size={14} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto pt-3">
          <ReferenceManager />
        </div>
      </aside>
    );
  }

  /* ── Object selected ── */
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-[#151719]">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 border-b border-neutral-800 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-neutral-800/80">
          {objectIcon(object)}
        </div>
        <div className="min-w-0 flex-1">
          <input
            value={object.name}
            onFocus={pushSnapshot}
            onChange={(e) => updateObject(object.uuid, { name: e.target.value })}
            className="w-full bg-transparent text-sm font-medium text-neutral-100 outline-none"
          />
          <span className="text-[10px] text-neutral-500">{typeLabel(object)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { pushSnapshot(); updateObject(object.uuid, { visible: !object.visible }); }}
            className={`grid h-8 w-8 cursor-pointer place-items-center rounded transition ${
              object.visible
                ? 'text-emerald-300 hover:bg-emerald-400/10'
                : 'text-neutral-600 hover:bg-neutral-700/60 hover:text-neutral-300'
            }`}
            title={object.visible ? 'Visivel' : 'Oculto'}
          >
            {object.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            type="button"
            onClick={() => setRightPanelCollapsed(true)}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
            title="Recolher"
          >
            <PanelRight size={14} />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div ref={propertiesBodyRef} className="min-h-0 flex-1 space-y-1 overflow-auto py-3">
        {/* Transform */}
        <Section title="Transformar" icon={<Move3D size={11} className="text-neutral-500" />}>
          <TransformRow object={object} field="position" />
          <TransformRow object={object} field="rotation" />
          <TransformRow object={object} field="scale" />
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => { pushSnapshot(); updateObject(object.uuid, { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }); }}
              className="flex h-7 cursor-pointer items-center gap-1 rounded border border-neutral-700/60 px-2 text-[10px] font-medium text-neutral-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
            >
              <RotateCcw size={11} />
              Reset
            </button>
            <button
              type="button"
              onClick={() => { pushSnapshot(); updateObject(object.uuid, { position: [0, 0, 0] }); }}
              className="flex h-7 cursor-pointer items-center gap-1 rounded border border-neutral-700/60 px-2 text-[10px] font-medium text-neutral-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
            >
              <Crosshair size={11} />
              Centralizar
            </button>
          </div>
        </Section>

        <div className="mx-3 border-t border-neutral-800/60" />

        {Boolean(object.metadata?.imageTo3D) && <ImageTo3DPanel object={object} />}

        {(object.type === 'Group' || object.kind === 'group' || object.kind === 'object3d') && <GroupPanel object={object} objects={objects} />}

        {object.type === 'Mesh' && <MeshInfoPanel object={object} />}

        <PhysicsPanel object={object} objects={objects} />

        {/* Material */}
        {canEditMaterial && material && !object.effect && !object.lightConfig && (
          <>
            {materialIds.length > 1 && (
              <div className="grid gap-1.5 px-2 pb-1">
                <span className={labelClass}>Material do subelemento</span>
                <select
                  value={activeMaterialId}
                  onChange={(event) => setSelectedMaterialId(event.target.value)}
                  className={inputClass}
                >
                  {materialIds.map((id, index) => (
                    <option key={id} value={id}>
                      {allMaterials[id]?.name ?? `Material ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <MaterialScopeSelector
              scope={materialScope}
              onChange={setMaterialScope}
            />
            <MaterialEditor material={material} onPatch={applyMaterialPatch} />
          </>
        )}

        {/* Light Config */}
        {object.lightConfig && <LightPanel object={object} />}

        {/* Text Config */}
        {object.textConfig && (
          <Section title="Texto 3D" icon={<Type size={11} className="text-sky-400" />}>
            <TextConfigPanel object={object} />
          </Section>
        )}

        {/* SVG / Image Config */}
        {object.svgConfig && (
          <Section title="SVG / Imagem 3D" icon={<FileCode size={11} className="text-amber-400" />}>
            <SvgConfigPanel object={object} />
          </Section>
        )}

        {/* Effect */}
        {object.effect && <EffectPanel object={object} />}

        {/* Modeling (primitives only) */}
        {!object.effect && !object.svgConfig && !object.textConfig && !object.lightConfig && object.kind === 'primitive' && material && (
          <Section title="Modelagem" icon={<Brush size={11} className="text-orange-400" />}>
            <ModelingTools object={object} material={material} />
          </Section>
        )}

        {!object.effect && !object.svgConfig && !object.textConfig && !object.lightConfig && (
          <>
            <div className="mx-3 border-t border-neutral-800/60" />
            <BehaviorPanel object={object} />
            <div className="mx-3 border-t border-neutral-800/60" />
          </>
        )}

        {/* Scripts */}
        {!object.svgConfig && !object.textConfig && !object.lightConfig && <ScriptPanel object={object} />}
      </div>
    </aside>
  );
}
