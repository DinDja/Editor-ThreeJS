'use client';

import { Diamond, Pause, Play, SkipBack } from 'lucide-react';
import { EMPTY_TIMELINE, frameToSeconds } from '@/lib/animation';

export default function Timeline() {
  const marks = Array.from({ length: 7 }, (_, index) => index * 30);
  const minorMarks = Array.from({ length: 24 }, (_, index) => index);

  return (
    <footer className="grid h-24 grid-cols-[180px_minmax(0,1fr)] border-t border-neutral-800 bg-[#17191b] max-md:h-20 max-md:grid-cols-[148px_minmax(0,1fr)]">
      <div className="flex items-center gap-2 border-r border-neutral-800 px-4 max-md:gap-1.5 max-md:px-2">
        <button
          title="Voltar"
          aria-label="Voltar"
          className="grid h-11 w-11 cursor-pointer place-items-center rounded-md border border-neutral-700/80 bg-[#0d0f10] p-2.5 text-neutral-500 disabled:cursor-not-allowed max-md:h-10 max-md:w-10"
          disabled
        >
          <SkipBack size={14} />
        </button>
        <button
          title="Play"
          aria-label="Play"
          className="grid h-11 w-11 cursor-pointer place-items-center rounded-md border border-neutral-700/80 bg-[#0d0f10] p-2.5 text-neutral-500 disabled:cursor-not-allowed max-md:h-10 max-md:w-10"
          disabled
        >
          <Play size={14} />
        </button>
        <button
          title="Keyframe"
          aria-label="Keyframe"
          className="grid h-11 w-11 cursor-pointer place-items-center rounded-md border border-neutral-700/80 bg-[#0d0f10] p-2.5 text-neutral-500 disabled:cursor-not-allowed max-md:h-10 max-md:w-10"
          disabled
        >
          <Diamond size={13} />
        </button>
      </div>
      <div className="relative min-w-0 overflow-hidden px-4 py-3 max-md:px-2 max-md:py-2">
        <div className="mb-2 flex justify-between text-[10px] uppercase tracking-[0.14em] text-neutral-500">
          {marks.map((frame) => (
            <span key={frame}>{frameToSeconds(frame, EMPTY_TIMELINE.fps).toFixed(0)}s</span>
          ))}
        </div>
        <div className="relative h-10 overflow-hidden rounded-md border border-neutral-800 bg-[#0d0f10] max-md:h-8">
          <div className="absolute inset-0 grid grid-cols-[repeat(24,minmax(0,1fr))]">
            {minorMarks.map((mark) => (
              <div key={mark} className="border-l border-neutral-900" />
            ))}
          </div>
          <div className="absolute inset-y-0 left-4 z-10 w-px bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.35)]" />
          <div className="relative grid h-full grid-cols-6">
            {marks.slice(1).map((frame) => (
              <div key={frame} className="border-l border-neutral-800/80" />
            ))}
          </div>
          <div className="absolute left-2 top-1/2 z-10 -translate-y-1/2 text-amber-200">
            <Pause size={10} />
          </div>
        </div>
      </div>
    </footer>
  );
}
