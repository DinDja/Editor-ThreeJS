'use client';

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Check,
  CircleCheck,
  Eye,
  FlaskConical,
  Focus,
  Lightbulb,
  Maximize2,
  Minimize2,
  Minus,
  Network,
  Plus,
  Puzzle,
  RotateCcw,
  Search,
  Shrink,
  Expand,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { MindMapMark, TeacherMindMapNode, TeacherMindMapNodeKind } from '@/lib/learning/types';
import { LearningRichText } from './LearningRichText';

type LearningMindMapProps = {
  root: TeacherMindMapNode;
  marks: Record<string, MindMapMark>;
  notes: Record<string, string>;
  onMark: (nodeId: string, mark: MindMapMark | null) => void;
  onNote: (nodeId: string, note: string) => void;
};

type MindMapEntry = {
  node: TeacherMindMapNode;
  parentId: string | null;
  depth: number;
  branchIndex: number;
  branchLabel: string;
};

type BranchPalette = {
  stroke: string;
  border: string;
  tag: string;
  glow: string;
};

type PositionedNode = MindMapEntry & {
  x: number;
  y: number;
  width: number;
  height: number;
  expanded: boolean;
  paletteIndex: number;
  side: Side;
};

type LayoutEdge = {
  fromId: string;
  toId: string;
  paletteIndex: number;
  depth: number;
};

type MindMapLayout = {
  nodes: PositionedNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
};

type Side = 'left' | 'right';

const BRANCH_PALETTES: BranchPalette[] = [
  { stroke: '#e31d2e', border: 'rgba(227,29,46,0.28)', tag: '#a71928', glow: 'rgba(227,29,46,0.14)' },
  { stroke: '#0369a1', border: 'rgba(3,105,161,0.32)', tag: '#075985', glow: 'rgba(3,105,161,0.14)' },
  { stroke: '#c91c2b', border: 'rgba(201,28,43,0.25)', tag: '#991b2b', glow: 'rgba(201,28,43,0.12)' },
  { stroke: '#0369a1', border: 'rgba(3,105,161,0.26)', tag: '#075985', glow: 'rgba(3,105,161,0.12)' },
  { stroke: '#ef5964', border: 'rgba(239,89,100,0.28)', tag: '#a71928', glow: 'rgba(239,89,100,0.13)' },
  { stroke: '#075985', border: 'rgba(7,89,133,0.28)', tag: '#075985', glow: 'rgba(7,89,133,0.13)' },
];

const ROOT_PALETTE: BranchPalette = {
  stroke: '#e31d2e',
  border: 'rgba(227,29,46,0.38)',
  tag: '#a71928',
  glow: 'rgba(227,29,46,0.16)',
};

const KIND_META: Record<TeacherMindMapNodeKind, { label: string; icon: LucideIcon }> = {
  concept: { label: 'Conceito', icon: Lightbulb },
  definition: { label: 'Definição', icon: BookOpen },
  example: { label: 'Exemplo', icon: FlaskConical },
  application: { label: 'Aplicação', icon: Puzzle },
  contrast: { label: 'Cuidado', icon: AlertTriangle },
  memory: { label: 'Memória', icon: Brain },
};

const NODE_GAP_X = 68;
const NODE_GAP_Y = 12;
const CANVAS_PADDING = 64;
const MIN_CANVAS_WIDTH = 780;
const MIN_CANVAS_HEIGHT = 480;

const nodeDimensions = (depth: number) => {
  if (depth === 0) return { width: 244, height: 100 };
  if (depth === 1) return { width: 212, height: 78 };
  return { width: 200, height: 68 };
};

const collectIds = (node: TeacherMindMapNode): string[] => [
  node.id,
  ...node.children.flatMap(collectIds),
];

const buildMindMapIndex = (root: TeacherMindMapNode) => {
  const all: MindMapEntry[] = [];
  const byId = new Map<string, MindMapEntry>();
  const walk = (node: TeacherMindMapNode, parentId: string | null, depth: number, branchIndex: number, branchLabel: string) => {
    const entry: MindMapEntry = { node, parentId, depth, branchIndex, branchLabel };
    all.push(entry);
    byId.set(node.id, entry);
    node.children.forEach((child, index) => {
      if (depth === 0) walk(child, node.id, 1, index, child.label);
      else walk(child, node.id, depth + 1, branchIndex, branchLabel);
    });
  };
  walk(root, null, 0, -1, root.label);
  return { all, byId };
};

