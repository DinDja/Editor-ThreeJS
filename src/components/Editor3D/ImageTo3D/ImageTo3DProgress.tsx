'use client';

import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { STATUS_LABELS, type GenerationStatus } from '@/lib/imageTo3D/types';
import { useImageTo3DStore } from '@/store/imageTo3DStore';

const stageOrder: GenerationStatus[] = [
  'uploading',
  'validating',
  'generating',
  'processingTextures',
  'optimizing',
  'importing',
];

export default function ImageTo3DProgress() {
  const status = useImageTo3DStore((s) => s.status);
  const progress = useImageTo3DStore((s) => s.progress);
  const error = useImageTo3DStore((s) => s.error);

  const failed = status === 'failed';
  const cancelled = status === 'cancelled';
  const completed = status === 'completed';
  const active = !failed && !cancelled && !completed && status !== 'idle';

  const currentStageIndex = stageOrder.indexOf(status);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
            failed
              ? 'bg-red-500/15 text-red-400'
              : cancelled
                ? 'bg-neutral-700/40 text-neutral-400'
                : completed
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-emerald-500/15 text-emerald-300'
          }`}
        >
          {failed ? <XCircle size={20} /> : cancelled ? <XCircle size={20} /> : completed ? <CheckCircle2 size={20} /> : <Loader2 size={20} className="animate-spin" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-100">{STATUS_LABELS[status]}</p>
          <p className="truncate text-[11px] text-neutral-400">{progress.message || 'Aguardando...'}</p>
        </div>
        {active && (
          <span className="text-sm font-semibold tabular-nums text-emerald-300">
            {Math.round(progress.percent)}%
          </span>
        )}
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            failed ? 'bg-red-500' : cancelled ? 'bg-neutral-600' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
          }`}
          style={{ width: `${failed || cancelled ? 100 : Math.max(2, Math.min(100, progress.percent))}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {stageOrder.map((stage) => {
          const index = stageOrder.indexOf(stage);
          const done = completed || (currentStageIndex > index && currentStageIndex !== -1);
          const current = currentStageIndex === index;
          return (
            <div
              key={stage}
              className={`rounded-md border px-2 py-1.5 text-center text-[9px] font-medium uppercase tracking-[0.1em] transition ${
                current
                  ? 'border-emerald-400/50 bg-emerald-400/8 text-emerald-200'
                  : done
                    ? 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300/70'
                    : 'border-neutral-800 bg-neutral-950/40 text-neutral-600'
              }`}
            >
              {STATUS_LABELS[stage]}
            </div>
          );
        })}
      </div>

      {failed && error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2.5 text-xs text-red-300">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {cancelled && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2.5 text-xs text-neutral-400">
          Geracao cancelada pelo usuario.
        </div>
      )}
    </div>
  );
}
