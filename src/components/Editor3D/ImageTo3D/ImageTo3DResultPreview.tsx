'use client';

import { Download, RefreshCw, RotateCcw, Sparkles } from 'lucide-react';
import {
  MODEL_TYPE_LABELS,
  QUALITY_LABELS,
  STYLE_LABELS,
  type ImageTo3DResult,
} from '@/lib/imageTo3D/types';
import { formatDate, formatPolycount } from '@/lib/imageTo3D/modelImportUtils';
import { useImageTo3DStore } from '@/store/imageTo3DStore';
import ImageTo3DPreview from './ImageTo3DPreview';

type ImageTo3DResultPreviewProps = {
  result: ImageTo3DResult;
  onImport: () => void;
  onRegenerate: () => void;
  onReplace: () => void;
  busy: boolean;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950/50 px-2.5 py-1.5">
      <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-neutral-500">{label}</p>
      <p className="mt-0.5 text-xs font-medium text-neutral-200">{value}</p>
    </div>
  );
}

export default function ImageTo3DResultPreview({
  result,
  onImport,
  onRegenerate,
  onReplace,
  busy,
}: ImageTo3DResultPreviewProps) {
  const importedRootId = useImageTo3DStore((s) => s.importedRootId);
  const meta = result.metadata;
  const stats = meta.stats;

  return (
    <div className="space-y-3">
      <div className="h-56 w-full">
        <ImageTo3DPreview glb={result.glb} />
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2">
        <Sparkles size={14} className="shrink-0 text-emerald-300" />
        <p className="text-[11px] text-emerald-100">
          Modelo gerado: <span className="font-semibold">{result.displayName}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Tipo" value={MODEL_TYPE_LABELS[meta.modelType]} />
        <Stat label="Estilo" value={STYLE_LABELS[meta.style]} />
        <Stat label="Qualidade" value={QUALITY_LABELS[meta.quality]} />
        <Stat label="Poligonos" value={stats ? formatPolycount(stats.polycount) : '—'} />
        <Stat label="Meshes" value={stats ? String(stats.meshCount) : '—'} />
        <Stat label="Materiais" value={stats ? String(stats.materialCount) : '—'} />
        <Stat label="Texturas" value={stats ? String(stats.textureCount) : '—'} />
        <Stat label="Views" value={String(meta.imageSlots.length)} />
        <Stat label="Gerado em" value={formatDate(meta.createdAt)} />
      </div>

      {meta.providerNotes && (
        <p className="rounded-md border border-neutral-800 bg-neutral-950/40 px-2.5 py-1.5 text-[10px] leading-relaxed text-neutral-500">
          {meta.providerNotes}
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {importedRootId ? (
          <button
            type="button"
            onClick={onReplace}
            disabled={busy}
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw size={13} />
            Substituir na cena
          </button>
        ) : (
          <button
            type="button"
            onClick={onImport}
            disabled={busy}
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={13} />
            Importar para a cena
          </button>
        )}
        <button
          type="button"
          onClick={onRegenerate}
          disabled={busy}
          className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-700 bg-transparent px-4 text-xs font-medium text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={13} />
          Regenerar
        </button>
      </div>
    </div>
  );
}