const createLayout = (root: TeacherMindMapNode, expandedIds: Set<string>, queryActive: boolean): MindMapLayout => {
  const isExpanded = (id: string) => queryActive || expandedIds.has(id);
  const measure = (node: TeacherMindMapNode, depth: number): number => {
    const ownHeight = nodeDimensions(depth).height;
    if (!isExpanded(node.id) || node.children.length === 0) return ownHeight;
    const childrenHeight = node.children.reduce((total, child) => total + measure(child, depth + 1), 0)
      + NODE_GAP_Y * (node.children.length - 1);
    return Math.max(ownHeight, childrenHeight);
  };

  const nodes: PositionedNode[] = [];
  const edges: LayoutEdge[] = [];
  const rootDimensions = nodeDimensions(0);
  const rootNode: PositionedNode = {
    node: root,
    parentId: null,
    depth: 0,
    branchIndex: -1,
    branchLabel: root.label,
    x: -rootDimensions.width / 2,
    y: -rootDimensions.height / 2,
    width: rootDimensions.width,
    height: rootDimensions.height,
    expanded: isExpanded(root.id),
    paletteIndex: 0,
    side: 'right',
  };
  nodes.push(rootNode);

  const branches = root.children.map((child, index) => ({
    child,
    index,
    height: measure(child, 1),
  }));
  const place = (
    node: TeacherMindMapNode,
    depth: number,
    branchIndex: number,
    parent: PositionedNode,
    top: number,
    subtreeHeight: number,
    side: Side,
  ) => {
    const dimensions = nodeDimensions(depth);
    const x = side === 'right'
      ? parent.x + parent.width + NODE_GAP_X
      : parent.x - NODE_GAP_X - dimensions.width;
    const y = top + (subtreeHeight - dimensions.height) / 2;
    const placed: PositionedNode = {
      node,
      parentId: parent.node.id,
      depth,
      branchIndex,
      branchLabel: depth === 1 ? node.label : parent.branchLabel,
      x,
      y,
      width: dimensions.width,
      height: dimensions.height,
      expanded: isExpanded(node.id),
      paletteIndex: branchIndex % BRANCH_PALETTES.length,
      side,
    };
    nodes.push(placed);
    edges.push({ fromId: parent.node.id, toId: node.id, paletteIndex: placed.paletteIndex, depth });
    if (node.children.length === 0 || !isExpanded(node.id)) return;

    const children = node.children.map((child) => ({ node: child, height: measure(child, depth + 1) }));
    const childrenHeight = children.reduce((total, child) => total + child.height, 0)
      + NODE_GAP_Y * (children.length - 1);
    let childTop = top + (subtreeHeight - childrenHeight) / 2;
    children.forEach(({ node: child, height }) => {
      place(child, depth + 1, branchIndex, placed, childTop, height, side);
      childTop += height + NODE_GAP_Y;
    });
  };

  const branchesHeight = branches.reduce((total, branch) => total + branch.height, 0)
    + NODE_GAP_Y * Math.max(0, branches.length - 1);
  let branchTop = -branchesHeight / 2;
  branches.forEach(({ child, index, height }) => {
    place(child, 1, index, rootNode, branchTop, height, 'right');
    branchTop += height + NODE_GAP_Y;
  });

  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height));
  const intrinsicWidth = maxX - minX + CANVAS_PADDING * 2;
  const intrinsicHeight = maxY - minY + CANVAS_PADDING * 2;
  const width = Math.max(MIN_CANVAS_WIDTH, intrinsicWidth);
  const height = Math.max(MIN_CANVAS_HEIGHT, intrinsicHeight);
  const offsetX = CANVAS_PADDING - minX + (width - intrinsicWidth) / 2;
  const offsetY = CANVAS_PADDING - minY + (height - intrinsicHeight) / 2;

  return {
    width,
    height,
    nodes: nodes.map((node) => ({ ...node, x: node.x + offsetX, y: node.y + offsetY })),
    edges,
  };
};

const matchesQuery = (node: TeacherMindMapNode, query: string, notes: Record<string, string>) =>
  `${node.label} ${node.summary} ${notes[node.id] ?? ''}`.toLocaleLowerCase('pt-BR').includes(query);

const filterMindMap = (
  node: TeacherMindMapNode,
  query: string,
  notes: Record<string, string>,
  depth = 0,
): TeacherMindMapNode | null => {
  const selfMatches = matchesQuery(node, query, notes);
  if (depth === 0 && selfMatches) return node;
  const children = node.children
    .map((child) => filterMindMap(child, query, notes, depth + 1))
    .filter((child): child is TeacherMindMapNode => Boolean(child));
  if (!selfMatches && children.length === 0) return null;
  return { ...node, children };
};

const connectorPath = (from: PositionedNode, to: PositionedNode) => {
  const side: Side = to.x >= from.x ? 'right' : 'left';
  const fromX = side === 'right' ? from.x + from.width : from.x;
  const fromY = from.y + from.height / 2;
  const toX = side === 'right' ? to.x : to.x + to.width;
  const toY = to.y + to.height / 2;
  const control = Math.max(28, Math.abs(toX - fromX) * 0.48);
  const firstControl = side === 'right' ? fromX + control : fromX - control;
  const secondControl = side === 'right' ? toX - control : toX + control;
  return `M ${fromX} ${fromY} C ${firstControl} ${fromY}, ${secondControl} ${toY}, ${toX} ${toY}`;
};

