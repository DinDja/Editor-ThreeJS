'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Image as ImageIcon,
  Info,
  Loader2,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  IMAGE_SLOT_ORDER,
  type GenerationStatus,
  type SlotImage,
} from '@/lib/imageTo3D/types';
import { useImageTo3DStore } from '@/store/imageTo3DStore';
import { useImageTo3DGeneration } from '@/lib/imageTo3D/useImageTo3DGeneration';
import { validateRequestImages } from '@/lib/imageTo3D/imageValidationUtils';
import ImageUploadSlot from './ImageUploadSlot';
import ImageTo3DSettings from './ImageTo3DSettings';
import ImageTo3DProgress from './ImageTo3DProgress';
import ImageTo3DResultPreview from './ImageTo3DResultPreview';

type Step = 'images' | 'settings';

const generatingStatuses: GenerationStatus[] = [
  'uploading',
  'validating',
  'generating',
  'processingTextures',
  'optimizing',
  'importing',
];

const instructions = [
  'Use uma imagem nítida e bem iluminada.',
  'Fundo simples ajuda na geracao.',
  'Pessoa ou objeto centralizado no quadro.',
  'Evite cortes no rosto ou corpo.',
  'Fotos frontal e lateral melhoram o resultado.',
];

function ImageTo3DModalContent() {
  const setOpen = useImageTo3DStore((s) => s.setOpen);
  const images = useImageTo3DStore((s) => s.images);
  const settings = useImageTo3DStore((s) => s.settings);
  const status = useImageTo3DStore((s) => s.status);
  const result = useImageTo3DStore((s) => s.result);
  const error = useImageTo3DStore((s) => s.error);
  const clearImages = useImageTo3DStore((s) => s.clearImages);
  const resetToIdle = useImageTo3DStore((s) => s.resetToIdle);
  const clearResult = useImageTo3DStore((s) => s.clearResult);
  const importedRootId = useImageTo3DStore((s) => s.importedRootId);

  const { generate, cancel, regenerate, importResult, replaceCurrentModel } = useImageTo3DGeneration();
  const [step, setStep] = useState<Step>('images');
  const [importing, setImporting] = useState(false);

  const frontImage = images.front;
  const imageCount = IMAGE_SLOT_ORDER.filter((slot) => images[slot]).length;
  const validation = useMemo(
    () =>
      validateRequestImages(
        IMAGE_SLOT_ORDER.map((slot) => images[slot]).filter((image): image is SlotImage => Boolean(image)),
      ),
    [images],
  );
  const isGenerating = generatingStatuses.includes(status);
  const isCompleted = status === 'completed' && result;
  const isFailed = status === 'failed' || status === 'cancelled';

  const handleGenerate = async () => {
    await generate();
  };

  const handleImport = async () => {
    setImporting(true);
    await importResult();
    setImporting(false);
  };

  const handleReplace = async () => {
    setImporting(true);
    await replaceCurrentModel();
    setImporting(false);
  };

  const handleRegenerate = async () => {
    setImporting(true);
    await regenerate();
    setImporting(false);
  };

  const handleClose = () => {
    if (isGenerating) return;
    setOpen(false);
  };

  const handleBackToImages = () => {
    clearResult();
    resetToIdle();
    setStep('images');
  };

  const stepperIndex = isGenerating ? 3 : isCompleted ? 4 : step === 'settings' ? 2 : 1;
  const stepper = [
    { label: 'Imagens', icon: ImageIcon },
    { label: 'Configurar', icon: Settings2 },
    { label: 'Gerar', icon: Wand2 },
    { label: 'Resultado', icon: Sparkles },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-[3px]"
      onClick={handleClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-800/70 bg-[#151719] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-400/10 text-emerald-300">
              <Camera size={16} />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-neutral-100">Image to 3D</h2>
              <p className="text-[10px] text-neutral-500">Gere um avatar/modelo 3D aproximado a partir de imagens</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isGenerating}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-300 disabled:cursor-not-allowed disabled:opacity-30"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 border-b border-neutral-800/70 px-5 py-2.5">
          {stepper.map((item, index) => {
            const Icon = item.icon;
            const active = stepperIndex === index + 1;
            const done = stepperIndex > index + 1;
            return (
              <div key={item.label} className="flex flex-1 items-center gap-1">
                <div
                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition ${
                    active
                      ? 'bg-emerald-400/10 text-emerald-300'
                      : done
                        ? 'text-emerald-300/60'
                        : 'text-neutral-600'
                  }`}
                >
                  <Icon size={12} />
                  {item.label}
                </div>
                {index < stepper.length - 1 && (
                  <div className={`h-px flex-1 ${done ? 'bg-emerald-400/30' : 'bg-neutral-800'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* Generating state */}
          {isGenerating && (
            <ImageTo3DProgress />
          )}

          {/* Completed state */}
          {isCompleted && result && !isGenerating && (
            <ImageTo3DResultPreview
              result={result}
              onImport={handleImport}
              onRegenerate={handleRegenerate}
              onReplace={handleReplace}
              busy={importing}
            />
          )}

          {/* Failed/cancelled state */}
          {isFailed && !isGenerating && !isCompleted && (
            <div className="space-y-4">
              <ImageTo3DProgress />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-neutral-950 transition hover:bg-emerald-400"
                >
                  <Sparkles size={13} />
                  Tentar novamente
                </button>
                <button
                  type="button"
                  onClick={handleBackToImages}
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-neutral-700 bg-transparent px-4 text-xs font-medium text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800/40"
                >
                  <ArrowLeft size={13} />
                  Voltar
                </button>
              </div>
            </div>
          )}

          {/* Idle / step content */}
          {!isGenerating && !isCompleted && !isFailed && step === 'images' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  <Info size={11} className="text-emerald-300" />
                  Dicas para melhor resultado
                </div>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {instructions.map((tip) => (
                    <li key={tip} className="flex items-start gap-1.5 text-[11px] text-neutral-400">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400/70" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {IMAGE_SLOT_ORDER.map((slot) => (
                  <ImageUploadSlot
                    key={slot}
                    slot={slot}
                    image={images[slot]}
                    required={slot === 'front'}
                    compact={slot !== 'front'}
                  />
                ))}
              </div>

              {settings.modelType === 'human' && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2.5 text-[11px] text-amber-300/90">
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                  <span>
                    O resultado sera uma aproximacao 3D baseada na imagem, nao uma copia perfeita.
                  </span>
                </div>
              )}

              {!validation.ok && error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2.5 text-xs text-red-300">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-start gap-2 rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2.5 text-[10px] leading-relaxed text-neutral-500">
                <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-400/70" />
                <span>
                  Privacidade: as imagens sao usadas apenas para a geracao. Nao sao persistidas em logs
                  e podem ser removidas apos o uso com o botao Limpar.
                </span>
              </div>
            </div>
          )}

          {!isGenerating && !isCompleted && !isFailed && step === 'settings' && (
            <ImageTo3DSettings />
          )}
        </div>

        {/* Footer */}
        {!isGenerating && !isCompleted && !isFailed && (
          <div className="flex items-center justify-between gap-2 border-t border-neutral-800 px-5 py-3">
            <div className="flex items-center gap-2">
              {imageCount > 0 && step === 'images' && (
                <button
                  type="button"
                  onClick={clearImages}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-700 px-3 text-[11px] font-medium text-neutral-400 transition hover:border-red-500/50 hover:text-red-300"
                >
                  <Trash2 size={12} />
                  Limpar
                </button>
              )}
              {step === 'settings' && (
                <button
                  type="button"
                  onClick={() => setStep('images')}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-700 bg-transparent px-3 text-xs font-medium text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800/40"
                >
                  <ArrowLeft size={13} />
                  Voltar
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step === 'images' ? (
                <button
                  type="button"
                  onClick={() => setStep('settings')}
                  disabled={!frontImage}
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-emerald-500 px-4 text-xs font-semibold text-neutral-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Proximo
                  <ArrowRight size={13} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!validation.ok}
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 px-4 text-xs font-semibold text-neutral-950 transition hover:from-emerald-400 hover:to-teal-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Wand2 size={13} />
                  Generate 3D Model
                </button>
              )}
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="flex items-center justify-end gap-2 border-t border-neutral-800 px-5 py-3">
            <button
              type="button"
              onClick={cancel}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-red-700/50 bg-red-950/30 px-4 text-xs font-semibold text-red-300 transition hover:bg-red-900/40"
            >
              <Square size={12} />
              Cancelar
            </button>
          </div>
        )}

        {isCompleted && (
          <div className="flex items-center justify-between gap-2 border-t border-neutral-800 px-5 py-3">
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
              {importedRootId ? (
                <span className="flex items-center gap-1 text-emerald-300">
                  <Sparkles size={12} /> Modelo importado na cena
                </span>
              ) : (
                <span>Pronto para importar</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-neutral-700 bg-transparent px-4 text-xs font-medium text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800/40"
            >
              Fechar
            </button>
          </div>
        )}

        {isFailed && !isGenerating && !isCompleted && (
          <div className="flex items-center justify-end gap-2 border-t border-neutral-800 px-5 py-3">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-neutral-700 bg-transparent px-4 text-xs font-medium text-neutral-300 transition hover:border-neutral-600 hover:bg-neutral-800/40"
            >
              Fechar
            </button>
          </div>
        )}

        {importing && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <div className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-xs text-neutral-200 shadow-xl">
              <Loader2 size={14} className="animate-spin text-emerald-300" />
              Importando modelo...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImageTo3DModal() {
  const open = useImageTo3DStore((s) => s.open);
  if (!open) return null;
  return <ImageTo3DModalContent />;
}
