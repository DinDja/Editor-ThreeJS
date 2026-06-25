'use client';

import { Boxes, Download, Grid3X3, Monitor, MousePointer2 } from 'lucide-react';
import type { EditorMode } from '@/lib/page-builder/types';
import { useExperienceStore } from '@/store/experienceStore';

const modes: Array<{ id: EditorMode; label: string; icon: React.ReactNode }> = [
  { id: 'scene', label: 'Cena', icon: <Boxes size={14} /> },
  { id: 'page', label: 'Página', icon: <Grid3X3 size={14} /> },
  { id: 'interactions', label: 'Interações', icon: <MousePointer2 size={14} /> },
  { id: 'preview', label: 'Pré-visualização', icon: <Monitor size={14} /> },
  { id: 'export', label: 'Exportar', icon: <Download size={14} /> },
];

export default function EditorModeBar() {
  const activeMode = useExperienceStore((state) => state.activeMode);
  const setActiveMode = useExperienceStore((state) => state.setActiveMode);

  return (
    <nav className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-neutral-800 bg-[#131517] px-2">
      {modes.map((mode) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => setActiveMode(mode.id)}
          className={`flex h-7 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition ${
            activeMode === mode.id
              ? 'bg-emerald-400/10 text-emerald-200 shadow-[inset_0_-1px_0_0_rgb(52,211,153)]'
              : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
          }`}
        >
          {mode.icon}
          <span>{mode.label}</span>
        </button>
      ))}
    </nav>
  );
}