function MindMapViewport({
  children,
  viewportRef,
  className = '',
}: {
  children: ReactNode;
  viewportRef: RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  const dragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const setViewportRef = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
    if (!node) return;
    requestAnimationFrame(() => {
      if (!node.isConnected) return;
      node.scrollLeft = 0;
      if (node.scrollHeight > node.clientHeight) node.scrollTop = (node.scrollHeight - node.clientHeight) / 2;
    });
  }, [viewportRef]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('button, a, input, textarea, [data-no-drag]')) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    dragRef.current = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    setDragging(true);
    viewport.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport) return;
    viewport.scrollLeft = drag.left - (event.clientX - drag.x);
    viewport.scrollTop = drag.top - (event.clientY - drag.y);
  };

  const stopDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setDragging(false);
    if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
      viewportRef.current.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={setViewportRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      className={`overflow-auto overscroll-contain touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
    >
      {children}
    </div>
  );
}

function MindMapNodeCard({
  node,
  selected,
  matched,
  mark,
  palette,
  expanded,
  onSelect,
  onToggle,
}: {
  node: PositionedNode;
  selected: boolean;
  matched: boolean;
  mark?: MindMapMark;
  palette: BranchPalette;
  expanded: boolean;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const isRoot = node.depth === 0;
  const kind = KIND_META[node.node.kind] ?? KIND_META.concept;
  const KindIcon = isRoot ? Network : kind.icon;
  const hasChildren = node.node.children.length > 0;
  const statusBadge = mark === 'mastered'
    ? <CircleCheck size={12} className="shrink-0 text-slate-900" aria-label="Memorizado" />
    : mark === 'review'
      ? <RotateCcw size={11} className="shrink-0 text-amber-700" aria-label="Marcado para revisar" />
      : null;

  return (
    <div
      className="absolute mindmap-node-in"
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        animationDelay: `${Math.min(node.depth, 3) * 35}ms`,
      }}
    >
      <button
        type="button"
        onClick={() => onSelect(node.node.id)}
        onDoubleClick={() => {
          if (hasChildren) onToggle(node.node.id);
        }}
        title={node.node.summary}
        aria-pressed={selected}
        className={`group relative flex h-full w-full flex-col justify-center rounded-2xl border px-3 py-2 text-left transition duration-200 hover:z-10 hover:-translate-y-0.5 hover:brightness-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
          isRoot ? 'rounded-3xl px-4' : ''
        } ${matched ? 'ring-1 ring-slate-600/70' : ''}`}
        style={{
          borderColor: selected ? '#e31d2e' : matched ? '#0369a1' : palette.border,
          backgroundColor: isRoot ? '#fff5f5' : '#ffffff',
          boxShadow: selected
            ? `0 0 0 2px rgba(227,29,46,0.16), 0 8px 22px rgba(23,37,58,0.12)`
            : isRoot
              ? `0 8px 24px ${palette.glow}`
              : undefined,
        }}
      >
        <span className="flex items-center gap-1.5">
          <KindIcon size={isRoot ? 13 : 10} style={{ color: palette.tag }} className="shrink-0" aria-hidden="true" />
          <span
            className={`truncate text-[8px] font-semibold uppercase tracking-[0.14em] ${isRoot ? 'text-[9px]' : ''}`}
            style={{ color: palette.tag }}
          >
            {isRoot ? 'Tema central' : kind.label}
          </span>
          {statusBadge && <span className="ml-auto">{statusBadge}</span>}
        </span>
        <span
          className={`mt-1 line-clamp-2 font-semibold leading-tight text-slate-900 ${
            isRoot ? 'text-sm sm:text-[15px]' : node.depth === 1 ? 'text-xs' : 'text-[11px]'
          }`}
        >
          {node.node.label}
        </span>
        {isRoot && <span className="mt-1 line-clamp-1 text-[10px] leading-4 text-slate-500">Clique para ver detalhes e revisar</span>}
      </button>
      {hasChildren && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggle(node.node.id);
          }}
          aria-label={expanded ? `Recolher ramo de ${node.node.label}` : `Expandir ramo de ${node.node.label}`}
          title={expanded ? 'Recolher ramo' : 'Expandir ramo'}
          className={`absolute top-1/2 z-20 flex size-5 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm shadow-slate-900/10 transition hover:border-slate-300 hover:text-rose-700 ${
            node.side === 'right' ? '-right-2.5' : '-left-2.5'
          }`}
        >
          {expanded ? <Minus size={10} /> : <Plus size={10} />}
        </button>
      )}
    </div>
  );
}

function MindMapCanvas({
  layout,
  zoom,
  selectedId,
  matchIds,
  queryActive,
  marks,
  onSelect,
  onToggle,
}: {
  layout: MindMapLayout;
  zoom: number;
  selectedId: string | null;
  matchIds: Set<string>;
  queryActive: boolean;
  marks: Record<string, MindMapMark>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.node.id, node])), [layout.nodes]);

  return (
    <div
      className="relative select-none"
      style={{ width: layout.width * zoom, height: layout.height * zoom, minWidth: '100%', minHeight: '100%' }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: layout.width,
          height: layout.height,
          transform: `scale(${zoom})`,
          backgroundColor: '#f8fafc',
        }}
      >
        <svg className="pointer-events-none absolute inset-0 overflow-visible" width={layout.width} height={layout.height} aria-hidden="true">
          {layout.edges.map((edge) => {
            const from = nodeById.get(edge.fromId);
            const to = nodeById.get(edge.toId);
            if (!from || !to) return null;
            const palette = BRANCH_PALETTES[edge.paletteIndex % BRANCH_PALETTES.length];
            const path = connectorPath(from, to);
            return (
              <g key={`${edge.fromId}-${edge.toId}`}>
                <path d={path} fill="none" stroke={palette.stroke} strokeWidth={edge.depth === 1 ? 8 : 6} strokeOpacity={0.08} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                <path d={path} fill="none" stroke={palette.stroke} strokeWidth={edge.depth === 1 ? 2 : 1.4} strokeOpacity={0.68} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                <circle cx={to.x >= from.x ? to.x : to.x + to.width} cy={to.y + to.height / 2} r={2.6} fill={palette.stroke} opacity={0.9} />
              </g>
            );
          })}
        </svg>
        {layout.nodes.map((node) => {
          const palette = node.depth === 0
            ? ROOT_PALETTE
            : BRANCH_PALETTES[node.paletteIndex % BRANCH_PALETTES.length];
          return (
            <MindMapNodeCard
              key={node.node.id}
              node={node}
              selected={selectedId === node.node.id}
              matched={queryActive && matchIds.has(node.node.id)}
              mark={marks[node.node.id]}
              palette={palette}
              expanded={node.expanded}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          );
        })}
      </div>
    </div>
  );
}

function MindMapToolbar({
  query,
  onQueryChange,
  resultCount,
  queryActive,
  zoom,
  onZoomChange,
  onFit,
  onExpand,
  onCollapse,
  trailing,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  resultCount: number;
  queryActive: boolean;
  zoom: number;
  onZoomChange: (value: number) => void;
  onFit: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative flex min-w-44 flex-1 items-center sm:max-w-64">
        <Search size={12} className="pointer-events-none absolute left-2.5 text-slate-500" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar conceito, exemplo..."
          aria-label="Buscar conceito no mapa mental"
          className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-8 pr-16 text-[10px] text-slate-900 outline-none placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
        />
        {queryActive ? (
          <span className="pointer-events-none absolute right-8 text-[9px] font-semibold text-rose-700">
            {resultCount}
          </span>
        ) : null}
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Limpar busca"
            className="absolute right-1.5 flex size-6 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={11} />
          </button>
        ) : null}
      </label>
      <div className="flex items-center rounded-lg border border-slate-300 bg-white">
        <button type="button" onClick={() => onZoomChange(Math.max(0.45, Number((zoom - 0.1).toFixed(2))))} aria-label="Reduzir zoom" className="flex size-8 items-center justify-center text-slate-600 transition hover:text-rose-700">
          <Minus size={12} />
        </button>
        <button type="button" onClick={() => onZoomChange(1)} title="Voltar ao zoom 100%" className="min-w-10 text-center text-[10px] font-semibold text-slate-600 transition hover:text-slate-900">
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" onClick={() => onZoomChange(Math.min(1.6, Number((zoom + 0.1).toFixed(2))))} aria-label="Aumentar zoom" className="flex size-8 items-center justify-center text-slate-600 transition hover:text-rose-700">
          <Plus size={12} />
        </button>
      </div>
      <button type="button" onClick={onFit} title="Ajustar mapa à tela" aria-label="Ajustar mapa à tela" className="flex size-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:border-rose-200 hover:text-rose-700">
        <Focus size={12} />
      </button>
      <button type="button" onClick={onExpand} title="Expandir todos os ramos" aria-label="Expandir todos os ramos" className="flex size-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:border-rose-200 hover:text-rose-700">
        <Expand size={12} />
      </button>
      <button type="button" onClick={onCollapse} title="Recolher todos os ramos" aria-label="Recolher todos os ramos" className="flex size-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:border-rose-200 hover:text-rose-700">
        <Shrink size={12} />
      </button>
      {trailing}
    </div>
  );
}

function MindMapInspector({
  entry,
  path,
  note,
  mark,
  onNote,
  onMark,
  onClose,
  compact = false,
}: {
  entry: MindMapEntry;
  path: TeacherMindMapNode[];
  note: string;
  mark?: MindMapMark;
  onNote: (nodeId: string, note: string) => void;
  onMark: (nodeId: string, mark: MindMapMark | null) => void;
  onClose: () => void;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState(note);
  const kind = KIND_META[entry.node.kind] ?? KIND_META.concept;
  const KindIcon = kind.icon;
  const palette = entry.depth === 0
    ? ROOT_PALETTE
    : BRANCH_PALETTES[entry.branchIndex % BRANCH_PALETTES.length];

  const saveNote = () => {
    if (draft.trim() !== note) onNote(entry.node.id, draft);
  };

  return (
    <div className={`mindmap-review-in rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1 text-[9px] text-slate-500">
            {path.map((item, index) => (
              <span key={item.id} className="contents">
                {index > 0 && <span aria-hidden="true">›</span>}
                <span className={index === path.length - 1 ? 'text-slate-700' : 'truncate'}>{item.label}</span>
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <KindIcon size={11} style={{ color: palette.tag }} aria-hidden="true" />
            <span className="text-[8px] font-semibold uppercase tracking-[0.14em]" style={{ color: palette.tag }}>
              {entry.depth === 0 ? 'Tema central' : kind.label}
            </span>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar detalhes do conceito" className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
          <X size={13} />
        </button>
      </div>

      <h4 className="mt-2 text-sm font-semibold leading-5 text-slate-900">{entry.node.label}</h4>
      <LearningRichText className="mt-1 text-[11px] leading-5 text-slate-700">{entry.node.summary}</LearningRichText>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor={`mindmap-note-${entry.node.id}`} className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            Sua mnemônica
          </label>
          <span className="text-[9px] text-slate-500">{draft.length}/360</span>
        </div>
        <textarea
          id={`mindmap-note-${entry.node.id}`}
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, 360))}
          onBlur={saveNote}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              saveNote();
              event.currentTarget.blur();
            }
          }}
          rows={compact ? 2 : 3}
          maxLength={360}
          placeholder="Crie um gancho: uma frase, uma sigla, uma comparação..."
          className="w-full resize-y rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-[11px] leading-5 text-slate-900 outline-none placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
        />
        <p className="mt-1 text-[9px] text-slate-500">Salva automaticamente ao sair do campo.</p>
      </div>

      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onMark(entry.node.id, mark === 'mastered' ? null : 'mastered')}
          aria-pressed={mark === 'mastered'}
          className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-semibold transition ${
            mark === 'mastered'
              ? 'border-slate-400 bg-slate-100 text-slate-900'
              : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
          }`}
        >
          <Check size={11} />
          Já memorizo
        </button>
        <button
          type="button"
          onClick={() => onMark(entry.node.id, mark === 'review' ? null : 'review')}
          aria-pressed={mark === 'review'}
          className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-semibold transition ${
            mark === 'review'
              ? 'border-amber-300 bg-amber-50 text-amber-800'
              : 'border-slate-300 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-800'
          }`}
        >
          <RotateCcw size={11} />
          Revisar depois
        </button>
      </div>
    </div>
  );
}

