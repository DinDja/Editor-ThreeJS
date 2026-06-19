'use client';

import {
  Calendar,
  Database,
  Layers,
  RefreshCw,
  RotateCcw,
  Settings2,
  Sparkles,
  Triangle,
} from 'lucide-react';
import type { SceneObject } from '@/store/types';
import {
  MODEL_TYPE_LABELS,
  QUALITY_LABELS,
  STYLE_LABELS,
  type ImageTo3DResultMetadata,
} from '@/lib/imageTo3D/types';
import { formatDate, formatPolycount } from '@/lib/imageTo3D/modelImportUtils';
import { useImageTo3DStore } from '@/store/imageTo3DStore';
import { useImageTo3DGeneration } from '@/lib/imageTo3D/useImageTo3DGeneration';
import CollapsibleSection from '../CollapsibleSection';

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-950/40 px-2.5 py-1.5">
      <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-500">
        {icon}
        {label}
      </span>
      <span className="truncate text-xs font-medium text-neutral-200" title={value}>{value}</span>
    </div>
  );
}

export default function ImageTo3DPanel({ object }: { object: SceneObject }) {
  const setOpen = useImageTo3DStore((s) => s.setOpen);
  const result = useImageTo3DStore((s) => s.result);
  const lastRequest = useImageTo3DStore((s) => s.lastRequest);
  const { regenerate, replaceCurrentModel } = useImageTo3DGeneration();

  const meta = object.metadata?.imageTo3D as ImageTo3DResultMetadata | undefined;
  if (!meta) return null;

  const generatedDisplayName =
    typeof object.metadata?.generatedDisplayName === 'string'
      ? object.metadata.generatedDisplayName
      : 'Modelo gerado';

  const stats = meta.stats;
  const canRegenerate = Boolean(lastRequest);
  const canReplace = Boolean(result);

  const handleRegenerate = () => {
    if (canRegenerate) {
      void regenerate();
    } else {
      setOpen(true);
    }
  };

  const handleReplace = () => {
    if (canReplace) {
      void replaceCurrentModel();
    } else {
      setOpen(true);
    }
  };

  return (
    <CollapsibleSection
      title="Image to 3D"
      icon={<Sparkles size={11} className="text-emerald-400" />}
      defaultOpen
    >
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-2">
          <Sparkles size={13} className="shrink-0 text-emerald-300" />
          <p className="text-[11px] text-emerald-100">
            {generatedDisplayName}
          </p>
        </div>

        <Row icon={<Database size={11} />} label="Origem" value="Image to 3D" />
        <Row icon={<Layers size={11} />} label="Tipo" value={MODEL_TYPE_LABELS[meta.modelType]} />
        <Row icon={<Sparkles size={11} />} label="Estilo" value={STYLE_LABELS[meta.style]} />
        <Row icon={<Settings2 size={11} />} label="Qualidade" value={QUALITY_LABELS[meta.quality]} />
        <Row icon={<Calendar size={11} />} label="Gerado em" value={formatDate(meta.createdAt)} />
        {stats && (
          <>
            <Row
              icon={<Triangle size={11} />}
              label="Poligonos"
              value={formatPolycount(stats.polycount)}
            />
            <Row icon={<Layers size={11} />} label="Meshes" value={String(stats.meshCount)} />
            <Row
              icon={<Sparkles size={11} />}
              label="Texturas"
              value={String(stats.textureCount)}
            />
          </>
        )}
        {meta.providerName && (
          <Row icon={<Database size={11} />} label="Provedor" value={meta.providerName} />
        )}

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md border border-neutral-700/60 px-1.5 text-[9px] font-medium text-neutral-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
            title="Abrir configuracoes da geracao"
          >
            <Settings2 size={10} />
            Config
          </button>
          <button
            type="button"
            onClick={handleRegenerate}
            className="flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md border border-neutral-700/60 px-1.5 text-[9px] font-medium text-neutral-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
            title="Regenerar usando as mesmas imagens"
          >
            <RefreshCw size={10} />
            Regenerar
          </button>
          <button
            type="button"
            onClick={handleReplace}
            className="flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md border border-neutral-700/60 px-1.5 text-[9px] font-medium text-neutral-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
            title="Substituir modelo"
          >
            <RotateCcw size={10} />
            Trocar
          </button>
        </div>
      </div>
    </CollapsibleSection>
  );
}
