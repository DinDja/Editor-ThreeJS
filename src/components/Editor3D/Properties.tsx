'use client';

import type { ReactNode } from 'react';
import { Box, Eye, EyeOff, Move3D, PanelRight, Rotate3D, Scale3D, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import * as THREE from 'three';
import MaterialEditor from './MaterialEditor';
import ModelingTools from './ModelingTools';
import { primitiveKinds, primitiveLabels } from '@/lib/geometryOps';
import { createPrimitiveEditableMesh } from '@/lib/meshOps';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import type { SceneObject, Vec3 } from '@/store/types';

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

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
      <Icon size={14} className="text-emerald-300" />
      {children}
    </h3>
  );
}

function TransformRow({ object, field }: { object: SceneObject; field: TransformField }) {
  const updateObject = useSceneStore((state) => state.updateObject);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const values = object[field];
  const Icon = fieldIcons[field];

  const setValue = (axis: number, rawValue: number) => {
    if (!Number.isFinite(rawValue)) return;

    const next = [...values] as Vec3;
    next[axis] = field === 'rotation' ? THREE.MathUtils.degToRad(rawValue) : rawValue;
    updateObject(object.uuid, { [field]: next });
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

export default function Properties() {
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const objects = useSceneStore((state) => state.objects);
  const updateObject = useSceneStore((state) => state.updateObject);
  const materials = useMaterialStore((state) => state.materials);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const object = objects.find((item) => item.uuid === selectedObjectId);
  const material = object ? materials[object.materialId] : null;
  const primitive = object?.kind === 'primitive' ? object.primitive ?? 'box' : null;

  if (!object || !material) {
    return (
      <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-[#151719] max-lg:border-l-0 max-lg:border-t">
        <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3 max-sm:px-3 max-sm:py-2">
          <PanelRight size={15} className="text-emerald-300" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Properties</h2>
        </div>
        <div className="grid flex-1 place-items-center px-6 text-center text-sm text-neutral-500">
          <div className="grid justify-items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md border border-neutral-800 bg-neutral-950 text-neutral-600">
              <Box size={18} />
            </div>
            Nenhum objeto selecionado
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-[#151719] max-lg:border-l-0 max-lg:border-t">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3 max-sm:px-3 max-sm:py-2">
        <div className="flex items-center gap-2">
          <PanelRight size={15} className="text-emerald-300" />
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">Properties</h2>
        </div>
        <span className="rounded-full border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[11px] text-neutral-500">
          {object.kind === 'model' ? 'Modelo' : 'Primitiva'}
        </span>
      </div>

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

          <section className="grid gap-4">
            <SectionTitle icon={SlidersHorizontal}>Transform</SectionTitle>
            <TransformRow object={object} field="position" />
            <TransformRow object={object} field="rotation" />
            <TransformRow object={object} field="scale" />
          </section>

          <section className="grid gap-4 border-t border-neutral-800 pt-5">
            <SectionTitle icon={Box}>Modelagem</SectionTitle>
            <ModelingTools object={object} material={material} />
          </section>

          <section className="grid gap-4 border-t border-neutral-800 pt-5">
            <SectionTitle icon={Box}>Material</SectionTitle>
            <MaterialEditor material={material} />
          </section>
        </div>
      </div>
    </aside>
  );
}
