'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { comparePageDocuments, type PageDiffNode } from '@/lib/page-builder/tree';
import type { PageDocument } from '@/lib/page-builder/types';

const statusColors: Record<PageDiffNode['status'], string> = {
  unchanged: 'text-neutral-500',
  added: 'text-emerald-400',
  removed: 'text-red-400',
  modified: 'text-amber-300',
};

const statusBadge: Record<PageDiffNode['status'], string> = {
  unchanged: '',
  added: 'bg-emerald-400/10 text-emerald-300',
  removed: 'bg-red-400/10 text-red-300',
  modified: 'bg-amber-400/10 text-amber-300',
};

const statusLabel: Record<PageDiffNode['status'], string> = {
  unchanged: '',
  added: '+ adicionado',
  removed: '- removido',
  modified: '~ modificado',
};

function DiffRow({ diff, depth = 0 }: { diff: PageDiffNode; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = diff.children.length > 0;
  const hasChanges = diff.changes.length > 0;
  const hasExpand = hasChildren || hasChanges;
  const isModified = diff.status === 'modified';
  const paddingLeft = 8 + depth * 14;

  return (
    <div>
      <div
        className={`group flex items-center gap-1.5 rounded-md py-1 pr-2 text-[11px] transition hover:bg-neutral-800/50`}
        style={{ paddingLeft }}
      >
        {hasExpand ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="grid h-5 w-5 shrink-0 place-items-center rounded text-neutral-600 transition hover:bg-neutral-800"
          >
            {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <span className={`min-w-0 flex-1 truncate ${statusColors[diff.status]}`}>{diff.name}</span>
        {diff.status !== 'unchanged' && (
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.06em] ${statusBadge[diff.status]}`}>
            {statusLabel[diff.status]}
          </span>
        )}
        <span className="text-[9px] text-neutral-600">{diff.type}</span>
      </div>
      {expanded && hasChildren && (
        <div>
          {diff.children.map((child) => (
            <DiffRow key={child.id} diff={child} depth={depth + 1} />
          ))}
        </div>
      )}
      {expanded && isModified && hasChanges && (
        <div className="ml-8 space-y-0.5 pb-1">
          {diff.changes.map((change, i) => (
            <div key={i} className="rounded bg-amber-400/5 px-2 py-0.5 text-[10px] text-amber-300/80">
              {change}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PageDocumentDiff({
  oldDoc,
  newDoc,
  onClose,
}: {
  oldDoc: PageDocument;
  newDoc: PageDocument;
  onClose: () => void;
}) {
  const diffTree = useMemo(() => comparePageDocuments(oldDoc, newDoc), [oldDoc, newDoc]);

  const counts = useMemo(() => {
    let added = 0; let removed = 0; let modified = 0; let unchanged = 0;
    const walk = (nodes: PageDiffNode[]) => {
      for (const n of nodes) {
        if (n.status === 'added') added++;
        else if (n.status === 'removed') removed++;
        else if (n.status === 'modified') modified++;
        else unchanged++;
        walk(n.children);
      }
    };
    walk(diffTree);
    return { added, removed, modified, unchanged };
  }, [diffTree]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-[800px] flex-col rounded-xl border border-neutral-800 bg-[#151719] shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-neutral-200">Comparacao de Versoes</h2>
            <div className="flex gap-2 text-[10px]">
              {counts.added > 0 && <span className="text-emerald-300">+{counts.added}</span>}
              {counts.removed > 0 && <span className="text-red-300">-{counts.removed}</span>}
              {counts.modified > 0 && <span className="text-amber-300">~{counts.modified}</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200"
          >
            <X size={14} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3">
          {diffTree.map((diff) => (
            <DiffRow key={diff.id} diff={diff} />
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-neutral-800 px-5 py-2 text-[10px] text-neutral-600">
          <span className="text-emerald-300">+ adicionado</span>
          <span className="text-red-300">- removido</span>
          <span className="text-amber-300">~ modificado</span>
        </div>
      </div>
    </div>
  );
}
