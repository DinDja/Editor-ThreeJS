'use client';

import { Eye, EyeOff, Move3D, PanelRight, Rotate3D, Scale3D } from 'lucide-react';
import * as THREE from 'three';
import CollapsibleSection from './CollapsibleSection';
import MaterialEditor from './MaterialEditor';
import ModelingTools from './ModelingTools';
import { primitiveKinds, primitiveLabels } from '@/lib/geometryOps';
import { createPrimitiveEditableMesh } from '@/lib/meshOps';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { useTimelineStore } from '@/store/timelineStore';
import type { BehaviorConfig, BehaviorKind, EffectConfig, EffectKind, SceneObject, Vec3 } from '@/store/types';
import { EFFECT_KINDS, EFFECT_LABELS, EFFECT_PRESETS } from '@/lib/effects';
import { BEHAVIOR_KINDS, BEHAVIOR_LABELS, BEHAVIOR_DEFAULTS } from '@/lib/behaviors';

const labelClass = 'text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500';
const inputClass =
  'h-9 w-full rounded-md border border-neutral-700/80 bg-[#0d0f10] px-2.5 text-sm text-neutral-100 outline-none transition focus:border-emerald-400 focus:bg-[#101414]';

type TransformField = 'position' | 'rotation' | 'scale';

const fieldLabels: Record<TransformField, string> = {
  position: 'Pos',
  rotation: 'Rot',
  scale: 'Esc',
};

const axisLabels = ['X', 'Y', 'Z'];

const axisColors = ['text-red-300', 'text-emerald-300', 'text-sky-300'];

const fieldIcons = {
  position: Move3D,
  rotation: Rotate3D,
  scale: Scale3D,
};

const formatValue = (value: number) => {
  const rounded = Math.abs(value) < 0.0001 ? 0 : value;
  return Number(rounded.toFixed(3));
};

