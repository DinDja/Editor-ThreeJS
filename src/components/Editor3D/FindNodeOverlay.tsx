'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useExperienceStore } from '@/store/experienceStore';
import { flattenPageNodes } from '@/lib/page-builder/tree';

type FindNodeOverlayProps = {
  open: boolean;
  onClose: () => void;
};

const TYPE_LABELS: Record<string, string> = {
  section: 'Section',
  container: 'Container',
  text: 'Texto',
  button: 'Botão',
  image: 'Imagem',
  video: 'Vídeo',
  card: 'Card',
  navbar: 'Navbar',
  footer: 'Footer',
  sceneCanvas: 'Cena 3D',
  form: 'Formulário',
  input: 'Input',
  select: 'Select',
  textarea: 'Textarea',
  label: 'Label',
  modal: 'Modal',
  menu: 'Menu',
  menuitem: 'Menu Item',
  dataTable: 'Tabela de dados',
  dataForm: 'Form de dados',
  dataList: 'Lista de dados',
  dataChart: 'Gráfico',
  dataStat: 'Stat',
  pageRoute: 'Page Route',
};

export default function FindNodeOverlay({ open, onClose }: FindNodeOverlayProps) {
  const page = useExperienceStore((state) => state.page);
  const setSelectedPageNode = useExperienceStore((state) => state.setSelectedPageNode);
  const setActiveMode = useExperienceStore((state) => state.setActiveMode);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const flat = useMemo(() => flattenPageNodes(page), [page]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return flat;
    return flat.filter(({ node }) =>
      node.name.toLowerCase().includes(q) ||
      node.type.toLowerCase().includes(q) ||
      (TYPE_LABELS[node.type] ?? '').toLowerCase().includes(q),
    );
  }, [flat, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const select = (id: string) => {
    setActiveMode('page');
    setSelectedPageNode(id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-start justify-center bg-black/60 p-4 pt-24 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-neutral-800 bg-[#151719] px-3 py-2">
          <Search size={14} className="text-emerald-300" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
              } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex((idx) => Math.min(matches.length - 1, idx + 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex((idx) => Math.max(0, idx - 1));
              } else if (event.key === 'Enter') {
                event.preventDefault();
                const m = matches[activeIndex];
                if (m) select(m.node.id);
              }
            }}
            placeholder="Buscar nó por nome ou tipo…"
            className="flex-1 bg-transparent text-sm text-neutral-100 outline-none placeholder:text-neutral-600"
          />
          <button
            type="button"
            onClick={onClose}
            className="grid h-6 w-6 place-items-center rounded text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200"
            aria-label="Fechar"
          >
            <X size={12} />
          </button>
        </div>
        <ul className="ed-scroll max-h-80 overflow-auto">
          {matches.length === 0 ? (
            <li className="px-3 py-4 text-center text-[11px] text-neutral-500">
              {query ? 'Nenhum resultado' : 'Digite para buscar'}
            </li>
          ) : (
            matches.map(({ node, parentId }, index) => (
              <li
                key={node.id}
                onClick={() => select(node.id)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex cursor-pointer items-center gap-2 border-b border-neutral-900 px-3 py-2 text-[12px] last:border-b-0 ${
                  index === activeIndex ? 'bg-emerald-400/10 text-emerald-100' : 'text-neutral-300'
                }`}
              >
                <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-neutral-400">
                  {TYPE_LABELS[node.type] ?? node.type}
                </span>
                <span className="truncate">{node.name}</span>
                {parentId && (
                  <span className="ml-auto text-[9px] uppercase text-neutral-600">filho</span>
                )}
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-neutral-800 bg-[#151719] px-3 py-1.5 text-[10px] text-neutral-500">
          <kbd className="rounded bg-neutral-800 px-1 text-[9px] text-neutral-300">↑↓</kbd> navegar
          <span className="mx-2">·</span>
          <kbd className="rounded bg-neutral-800 px-1 text-[9px] text-neutral-300">Enter</kbd> selecionar
          <span className="mx-2">·</span>
          <kbd className="rounded bg-neutral-800 px-1 text-[9px] text-neutral-300">Esc</kbd> fechar
        </div>
      </div>
    </div>
  );
}
