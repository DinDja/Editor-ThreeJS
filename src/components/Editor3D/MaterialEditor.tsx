'use client';

import { useRef } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { TEXTURE_FILE_ACCEPT } from '@/lib/fileOps';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import type { EditorMaterial } from '@/store/types';

type MaterialEditorProps = {
  material: EditorMaterial;
};

const sliderClass = 'h-1.5 w-full accent-emerald-400';
const labelClass = 'text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-500';
const valueClass = 'w-10 text-right text-xs tabular-nums text-neutral-400';

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);

  return (
    <label className="grid gap-2">
      <span className={labelClass}>{label}</span>
      <span className="grid h-11 grid-cols-[42px_minmax(0,1fr)] overflow-hidden rounded-md border border-neutral-700/80 bg-[#0d0f10] transition focus-within:border-emerald-400">
        <span className="m-1 rounded" style={{ backgroundColor: value }} />
        <input
          type="color"
          value={value}
          onFocus={pushSnapshot}
          onChange={(event) => onChange(event.target.value)}
          className="h-full w-full cursor-pointer border-0 bg-transparent p-0"
        />
      </span>
    </label>
  );
}

function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);

  return (
    <label className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className={labelClass}>{label}</span>
        <span className={valueClass}>{value.toFixed(step < 0.1 ? 2 : 1)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onFocus={pushSnapshot}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`${sliderClass} cursor-pointer`}
      />
    </label>
  );
}

export default function MaterialEditor({ material }: MaterialEditorProps) {
  const textureInputRef = useRef<HTMLInputElement>(null);
  const updateMaterial = useMaterialStore((state) => state.updateMaterial);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const hasTexture = Boolean(material.textureUrl);

  const update = (patch: Partial<Omit<EditorMaterial, 'uuid' | 'objectId'>>) => {
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
    <section className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Cor" value={material.color} onChange={(value) => update({ color: value })} />
        <ColorField label="Emissive" value={material.emissive} onChange={(value) => update({ emissive: value })} />
      </div>

      <SliderRow label="Metalness" min={0} max={1} step={0.01} value={material.metalness} onChange={(value) => update({ metalness: value })} />
      <SliderRow label="Roughness" min={0} max={1} step={0.01} value={material.roughness} onChange={(value) => update({ roughness: value })} />
      <SliderRow label="Emissive" min={0} max={3} step={0.05} value={material.emissiveIntensity} onChange={(value) => update({ emissiveIntensity: value })} />
      <SliderRow label="Opacidade" min={0.05} max={1} step={0.01} value={material.opacity} onChange={(value) => update({ opacity: value })} />

      <div className="grid gap-2">
        <span className={labelClass}>Textura</span>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <button
            type="button"
            onClick={() => textureInputRef.current?.click()}
            className="flex h-11 min-w-0 cursor-pointer items-center gap-2 rounded-md border border-neutral-700/80 bg-[#0d0f10] px-4 text-xs text-neutral-300 transition hover:border-emerald-400/70 hover:text-emerald-100"
          >
            <ImagePlus size={14} className="shrink-0 text-neutral-500" />
            <span className="block truncate">{material.textureName ?? 'Selecionar imagem'}</span>
          </button>
          <input
            ref={textureInputRef}
            type="file"
            accept={TEXTURE_FILE_ACCEPT}
            className="hidden"
            onChange={(event) => {
              handleTexture(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            title="Limpar textura"
            aria-label="Limpar textura"
            onClick={clearTexture}
            disabled={!hasTexture}
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-md border border-neutral-700/80 text-neutral-400 transition hover:border-red-400/70 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {hasTexture && (
          <div className="flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.12em] text-neutral-500">
            <span className="rounded border border-neutral-800 px-1.5 py-0.5">Diffuse</span>
            {material.normalMapUrl && <span className="rounded border border-neutral-800 px-1.5 py-0.5">Normal</span>}
            {material.roughnessMapUrl && <span className="rounded border border-neutral-800 px-1.5 py-0.5">Roughness</span>}
            {material.displacementMapUrl && <span className="rounded border border-neutral-800 px-1.5 py-0.5">Displace</span>}
          </div>
        )}
      </div>

      <div className="grid gap-3 rounded-md border border-neutral-800 bg-[#0d0f10]/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className={labelClass}>Mapeamento da textura</span>
          <button
            type="button"
            onClick={() => {
              pushSnapshot();
              update({
                textureRepeatX: 1,
                textureRepeatY: 1,
                textureOffsetX: 0,
                textureOffsetY: 0,
                textureRotation: 0,
              });
            }}
            disabled={!hasTexture}
            className="rounded border border-neutral-700/80 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-neutral-400 transition hover:border-emerald-400/70 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Reset UV
          </button>
        </div>

        <SliderRow label="Tile X" min={0.1} max={8} step={0.1} value={material.textureRepeatX} onChange={(value) => update({ textureRepeatX: value })} />
        <SliderRow label="Tile Y" min={0.1} max={8} step={0.1} value={material.textureRepeatY} onChange={(value) => update({ textureRepeatY: value })} />
        <SliderRow label="Offset X" min={-2} max={2} step={0.01} value={material.textureOffsetX} onChange={(value) => update({ textureOffsetX: value })} />
        <SliderRow label="Offset Y" min={-2} max={2} step={0.01} value={material.textureOffsetY} onChange={(value) => update({ textureOffsetY: value })} />
        <SliderRow
          label="Rotacao"
          min={-180}
          max={180}
          step={1}
          value={material.textureRotation * (180 / Math.PI)}
          onChange={(value) => update({ textureRotation: (value * Math.PI) / 180 })}
        />
      </div>
    </section>
  );
}
