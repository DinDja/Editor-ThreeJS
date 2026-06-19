'use client';

import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, ImageUp, Upload, X } from 'lucide-react';
import {
  ACCEPTED_IMAGE_EXTENSIONS,
  type ImageSlot,
  type SlotImage,
} from '@/lib/imageTo3D/types';
import { IMAGE_SLOT_LABELS } from '@/lib/imageTo3D/types';
import { formatBytes } from '@/lib/imageTo3D/imageValidationUtils';
import { useImageTo3DStore } from '@/store/imageTo3DStore';

type ImageUploadSlotProps = {
  slot: ImageSlot;
  image: SlotImage | undefined;
  required?: boolean;
  compact?: boolean;
};

export default function ImageUploadSlot({ slot, image, required, compact }: ImageUploadSlotProps) {
  const setSlotImage = useImageTo3DStore((s) => s.setSlotImage);
  const removeSlotImage = useImageTo3DStore((s) => s.removeSlotImage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) setSlotImage(slot, file);
    },
    [setSlotImage, slot],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragOver(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const warnings = image?.warnings ?? [];

  if (image) {
    return (
      <div className="group relative overflow-hidden rounded-lg border border-neutral-700/70 bg-neutral-950/60">
        <div className="relative aspect-square w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={IMAGE_SLOT_LABELS[slot]} className="h-full w-full object-cover" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-2 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-200">
              {IMAGE_SLOT_LABELS[slot]}
              {required && <span className="ml-1 text-emerald-400">*</span>}
            </span>
            <button
              type="button"
              onClick={() => removeSlotImage(slot)}
              className="grid h-6 w-6 cursor-pointer place-items-center rounded bg-black/50 text-neutral-300 transition hover:bg-red-500/80 hover:text-white"
              title="Remover imagem"
              aria-label="Remover imagem"
            >
              <X size={12} />
            </button>
          </div>
        </div>
        <div className="px-2 py-1.5">
          <p className="truncate text-[10px] text-neutral-400" title={image.name}>{image.name}</p>
          <p className="text-[9px] text-neutral-500">
            {image.width > 0 ? `${image.width}x${image.height} · ` : ''}
            {formatBytes(image.sizeBytes)}
          </p>
          {warnings.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {warnings.map((w) => (
                <p
                  key={w.code}
                  className={`flex items-start gap-1 text-[9px] leading-tight ${
                    w.code === 'invalidFormat' ? 'text-red-400' : 'text-amber-400/80'
                  }`}
                >
                  <AlertTriangle size={9} className="mt-px shrink-0" />
                  {w.message}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-2 text-center transition ${
        dragOver
          ? 'border-emerald-400/70 bg-emerald-400/5 text-emerald-200'
          : 'border-neutral-700/70 bg-neutral-950/40 text-neutral-500 hover:border-neutral-600 hover:bg-neutral-900/60 hover:text-neutral-300'
      }`}
    >
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
        {IMAGE_SLOT_LABELS[slot]}
        {required && <span className="text-emerald-400">*</span>}
      </span>
      {compact ? (
        <ImageUp size={18} className="opacity-70" />
      ) : (
        <>
          <Upload size={20} className="opacity-60" />
          <span className="text-[9px] leading-tight text-neutral-500">
            Arraste ou clique
          </span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_EXTENSIONS}
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.currentTarget.value = '';
        }}
      />
    </button>
  );
}