function MindMapReview({
  entries,
  marks,
  notes,
  onMark,
  onClose,
}: {
  entries: MindMapEntry[];
  marks: Record<string, MindMapMark>;
  notes: Record<string, string>;
  onMark: (nodeId: string, mark: MindMapMark | null) => void;
  onClose: () => void;
}) {
  const [queue, setQueue] = useState<MindMapEntry[]>(() => {
    const pending = entries.filter((entry) => marks[entry.node.id] !== 'mastered');
    return pending.length > 0 ? pending : entries;
  });
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const current = queue[index];
  const finished = index >= queue.length;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const rate = useCallback((mark: MindMapMark) => {
    const target = queue[index];
    if (!target) return;
    onMark(target.node.id, mark);
    setRevealed(false);
    setIndex((currentIndex) => currentIndex + 1);
  }, [index, onMark, queue]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (finished) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select')) return;
      if (!revealed && (event.code === 'Space' || event.key === 'Enter')) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed && event.key === '1') {
        event.preventDefault();
        rate('review');
        return;
      }
      if (revealed && event.key === '2') {
        event.preventDefault();
        rate('mastered');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [finished, onClose, rate, revealed]);

  const masteredInQueue = queue.filter((entry) => marks[entry.node.id] === 'mastered').length;
  const reviewInQueue = queue.filter((entry) => marks[entry.node.id] === 'review').length;
  const masteredInMap = entries.filter((entry) => marks[entry.node.id] === 'mastered').length;
  const progress = finished ? 100 : Math.round((index / queue.length) * 100);
  const kind = current ? KIND_META[current.node.kind] ?? KIND_META.concept : KIND_META.concept;
  const ReviewKindIcon = kind.icon;

  const restart = (targets: MindMapEntry[]) => {
    setQueue(targets);
    setIndex(0);
    setRevealed(false);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Revisão do mapa mental" className="fixed inset-0 z-[240] flex flex-col bg-slate-50 text-slate-900">
      <header className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700">
            <Brain size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Revisão ativa</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
              {finished ? 'Revisão concluída' : `${index + 1} de ${queue.length} conceitos`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-[10px] font-semibold text-slate-900">{masteredInQueue}</span>
            <span className="text-[9px] text-slate-500">lembrados</span>
            <span className="h-3 w-px bg-slate-200" />
            <span className="text-[10px] font-semibold text-amber-700">{reviewInQueue}</span>
            <span className="text-[9px] text-slate-500">a revisar</span>
          </div>
          <button type="button" onClick={onClose} className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-700">
            <X size={13} /> Sair
          </button>
        </div>
      </header>

      <div className="relative h-1 shrink-0 bg-slate-200">
        <div className="h-full rounded-r-full bg-rose-600 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-3xl">
          {finished || !current ? (
            <div className="mindmap-review-in rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-900/10 sm:p-10">
              <span className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-slate-300 bg-slate-100 text-slate-900">
                <CircleCheck size={30} />
              </span>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Revisão concluída</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Você lembrou <strong className="text-slate-900">{masteredInQueue}</strong> de {queue.length} conceitos desta rodada.
              </p>
              <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-2">
                <div className="rounded-2xl border border-slate-300 bg-slate-100 p-3">
                  <p className="text-2xl font-semibold text-slate-900">{masteredInMap}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-900">memorizados no mapa</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-2xl font-semibold text-amber-800">{reviewInQueue}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-amber-800">pedem nova revisão</p>
                </div>
              </div>
              <div className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
                {reviewInQueue > 0 && (
                  <button
                    type="button"
                    onClick={() => restart(queue.filter((entry) => marks[entry.node.id] === 'review'))}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                  >
                    <RotateCcw size={14} /> Revisar os {reviewInQueue} pendentes
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => restart(entries)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Revisar tudo
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-xs font-semibold text-white transition hover:bg-rose-700"
                >
                  Voltar ao mapa
                </button>
              </div>
            </div>
          ) : (
            <div key={current.node.id} className="mindmap-review-in rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-rose-800">
                  <ReviewKindIcon size={10} /> {kind.label}
                </span>
                <span className="truncate text-[10px] text-slate-500">
                  {current.depth === 0 ? 'Tema central' : `Ramo · ${current.branchLabel}`}
                </span>
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Conceito para lembrar</p>
              <h2 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">{current.node.label}</h2>

              {!revealed ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <Brain size={26} className="mx-auto text-slate-900" />
                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-700">
                    Tente explicar este conceito com suas palavras antes de ver a resposta. Recuperar de memória é o que fixa o aprendizado.
                  </p>
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Eye size={15} /> Mostrar resposta
                    <kbd className="ml-1 rounded border border-white/30 bg-white/15 px-1.5 py-0.5 text-[9px] font-medium">Espaço</kbd>
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-900">Resposta</p>
                    <LearningRichText className="mt-2 text-sm leading-6 text-slate-800">{current.node.summary}</LearningRichText>
                    {notes[current.node.id] && (
                      <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
                        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-rose-700">
                          <Lightbulb size={10} /> Sua mnemônica
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-800">{notes[current.node.id]}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => rate('review')}
                      className="flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                    >
                      <RotateCcw size={14} /> Preciso revisar
                      <kbd className="ml-1 rounded border border-amber-300 bg-white/70 px-1.5 py-0.5 text-[9px]">1</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={() => rate('mastered')}
                      className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-xs font-semibold text-white transition hover:bg-rose-700"
                    >
                      <Check size={14} /> Lembrei
                      <kbd className="ml-1 rounded border border-white/30 bg-white/15 px-1.5 py-0.5 text-[9px]">2</kbd>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRevealed(false);
                      setIndex((currentIndex) => currentIndex + 1);
                    }}
                    className="mx-auto mt-3 block text-[10px] font-medium text-slate-500 transition hover:text-slate-800"
                  >
                    Pular sem avaliar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="relative hidden shrink-0 items-center justify-center gap-4 border-t border-slate-200 px-4 py-2.5 text-[9px] text-slate-500 sm:flex">
        <span><kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5">Espaço</kbd> revela a resposta</span>
        <span><kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5">1</kbd> revisar</span>
        <span><kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5">2</kbd> lembrei</span>
        <span><kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5">Esc</kbd> sair</span>
      </footer>
    </div>
  );
}

export default function LearningMindMap({ root, marks, notes, onMark, onNote }: LearningMindMapProps) {
  const allIds = useMemo(() => collectIds(root), [root]);
  const index = useMemo(() => buildMindMapIndex(root), [root]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(allIds));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const inlineViewportRef = useRef<HTMLDivElement | null>(null);
  const fullScreenViewportRef = useRef<HTMLDivElement | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const queryActive = normalizedQuery.length > 0;

  useEffect(() => {
    if (!isFullScreen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullScreen(false);
    };
    const syncNativeFullScreen = () => {
      if (!document.fullscreenElement) setIsFullScreen(false);
    };
    window.addEventListener('keydown', closeWithEscape);
    document.addEventListener('fullscreenchange', syncNativeFullScreen);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeWithEscape);
      document.removeEventListener('fullscreenchange', syncNativeFullScreen);
    };
  }, [isFullScreen]);

  const filteredRoot = useMemo(
    () => (queryActive ? filterMindMap(root, normalizedQuery, notes) : root),
    [normalizedQuery, notes, queryActive, root],
  );
  const layout = useMemo(
    () => (filteredRoot ? createLayout(filteredRoot, expandedIds, queryActive) : null),
    [expandedIds, filteredRoot, queryActive],
  );
  const matchIds = useMemo(
    () => new Set(
      queryActive
        ? index.all.filter((entry) => matchesQuery(entry.node, normalizedQuery, notes)).map((entry) => entry.node.id)
        : [],
    ),
    [index.all, normalizedQuery, notes, queryActive],
  );

  const reviewable = index.all;
  const masteredCount = reviewable.filter((entry) => marks[entry.node.id] === 'mastered').length;
  const reviewCount = reviewable.filter((entry) => marks[entry.node.id] === 'review').length;
  const pendingCount = reviewable.length - masteredCount;
  const masteryPercent = reviewable.length > 0 ? Math.round((masteredCount / reviewable.length) * 100) : 0;
  const selectedEntry = selectedId ? index.byId.get(selectedId) : undefined;
  const selectedPath = useMemo(() => {
    if (!selectedEntry) return [];
    const path: TeacherMindMapNode[] = [];
    let current: MindMapEntry | undefined = selectedEntry;
    while (current) {
      path.unshift(current.node);
      current = current.parentId ? index.byId.get(current.parentId) : undefined;
    }
    return path;
  }, [index.byId, selectedEntry]);

  const toggleNode = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectNode = (id: string) => {
    setSelectedId((current) => (current === id ? null : id));
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    if (value.trim()) setExpandedIds(new Set(allIds));
  };

  const fitMap = () => {
    const viewport = (isFullScreen ? fullScreenViewportRef : inlineViewportRef).current;
    if (!viewport || !layout) return;
    const nextZoom = Math.max(
      0.45,
      Math.min(
        1.15,
        Math.min(
          (viewport.clientWidth - 32) / layout.width,
          (viewport.clientHeight - 32) / layout.height,
        ),
      ),
    );
    const rounded = Number(nextZoom.toFixed(2));
    setZoom(rounded);
    requestAnimationFrame(() => {
      viewport.scrollLeft = 0;
      viewport.scrollTop = Math.max(0, (layout.height * rounded - viewport.clientHeight) / 2);
    });
  };

  const openFullScreen = () => {
    setIsFullScreen(true);
    if (document.documentElement.requestFullscreen) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
  };

  const closeFullScreen = () => {
    setIsFullScreen(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  };

  const openReview = () => {
    if (isFullScreen) closeFullScreen();
    setReviewOpen(true);
  };

  const toolbar = (
    <MindMapToolbar
      query={query}
      onQueryChange={changeQuery}
      resultCount={matchIds.size}
      queryActive={queryActive}
      zoom={zoom}
      onZoomChange={setZoom}
      onFit={fitMap}
      onExpand={() => setExpandedIds(new Set(allIds))}
      onCollapse={() => setExpandedIds(new Set([root.id]))}
    />
  );

  const mapBody = (fullScreen: boolean) => (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${fullScreen ? 'flex min-h-0 flex-1' : ''}`}>
      {layout ? (
        <MindMapViewport
          viewportRef={fullScreen ? fullScreenViewportRef : inlineViewportRef}
          className={fullScreen ? 'min-h-0 flex-1' : 'h-[420px] sm:h-[470px]'}
        >
          <MindMapCanvas
            layout={layout}
            zoom={zoom}
            selectedId={selectedId}
            matchIds={matchIds}
            queryActive={queryActive}
            marks={marks}
            onSelect={selectNode}
            onToggle={toggleNode}
          />
        </MindMapViewport>
      ) : (
        <div className={`flex flex-col items-center justify-center gap-3 px-6 text-center ${fullScreen ? 'min-h-0 flex-1' : 'h-[420px] sm:h-[470px]'}`}>
          <span className="flex size-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
            <Search size={19} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Nenhum conceito encontrado</p>
            <p className="mt-1 max-w-sm text-[11px] leading-5 text-slate-600">
              Tente outro termo ou limpe a busca para voltar ao mapa completo.
            </p>
          </div>
          <button type="button" onClick={() => setQuery('')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[10px] font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-700">
            Limpar busca
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-5">
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 shadow-sm shadow-slate-900/5">
                <Network size={18} />
              </span>
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  Mapa mental da aula
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-medium text-rose-800">
                    memória ativa
                  </span>
                </h3>
                <p className="mt-1 max-w-xl text-[11px] leading-4 text-slate-600">
                  Explore os ramos, crie ganchos de memória e teste o que lembra. O mapa agora é uma ferramenta de revisão, não só de leitura.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5" title={`${masteredCount} de ${reviewable.length} conceitos memorizados`}>
                <span
                  className="relative flex size-8 items-center justify-center rounded-full"
                  aria-hidden="true"
                >
                  <svg className="absolute inset-0 size-full" viewBox="0 0 36 36" aria-hidden="true">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="#0369a1"
                      strokeWidth="3"
                      strokeDasharray={`${(masteryPercent / 100) * 94.25} 94.25`}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                  <span className="relative flex size-6 items-center justify-center rounded-full bg-white text-[8px] font-semibold text-slate-900">
                    {masteryPercent}%
                  </span>
                </span>
                <span className="text-[10px] leading-4 text-slate-600">
                  <strong className="text-slate-900">{masteredCount}</strong>/{reviewable.length}
                  <span className="block text-[9px] text-slate-500">memorizados</span>
                </span>
              </div>
              {reviewCount > 0 && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-medium text-amber-900">
                  {reviewCount} para revisar
                </span>
              )}
              <button
                type="button"
                onClick={openReview}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-rose-700"
              >
                <Brain size={13} />
                Revisar
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[9px]">
                  {pendingCount > 0 ? pendingCount : <Check size={9} />}
                </span>
              </button>
              <button
                type="button"
                onClick={openFullScreen}
                aria-label="Abrir mapa mental em tela cheia"
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 px-2.5 py-2 text-[10px] font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-200"
              >
                <Maximize2 size={12} />
                Tela cheia
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3">
            {toolbar}
          </div>

          <div className="mt-3">
            {queryActive && matchIds.size > 0 && (
              <p className="mb-2 text-[10px] font-medium text-slate-900">
                {matchIds.size} conceito{matchIds.size === 1 ? '' : 's'} encontrado{matchIds.size === 1 ? '' : 's'} para “{query.trim()}”.
              </p>
            )}
            {mapBody(false)}
          </div>

          {selectedEntry ? (
            <div className="mt-3">
              <MindMapInspector
                key={selectedEntry.node.id}
                entry={selectedEntry}
                path={selectedPath}
                note={notes[selectedEntry.node.id] ?? ''}
                mark={marks[selectedEntry.node.id]}
                onNote={onNote}
                onMark={onMark}
                onClose={() => setSelectedId(null)}
              />
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] leading-4 text-slate-600">
              <Lightbulb size={13} className="shrink-0 text-slate-900" />
              Clique em um nó para ver a explicação completa, escrever uma mnemônica e marcar o que já lembra. Use <span className="rounded border border-slate-200 bg-white px-1 text-[9px] text-slate-700">Revisar</span> para se testar.
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-rose-500" /> ramos coloridos</span>
            <span className="flex items-center gap-1.5"><CircleCheck size={10} className="text-slate-900" /> memorizado</span>
            <span className="flex items-center gap-1.5"><RotateCcw size={9} className="text-amber-700" /> revisar depois</span>
            <span className="ml-auto hidden sm:flex">Clique duas vezes em um nó para expandir ou recolher o ramo.</span>
          </div>
        </div>
      </section>

      {isFullScreen && (
        <div role="dialog" aria-modal="true" aria-label="Mapa mental em tela cheia" className="fixed inset-0 z-[220] flex flex-col bg-slate-50 text-slate-900">
          <header className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700">
                <Network size={17} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{root.label}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  Mapa mental · {reviewable.length} conceitos · {masteredCount} memorizados
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={openReview}
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-[10px] font-semibold text-white transition hover:bg-rose-700"
              >
                <Brain size={13} /> Revisar
              </button>
              <button type="button" onClick={closeFullScreen} className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-700">
                <Minimize2 size={13} /> Sair
              </button>
            </div>
          </header>

          <div className="relative shrink-0 border-b border-slate-200 px-4 py-2.5 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              {toolbar}
              <span className="ml-auto hidden items-center gap-3 text-[9px] text-slate-500 sm:flex">
                <span className="flex items-center gap-1.5"><CircleCheck size={10} className="text-slate-900" /> memorizado</span>
                <span className="flex items-center gap-1.5"><RotateCcw size={9} className="text-amber-700" /> revisar</span>
              </span>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-5 lg:flex-row">
            <div className="flex min-h-[46%] flex-1 flex-col lg:min-h-0">
              {mapBody(true)}
            </div>
            {selectedEntry && (
              <aside className="max-h-[40%] shrink-0 overflow-y-auto lg:max-h-none lg:w-[330px]">
                <MindMapInspector
                  key={selectedEntry.node.id}
                  entry={selectedEntry}
                  path={selectedPath}
                  note={notes[selectedEntry.node.id] ?? ''}
                  mark={marks[selectedEntry.node.id]}
                  onNote={onNote}
                  onMark={onMark}
                  onClose={() => setSelectedId(null)}
                  compact
                />
              </aside>
            )}
          </div>

          {!selectedEntry && (
            <div className="relative shrink-0 pb-4 text-center text-[10px] text-slate-500">
              <Lightbulb size={11} className="mr-1 inline text-slate-900" />
              Selecione um conceito para ver detalhes, criar uma mnemônica e marcar o que já lembra.
            </div>
          )}
        </div>
      )}

      {reviewOpen && (
        <MindMapReview
          entries={reviewable}
          marks={marks}
          notes={notes}
          onMark={onMark}
          onClose={() => setReviewOpen(false)}
        />
      )}
    </>
  );
}
