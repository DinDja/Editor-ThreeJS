'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Boxes,
  Check,
  Component,
  FileCode,
  LayoutTemplate,
  Search,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import {
  BLOCK_CATEGORIES,
  BLOCK_LIBRARY,
  type BlockCategory,
  type BlockDefinition,
  resolveBlockPreset,
} from '@/lib/template-engine/blockLibrary';
import { useExperienceStore } from '@/store/experienceStore';

const CATEGORY_ICONS: Record<BlockCategory, React.ReactNode> = {
  hero: <LayoutTemplate size={13} />,
  sections: <Square size={13} />,
  content: <FileCode size={13} />,
  forms: <Component size={13} />,
  atomic: <Box size={13} />,
};

function BlockPreview({ block, palette }: { block: BlockDefinition; palette: { primary: string; accent: string; background: string; surface: string; text: string; textMuted: string } }) {
  // Lightweight visual preview derived from the block type + palette.
  const isHero = block.category === 'hero';
  const isSection = block.category === 'sections' || block.category === 'content' || block.category === 'forms';
  const isAtomic = block.category === 'atomic';

  if (isAtomic) {
    const isButton = block.id.startsWith('button');
    const isCard = block.id.startsWith('card');
    const isInput = block.id.startsWith('input');
    const isNavbar = block.id.startsWith('navbar');
    return (
      <div
        className="relative flex h-full w-full items-center justify-center p-3"
        style={{ background: palette.surface }}
      >
        {isButton && (
          <span
            className="rounded-md px-3 py-1.5 text-[10px] font-semibold"
            style={{ background: palette.primary, color: palette.background, boxShadow: `0 6px 18px ${palette.primary}40` }}
          >
            Botão
          </span>
        )}
        {isCard && (
          <div
            className="w-3/4 rounded-lg p-2.5"
            style={{ background: palette.background, border: `1px solid ${palette.primary}40` }}
          >
            <div className="mb-1 h-1.5 w-2/3 rounded bg-[color:var(--ed-text)]" style={{ background: palette.text }} />
            <div className="h-1 w-full rounded" style={{ background: palette.textMuted, opacity: 0.5 }} />
          </div>
        )}
        {isInput && (
          <div
            className="h-7 w-3/4 rounded-md px-2 py-1.5 text-[9px]"
            style={{ background: palette.background, border: `1px solid ${palette.textMuted}40`, color: palette.textMuted }}
          >
            placeholder…
          </div>
        )}
        {isNavbar && (
          <div className="flex w-full items-center justify-between px-1">
            <span className="text-[10px] font-bold" style={{ color: palette.text }}>Brand</span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1 w-5 rounded" style={{ background: palette.textMuted, opacity: 0.6 }} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full w-full flex-col gap-1.5 p-2.5"
      style={{ background: palette.background }}
    >
      {/* hero / section heading bar */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-16 rounded" style={{ background: palette.text }} />
          <div className="h-1 w-24 rounded" style={{ background: palette.textMuted, opacity: 0.6 }} />
        </div>
        {isHero && (
          <div
            className="grid h-7 w-7 place-items-center rounded-md"
            style={{ background: `radial-gradient(circle, ${palette.primary}40, transparent 70%)` }}
          >
            <Boxes size={13} style={{ color: palette.primary }} />
          </div>
        )}
      </div>
      {/* body grid */}
      <div className="mt-auto flex gap-1">
        {(isSection ? [0, 1, 2] : [0, 1]).map((i) => (
          <div
            key={i}
            className="flex-1 rounded p-1"
            style={{ background: palette.surface, border: `1px solid ${palette.textMuted}22` }}
          >
            <div className="mb-0.5 h-1 w-2/3 rounded" style={{ background: palette.primary, opacity: 0.7 }} />
            <div className="h-0.5 w-full rounded" style={{ background: palette.textMuted, opacity: 0.4 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockCard({
  block,
  onInsert,
  palette,
}: {
  block: BlockDefinition;
  onInsert: (id: string) => void;
  palette: { primary: string; accent: string; background: string; surface: string; text: string; textMuted: string };
}) {
  return (
    <button
      type="button"
      onClick={() => onInsert(block.id)}
      className="group flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-2.5 text-left transition hover:border-emerald-400/50 hover:bg-neutral-900"
    >
      <div className="relative h-24 w-full overflow-hidden rounded-lg border border-neutral-800">
        <BlockPreview block={block} palette={palette} />
        <div className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full border border-neutral-700/60 bg-black/50 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider text-neutral-300 backdrop-blur">
          {CATEGORY_ICONS[block.category]}
          {block.category}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-emerald-400/0 opacity-0 transition group-hover:bg-emerald-400/5 group-hover:opacity-100">
          <span className="flex items-center gap-1 rounded-md bg-emerald-400/90 px-2 py-1 text-[10px] font-semibold text-neutral-950">
            <Check size={11} /> Inserir
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[11px] font-semibold text-neutral-100">{block.name}</h3>
        <p className="text-[10px] leading-3 text-neutral-500">{block.description}</p>
      </div>
    </button>
  );
}

export default function BlockLibrary({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<BlockCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const insertBlock = useExperienceStore((state) => state.insertBlock);
  const page = useExperienceStore((state) => state.page);

  const preset = useMemo(() => resolveBlockPreset(page.effects?.presetId), [page.effects?.presetId]);
  const palette = preset.palette;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BLOCK_LIBRARY.filter((block) => {
      const matchesCat = category === 'all' || block.category === category;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        block.name.toLowerCase().includes(q) ||
        block.description.toLowerCase().includes(q) ||
        block.keywords.some((k) => k.includes(q))
      );
    });
  }, [category, query]);

  const handleInsert = (id: string) => {
    insertBlock(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-[#151719] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-300" />
            <h2 className="text-sm font-semibold text-neutral-100">Biblioteca de Blocos</h2>
            <span className="text-[11px] text-neutral-500">{BLOCK_LIBRARY.length} blocos · preset {preset.name}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 px-5 py-3">
          <div className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-950/60 px-2 py-1.5">
            <Search size={13} className="text-neutral-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar blocos…"
              className="w-44 bg-transparent text-[11px] text-neutral-200 outline-none placeholder:text-neutral-600"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-[10px] text-neutral-600 transition hover:text-neutral-300"
              >
                limpar
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {BLOCK_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition ${
                  category === cat.id
                    ? 'bg-emerald-400/12 text-emerald-200'
                    : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ed-scroll grid auto-rows-min grid-cols-2 gap-3 overflow-auto p-5 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((block) => (
            <BlockCard key={block.id} block={block} onInsert={handleInsert} palette={palette} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full grid place-items-center gap-2 py-16">
              <div className="grid h-12 w-12 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-600">
                <Search size={18} />
              </div>
              <p className="text-sm text-neutral-500">Nenhum bloco encontrado para &ldquo;{query}&rdquo;.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