function TransformRow({ object, field }: { object: SceneObject; field: TransformField }) {
  const updateObject = useSceneStore((state) => state.updateObject);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const autoKey = useTimelineStore((state) => state.autoKey);
  const addTransformKeyframe = useTimelineStore((state) => state.addTransformKeyframe);
  const values = object[field];
  const Icon = fieldIcons[field];

  const setValue = (axis: number, rawValue: number) => {
    if (!Number.isFinite(rawValue)) return;

    const next = [...values] as Vec3;
    next[axis] = field === 'rotation' ? THREE.MathUtils.degToRad(rawValue) : rawValue;
    updateObject(object.uuid, { [field]: next });

    if (autoKey) {
      addTransformKeyframe({ ...object, [field]: next });
    }
  };

  return (
    <div className="grid gap-2">
      <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">
        <Icon size={12} className="text-neutral-600" />
        {fieldLabels[field]}
      </span>
      <div className="grid grid-cols-3 gap-2">
        {values.map((value, axis) => {
          const displayValue = field === 'rotation' ? THREE.MathUtils.radToDeg(value) : value;

          return (
            <label key={`${field}-${axis}`} className="grid gap-1">
              <span className={`text-[10px] font-semibold ${axisColors[axis]}`}>{axisLabels[axis]}</span>
              <input
                type="number"
                step={field === 'rotation' ? 1 : field === 'scale' ? 0.05 : 0.1}
                value={formatValue(displayValue)}
                onFocus={pushSnapshot}
                onChange={(event) => setValue(axis, event.target.valueAsNumber)}
                className={inputClass}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}

function EffectPanel({ object }: { object: SceneObject }) {
  const updateObject = useSceneStore((state) => state.updateObject);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const effect = object.effect!;

  const updateEffect = (patch: Partial<EffectConfig>) => {
    if (patch.kind) {
      const preset = EFFECT_PRESETS[patch.kind];
      updateObject(object.uuid, {
        effect: { ...preset, ...patch },
      });
    } else {
      updateObject(object.uuid, {
        effect: { ...effect, ...patch },
      });
    }
  };

  return (
    <CollapsibleSection title="Efeito">
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">Tipo</span>
          <select
            value={effect.kind}
            onChange={(event) => {
              pushSnapshot();
              updateEffect({ kind: event.target.value as EffectKind });
            }}
            className="h-9 w-full rounded-md border border-neutral-700/80 bg-[#0d0f10] px-2.5 text-sm text-neutral-100 outline-none transition focus:border-emerald-400 focus:bg-[#101414]"
          >
            {EFFECT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {EFFECT_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">Cor</span>
          <input
            type="color"
            value={effect.color}
            onChange={(event) => {
              pushSnapshot();
              updateEffect({ color: event.target.value });
            }}
            className="h-9 w-full cursor-pointer rounded-md border border-neutral-700/80 bg-[#0d0f10] px-2"
          />
        </label>

        <label className="grid gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">Intensidade</span>
            <span className="text-xs tabular-nums text-neutral-400">{effect.intensity.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={2}
            step={0.05}
            value={effect.intensity}
            onChange={(event) => updateEffect({ intensity: Number(event.target.value) })}
            className="h-1.5 w-full cursor-pointer accent-emerald-400"
          />
        </label>

        <label className="grid gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">Tamanho</span>
            <span className="text-xs tabular-nums text-neutral-400">{effect.size.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={2}
            step={0.05}
            value={effect.size}
            onChange={(event) => updateEffect({ size: Number(event.target.value) })}
            className="h-1.5 w-full cursor-pointer accent-emerald-400"
          />
        </label>

        <label className="grid gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500">Particulas</span>
            <span className="text-xs tabular-nums text-neutral-400">{effect.count}</span>
          </div>
          <input
            type="range"
            min={10}
            max={300}
            step={10}
            value={effect.count}
            onChange={(event) => updateEffect({ count: Number(event.target.value) })}
            className="h-1.5 w-full cursor-pointer accent-emerald-400"
          />
        </label>
      </div>
    </CollapsibleSection>
  );
}

function BehaviorPanel({ object }: { object: SceneObject }) {
  const updateObject = useSceneStore((state) => state.updateObject);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
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

  const getBehavior = (kind: BehaviorKind) => behaviors.find((b) => b.type === kind) ?? BEHAVIOR_DEFAULTS[kind];

  return (
    <CollapsibleSection title="Comportamentos">
      <div className="grid gap-3">
        {BEHAVIOR_KINDS.map((kind) => {
          const config = getBehavior(kind);
          const enabled = config.enabled;

          return (
            <div key={kind} className="rounded-md border border-neutral-800 bg-neutral-950 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-[0.1em] text-neutral-400">{BEHAVIOR_LABELS[kind]}</span>
                <button
                  type="button"
                  onClick={() => toggleBehavior(kind)}
                  className={`cursor-pointer rounded px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                    enabled
                      ? 'bg-emerald-400/15 text-emerald-300'
                      : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'
                  }`}
                >
                  {enabled ? 'Ativo' : 'Inativo'}
                </button>
              </div>

              {enabled && kind === 'jump' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <span className="text-[10px] text-neutral-500">Altura</span>
                    <input
                      type="number"
                      step={0.1}
                      value={config.jumpHeight ?? 1.5}
                      onChange={(e) => updateBehavior(kind, { jumpHeight: Number(e.target.value) })}
                      className="h-7 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs text-neutral-100 outline-none focus:border-emerald-400"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] text-neutral-500">Intervalo</span>
                    <input
                      type="number"
                      step={0.1}
                      value={config.jumpCooldown ?? 1.2}
                      onChange={(e) => updateBehavior(kind, { jumpCooldown: Number(e.target.value) })}
                      className="h-7 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs text-neutral-100 outline-none focus:border-emerald-400"
                    />
                  </label>
                </div>
              )}

              {enabled && kind === 'walk' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <span className="text-[10px] text-neutral-500">Velocidade</span>
                    <input
                      type="number"
                      step={0.1}
                      value={config.walkSpeed ?? 1.5}
                      onChange={(e) => updateBehavior(kind, { walkSpeed: Number(e.target.value) })}
                      className="h-7 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs text-neutral-100 outline-none focus:border-emerald-400"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] text-neutral-500">Amplitude</span>
                    <input
                      type="number"
                      step={0.05}
                      value={config.walkAmplitude ?? 0.15}
                      onChange={(e) => updateBehavior(kind, { walkAmplitude: Number(e.target.value) })}
                      className="h-7 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs text-neutral-100 outline-none focus:border-emerald-400"
                    />
                  </label>
                </div>
              )}

              {enabled && kind === 'accelerate' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <span className="text-[10px] text-neutral-500">Aceleracao</span>
                    <input
                      type="number"
                      step={0.1}
                      value={config.acceleration ?? 1.5}
                      onChange={(e) => updateBehavior(kind, { acceleration: Number(e.target.value) })}
                      className="h-7 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs text-neutral-100 outline-none focus:border-emerald-400"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] text-neutral-500">Vel. Maxima</span>
                    <input
                      type="number"
                      step={0.1}
                      value={config.maxSpeed ?? 5}
                      onChange={(e) => updateBehavior(kind, { maxSpeed: Number(e.target.value) })}
                      className="h-7 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs text-neutral-100 outline-none focus:border-emerald-400"
                    />
                  </label>
                </div>
              )}

              {enabled && kind === 'roll' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <span className="text-[10px] text-neutral-500">Velocidade</span>
                    <input
                      type="number"
                      step={0.1}
                      value={config.rollSpeed ?? 2}
                      onChange={(e) => updateBehavior(kind, { rollSpeed: Number(e.target.value) })}
                      className="h-7 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs text-neutral-100 outline-none focus:border-emerald-400"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] text-neutral-500">Eixo</span>
                    <select
                      value={config.rollAxis ?? 'z'}
                      onChange={(e) => updateBehavior(kind, { rollAxis: e.target.value as 'x' | 'z' })}
                      className="h-7 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs text-neutral-100 outline-none focus:border-emerald-400"
                    >
                      <option value="z">Z</option>
                      <option value="x">X</option>
                    </select>
                  </label>
                </div>
              )}

              {enabled && kind === 'gravity' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <span className="text-[10px] text-neutral-500">Forca</span>
                    <input
                      type="number"
                      step={0.5}
                      value={config.gravityStrength ?? 9.8}
                      onChange={(e) => updateBehavior(kind, { gravityStrength: Number(e.target.value) })}
                      className="h-7 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs text-neutral-100 outline-none focus:border-emerald-400"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] text-neutral-500">Chao (Y)</span>
                    <input
                      type="number"
                      step={0.1}
                      value={config.groundY ?? 0}
                      onChange={(e) => updateBehavior(kind, { groundY: Number(e.target.value) })}
                      className="h-7 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs text-neutral-100 outline-none focus:border-emerald-400"
                    />
                  </label>
                </div>
              )}

              {enabled && kind === 'bubble' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <span className="text-[10px] text-neutral-500">Amplitude</span>
                    <input
                      type="number"
                      step={0.05}
                      value={config.bubbleAmplitude ?? 0.3}
                      onChange={(e) => updateBehavior(kind, { bubbleAmplitude: Number(e.target.value) })}
                      className="h-7 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs text-neutral-100 outline-none focus:border-emerald-400"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] text-neutral-500">Frequencia</span>
                    <input
                      type="number"
                      step={0.1}
                      value={config.bubbleFrequency ?? 1.2}
                      onChange={(e) => updateBehavior(kind, { bubbleFrequency: Number(e.target.value) })}
                      className="h-7 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs text-neutral-100 outline-none focus:border-emerald-400"
                    />
                  </label>
                </div>
              )}

              {enabled && kind === 'massDeform' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <span className="text-[10px] text-neutral-500">Intensidade</span>
                    <input
                      type="number"
                      step={0.05}
                      value={config.deformStrength ?? 0.3}
                      onChange={(e) => updateBehavior(kind, { deformStrength: Number(e.target.value) })}
                      className="h-7 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs text-neutral-100 outline-none focus:border-emerald-400"
                    />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-[10px] text-neutral-500">Retorno</span>
                    <input
                      type="number"
                      step={0.1}
                      value={config.deformReturnSpeed ?? 5}
                      onChange={(e) => updateBehavior(kind, { deformReturnSpeed: Number(e.target.value) })}
                      className="h-7 rounded border border-neutral-700/80 bg-[#0d0f10] px-2 text-xs text-neutral-100 outline-none focus:border-emerald-400"
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}

export default function Properties() {
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const objects = useSceneStore((state) => state.objects);
  const updateObject = useSceneStore((state) => state.updateObject);
  const materials = useMaterialStore((state) => state.materials);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const rightPanelCollapsed = useEditorStore((state) => state.rightPanelCollapsed);
  const setRightPanelCollapsed = useEditorStore((state) => state.setRightPanelCollapsed);
  const object = objects.find((item) => item.uuid === selectedObjectId);
  const material = object ? materials[object.materialId] : null;
  const primitive = object?.kind === 'primitive' ? object.primitive ?? 'box' : null;

  const headerContent = rightPanelCollapsed ? (
    <div className="flex items-center justify-center border-b border-neutral-800 py-3">
      <button
        type="button"
        onClick={() => setRightPanelCollapsed(false)}
        className="grid h-7 w-7 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
        title="Expandir"
      >
        <PanelRight size={14} className="rotate-180" />
      </button>
    </div>
  ) : (
    <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3 max-sm:px-3 max-sm:py-2">
      <div className="flex items-center gap-2">
        <PanelRight size={15} className="text-emerald-300" />
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Properties</h2>
      </div>
      <div className="flex items-center gap-2">
        {object && (
          <span className="rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[11px] text-neutral-500">
            {object.effect ? 'Efeito' : object.kind === 'model' ? 'Modelo' : 'Primitiva'}
          </span>
        )}
        <button
          type="button"
          onClick={() => setRightPanelCollapsed(true)}
          className="grid h-7 w-7 cursor-pointer place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
          title="Recolher"
        >
          <PanelRight size={14} />
        </button>
      </div>
    </div>
  );

  if (!object || !material) {
    return (
      <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-[#151719] max-lg:border-l-0 max-lg:border-t">
        {headerContent}
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-[#151719] max-lg:border-l-0 max-lg:border-t">
      {headerContent}
      {!rightPanelCollapsed && (
        <div className="min-h-0 flex-1 overflow-auto p-4 max-sm:p-3">
          <div className="grid gap-6 max-sm:gap-4">
          <section className="grid gap-3">
            <label className="grid gap-2">
              <span className={labelClass}>Nome</span>
              <input
                value={object.name}
                onFocus={pushSnapshot}
                onChange={(event) => updateObject(object.uuid, { name: event.target.value })}
                className={inputClass}
              />
            </label>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="grid gap-1">
                <span className={labelClass}>Tipo</span>
                {object.kind === 'primitive' ? (
                  <select
                    value={primitive ?? 'box'}
                    onFocus={pushSnapshot}
                    onChange={(event) => {
                      const nextPrimitive = event.target.value as SceneObject['primitive'];
                      if (!nextPrimitive || nextPrimitive === object.primitive) return;

                      updateObject(object.uuid, {
                        primitive: nextPrimitive,
                        geometry: undefined,
                        editableMesh: object.editableMesh ? createPrimitiveEditableMesh(nextPrimitive) : undefined,
                      });
                    }}
                    className={inputClass}
                  >
                    {primitiveKinds.map((kind) => (
                      <option key={kind} value={kind}>
                        {primitiveLabels[kind]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-2.5 text-neutral-300">Modelo</span>
                )}
              </div>
              <div className="grid gap-1">
                <span className={labelClass}>Visivel</span>
                <button
                  type="button"
                  onClick={() => {
                    pushSnapshot();
                    updateObject(object.uuid, { visible: !object.visible });
                  }}
                  className={`flex h-11 cursor-pointer items-center gap-2 rounded-md border px-4 text-left transition ${
                    object.visible
                      ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-500'
                  }`}
                >
                  {object.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span>{object.visible ? 'Sim' : 'Nao'}</span>
                </button>
              </div>
            </div>
          </section>

          <CollapsibleSection title="Transform">
            <TransformRow object={object} field="position" />
            <TransformRow object={object} field="rotation" />
            <TransformRow object={object} field="scale" />
          </CollapsibleSection>

          {!object.effect && (
            <CollapsibleSection title="Modelagem">
              <ModelingTools object={object} material={material} />
            </CollapsibleSection>
          )}

          {!object.effect && (
            <CollapsibleSection title="Material">
              <MaterialEditor material={material} />
            </CollapsibleSection>
          )}

          {object.effect && <EffectPanel object={object} />}

          {!object.effect && <BehaviorPanel object={object} />}
          </div>
        </div>
      )}
    </aside>
  );
}
