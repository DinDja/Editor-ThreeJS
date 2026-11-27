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
  { stroke: '#e879f9', border: 'rgba(232,121,249,0.45)', tag: '#f0abfc', glow: 'rgba(217,70,239,0.22)' },
  { stroke: '#818cf8', border: 'rgba(129,140,248,0.45)', tag: '#a5b4fc', glow: 'rgba(99,102,241,0.22)' },
  { stroke: '#22d3ee', border: 'rgba(34,211,238,0.42)', tag: '#67e8f9', glow: 'rgba(6,182,212,0.2)' },
  { stroke: '#34d399', border: 'rgba(52,211,153,0.42)', tag: '#6ee7b7', glow: 'rgba(16,185,129,0.2)' },
  { stroke: '#fbbf24', border: 'rgba(251,191,36,0.42)', tag: '#fcd34d', glow: 'rgba(245,158,11,0.2)' },
  { stroke: '#fb7185', border: 'rgba(251,113,133,0.42)', tag: '#fda4af', glow: 'rgba(244,63,94,0.2)' },
];

const ROOT_PALETTE: BranchPalette = {
  stroke: '#e879f9',
  border: 'rgba(232,121,249,0.55)',
  tag: '#f5d0fe',
  glow: 'rgba(217,70,239,0.3)',
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
    ? <CircleCheck size={12} className="shrink-0 text-emerald-300" aria-label="Memorizado" />
    : mark === 'review'
      ? <RotateCcw size={11} className="shrink-0 text-amber-300" aria-label="Marcado para revisar" />
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
        className={`group relative flex h-full w-full flex-col justify-center rounded-2xl border px-3 py-2 text-left transition duration-200 hover:z-10 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
          isRoot ? 'rounded-3xl px-4' : ''
        } ${matched ? 'ring-1 ring-lime-300/70' : ''}`}
        style={{
          borderColor: selected || matched ? (matched ? '#bef264' : '#ffffff') : palette.border,
          background: isRoot
            ? 'linear-gradient(140deg, rgba(217,70,239,0.25), rgba(99,102,241,0.18) 52%, rgba(13,17,23,0.98))'
            : 'linear-gradient(145deg, rgba(23,28,36,0.98), rgba(12,15,20,0.98))',
          boxShadow: selected
            ? `0 0 0 2px rgba(255,255,255,0.7), 0 0 34px ${palette.glow}`
            : isRoot
              ? `0 0 40px ${palette.glow}`
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
          className={`mt-1 line-clamp-2 font-semibold leading-tight text-neutral-50 ${
            isRoot ? 'text-sm sm:text-[15px]' : node.depth === 1 ? 'text-xs' : 'text-[11px]'
          }`}
        >
          {node.node.label}
        </span>
        {isRoot && <span className="mt-1 line-clamp-1 text-[10px] leading-4 text-fuchsia-100/60">Clique para ver detalhes e revisar</span>}
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
          className={`absolute top-1/2 z-20 flex size-5 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#171c24] text-neutral-400 shadow-lg shadow-black/40 transition hover:border-white/50 hover:text-white ${
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
  const rootNode = layout.nodes.find((node) => node.depth === 0);

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
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.16) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      >
        {rootNode && (
          <div
            className="pointer-events-none absolute rounded-full"
            style={{
              left: rootNode.x + rootNode.width / 2,
              top: rootNode.y + rootNode.height / 2,
              width: 460,
              height: 340,
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(closest-side, rgba(217,70,239,0.16), rgba(99,102,241,0.06), transparent)',
            }}
            aria-hidden="true"
          />
        )}
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
        <Search size={12} className="pointer-events-none absolute left-2.5 text-neutral-500" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar conceito, exemplo..."
          aria-label="Buscar conceito no mapa mental"
          className="h-8 w-full rounded-lg border border-white/10 bg-black/25 pl-8 pr-16 text-[10px] text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-fuchsia-400/60"
        />
        {queryActive ? (
          <span className="pointer-events-none absolute right-8 text-[9px] font-semibold text-lime-200">
            {resultCount}
          </span>
        ) : null}
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Limpar busca"
            className="absolute right-1.5 flex size-6 items-center justify-center rounded-md text-neutral-500 transition hover:bg-white/10 hover:text-white"
          >
            <X size={11} />
          </button>
        ) : null}
      </label>
      <div className="flex items-center rounded-lg border border-white/10 bg-black/25">
        <button type="button" onClick={() => onZoomChange(Math.max(0.45, Number((zoom - 0.1).toFixed(2))))} aria-label="Reduzir zoom" className="flex size-8 items-center justify-center text-neutral-400 transition hover:text-fuchsia-100">
          <Minus size={12} />
        </button>
        <button type="button" onClick={() => onZoomChange(1)} title="Voltar ao zoom 100%" className="min-w-10 text-center text-[10px] font-semibold text-neutral-400 transition hover:text-white">
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" onClick={() => onZoomChange(Math.min(1.6, Number((zoom + 0.1).toFixed(2))))} aria-label="Aumentar zoom" className="flex size-8 items-center justify-center text-neutral-400 transition hover:text-fuchsia-100">
          <Plus size={12} />
        </button>
      </div>
      <button type="button" onClick={onFit} title="Ajustar mapa à tela" aria-label="Ajustar mapa à tela" className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-black/25 text-neutral-400 transition hover:text-fuchsia-100">
        <Focus size={12} />
      </button>
      <button type="button" onClick={onExpand} title="Expandir todos os ramos" aria-label="Expandir todos os ramos" className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-black/25 text-neutral-400 transition hover:text-fuchsia-100">
        <Expand size={12} />
      </button>
      <button type="button" onClick={onCollapse} title="Recolher todos os ramos" aria-label="Recolher todos os ramos" className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-black/25 text-neutral-400 transition hover:text-fuchsia-100">
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
    <div className={`mindmap-review-in rounded-2xl border border-white/10 bg-[#10141a]/95 ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1 text-[9px] text-neutral-600">
            {path.map((item, index) => (
              <span key={item.id} className="contents">
                {index > 0 && <span aria-hidden="true">›</span>}
                <span className={index === path.length - 1 ? 'text-neutral-400' : 'truncate'}>{item.label}</span>
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
        <button type="button" onClick={onClose} aria-label="Fechar detalhes do conceito" className="flex size-7 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-white/10 hover:text-white">
          <X size={13} />
        </button>
      </div>

      <h4 className="mt-2 text-sm font-semibold leading-5 text-white">{entry.node.label}</h4>
      <LearningRichText className="mt-1 text-[11px] leading-5 text-neutral-300">{entry.node.summary}</LearningRichText>

      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <label htmlFor={`mindmap-note-${entry.node.id}`} className="text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
            Sua mnemônica
          </label>
          <span className="text-[9px] text-neutral-600">{draft.length}/360</span>
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
          className="w-full resize-y rounded-xl border border-white/10 bg-black/30 p-2.5 text-[11px] leading-5 text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-fuchsia-400/50"
        />
        <p className="mt-1 text-[9px] text-neutral-600">Salva automaticamente ao sair do campo.</p>
      </div>

      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onMark(entry.node.id, mark === 'mastered' ? null : 'mastered')}
          aria-pressed={mark === 'mastered'}
          className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[10px] font-semibold transition ${
            mark === 'mastered'
              ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-100'
              : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:border-emerald-400/40 hover:text-emerald-200'
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
              ? 'border-amber-400/60 bg-amber-400/15 text-amber-100'
              : 'border-white/10 bg-white/[0.03] text-neutral-400 hover:border-amber-400/40 hover:text-amber-200'
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
    <div role="dialog" aria-modal="true" aria-label="Revisão do mapa mental" className="fixed inset-0 z-[240] flex flex-col bg-[#080a10] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <header className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0e1119]/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200">
            <Brain size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Revisão ativa</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">
              {finished ? 'Revisão concluída' : `${index + 1} de ${queue.length} conceitos`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-[10px] font-semibold text-emerald-300">{masteredInQueue}</span>
            <span className="text-[9px] text-neutral-600">lembrados</span>
            <span className="h-3 w-px bg-white/10" />
            <span className="text-[10px] font-semibold text-amber-300">{reviewInQueue}</span>
            <span className="text-[9px] text-neutral-600">a revisar</span>
          </div>
          <button type="button" onClick={onClose} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-neutral-300 transition hover:border-white/25 hover:text-white">
            <X size={13} /> Sair
          </button>
        </div>
      </header>

      <div className="relative h-1 shrink-0 bg-white/5">
        <div className="h-full rounded-r-full bg-gradient-to-r from-fuchsia-400 via-violet-400 to-emerald-300 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-3xl">
          {finished || !current ? (
            <div className="mindmap-review-in rounded-3xl border border-white/10 bg-gradient-to-br from-[#171b26] via-[#11151d] to-[#0d1015] p-7 text-center shadow-2xl shadow-black/40 sm:p-10">
              <span className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-200">
                <CircleCheck size={30} />
              </span>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">Revisão concluída</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                Você lembrou <strong className="text-emerald-200">{masteredInQueue}</strong> de {queue.length} conceitos desta rodada.
              </p>
              <div className="mx-auto mt-6 grid max-w-md grid-cols-2 gap-2">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-3">
                  <p className="text-2xl font-semibold text-emerald-200">{masteredInMap}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-emerald-300/70">memorizados no mapa</p>
                </div>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3">
                  <p className="text-2xl font-semibold text-amber-200">{reviewInQueue}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-amber-300/70">pedem nova revisão</p>
                </div>
              </div>
              <div className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
                {reviewInQueue > 0 && (
                  <button
                    type="button"
                    onClick={() => restart(queue.filter((entry) => marks[entry.node.id] === 'review'))}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20"
                  >
                    <RotateCcw size={14} /> Revisar os {reviewInQueue} pendentes
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => restart(entries)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-semibold text-neutral-300 transition hover:border-white/25 hover:text-white"
                >
                  Revisar tudo
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-fuchsia-400 px-4 py-3 text-xs font-semibold text-neutral-950 transition hover:bg-fuchsia-300"
                >
                  Voltar ao mapa
                </button>
              </div>
            </div>
          ) : (
            <div key={current.node.id} className="mindmap-review-in rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1424] via-[#13161f] to-[#0e1117] p-5 shadow-2xl shadow-black/40 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-fuchsia-200">
                  <ReviewKindIcon size={10} /> {kind.label}
                </span>
                <span className="truncate text-[10px] text-neutral-500">
                  {current.depth === 0 ? 'Tema central' : `Ramo · ${current.branchLabel}`}
                </span>
              </div>
              <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Conceito para lembrar</p>
              <h2 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">{current.node.label}</h2>

              {!revealed ? (
                <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-center">
                  <Brain size={26} className="mx-auto text-fuchsia-300" />
                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-300">
                    Tente explicar este conceito com suas palavras antes de ver a resposta. Recuperar de memória é o que fixa o aprendizado.
                  </p>
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-fuchsia-400 px-5 py-3 text-xs font-semibold text-neutral-950 transition hover:bg-fuchsia-300"
                  >
                    <Eye size={15} /> Mostrar resposta
                    <kbd className="ml-1 rounded border border-black/20 bg-black/10 px-1.5 py-0.5 text-[9px] font-medium">Espaço</kbd>
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300/80">Resposta</p>
                    <LearningRichText className="mt-2 text-sm leading-6 text-neutral-200">{current.node.summary}</LearningRichText>
                    {notes[current.node.id] && (
                      <div className="mt-4 rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/5 p-3">
                        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-fuchsia-300/80">
                          <Lightbulb size={10} /> Sua mnemônica
                        </p>
                        <p className="mt-1 text-xs leading-5 text-fuchsia-50/90">{notes[current.node.id]}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => rate('review')}
                      className="flex items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20"
                    >
                      <RotateCcw size={14} /> Preciso revisar
                      <kbd className="ml-1 rounded border border-amber-300/20 bg-black/15 px-1.5 py-0.5 text-[9px]">1</kbd>
                    </button>
                    <button
                      type="button"
                      onClick={() => rate('mastered')}
                      className="flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-xs font-semibold text-neutral-950 transition hover:bg-emerald-300"
                    >
                      <Check size={14} /> Lembrei
                      <kbd className="ml-1 rounded border border-black/20 bg-black/10 px-1.5 py-0.5 text-[9px]">2</kbd>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRevealed(false);
                      setIndex((currentIndex) => currentIndex + 1);
                    }}
                    className="mx-auto mt-3 block text-[10px] font-medium text-neutral-500 transition hover:text-neutral-300"
                  >
                    Pular sem avaliar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <footer className="relative hidden shrink-0 items-center justify-center gap-4 border-t border-white/10 px-4 py-2.5 text-[9px] text-neutral-600 sm:flex">
        <span><kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">Espaço</kbd> revela a resposta</span>
        <span><kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">1</kbd> revisar</span>
        <span><kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">2</kbd> lembrei</span>
        <span><kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">Esc</kbd> sair</span>
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
    <div className={`overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e14] ${fullScreen ? 'flex min-h-0 flex-1' : ''}`}>
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
          <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-neutral-500">
            <Search size={19} />
          </span>
          <div>
            <p className="text-sm font-semibold text-neutral-300">Nenhum conceito encontrado</p>
            <p className="mt-1 max-w-sm text-[11px] leading-5 text-neutral-500">
              Tente outro termo ou limpe a busca para voltar ao mapa completo.
            </p>
          </div>
          <button type="button" onClick={() => setQuery('')} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-semibold text-neutral-300 transition hover:border-white/25 hover:text-white">
            Limpar busca
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <section className="relative overflow-hidden rounded-3xl border border-fuchsia-900/40 bg-gradient-to-br from-[#241329] via-[#14141f] to-[#101318] p-4 sm:p-5">
        <div className="pointer-events-none absolute -left-20 -top-24 size-64 rounded-full bg-fuchsia-500/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 right-0 size-64 rounded-full bg-indigo-500/10 blur-3xl" aria-hidden="true" />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 text-fuchsia-200 shadow-lg shadow-fuchsia-950/30">
                <Network size={18} />
              </span>
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-fuchsia-50">
                  Mapa mental da aula
                  <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2 py-0.5 text-[9px] font-medium text-fuchsia-200/90">
                    memória ativa
                  </span>
                </h3>
                <p className="mt-1 max-w-xl text-[11px] leading-4 text-neutral-400">
                  Explore os ramos, crie ganchos de memória e teste o que lembra. O mapa agora é uma ferramenta de revisão, não só de leitura.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-2.5 py-1.5" title={`${masteredCount} de ${reviewable.length} conceitos memorizados`}>
                <span
                  className="relative flex size-8 items-center justify-center rounded-full"
                  style={{ background: `conic-gradient(#34d399 ${masteryPercent}%, rgba(255,255,255,0.08) 0)` }}
                  aria-hidden="true"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-[#191525] text-[8px] font-semibold text-emerald-200">
                    {masteryPercent}%
                  </span>
                </span>
                <span className="text-[10px] leading-4 text-neutral-400">
                  <strong className="text-neutral-100">{masteredCount}</strong>/{reviewable.length}
                  <span className="block text-[9px] text-neutral-600">memorizados</span>
                </span>
              </div>
              {reviewCount > 0 && (
                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] font-medium text-amber-200">
                  {reviewCount} para revisar
                </span>
              )}
              <button
                type="button"
                onClick={openReview}
                className="flex items-center gap-1.5 rounded-xl bg-fuchsia-400 px-3 py-2 text-[10px] font-semibold text-neutral-950 transition hover:bg-fuchsia-300"
              >
                <Brain size={13} />
                Revisar
                <span className="rounded-full bg-black/15 px-1.5 py-0.5 text-[9px]">
                  {pendingCount > 0 ? pendingCount : <Check size={9} />}
                </span>
              </button>
              <button
                type="button"
                onClick={openFullScreen}
                aria-label="Abrir mapa mental em tela cheia"
                className="flex items-center gap-1.5 rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/10 px-2.5 py-2 text-[10px] font-semibold text-fuchsia-100 transition hover:bg-fuchsia-400/20"
              >
                <Maximize2 size={12} />
                Tela cheia
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-white/5 pt-3">
            {toolbar}
          </div>

          <div className="mt-3">
            {queryActive && matchIds.size > 0 && (
              <p className="mb-2 text-[10px] text-lime-200/80">
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
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5 text-[10px] leading-4 text-neutral-500">
              <Lightbulb size={13} className="shrink-0 text-fuchsia-300/70" />
              Clique em um nó para ver a explicação completa, escrever uma mnemônica e marcar o que já lembra. Use <span className="rounded border border-white/10 bg-white/5 px-1 text-[9px] text-neutral-300">Revisar</span> para se testar.
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] text-neutral-600">
            <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-fuchsia-300" /> ramos coloridos</span>
            <span className="flex items-center gap-1.5"><CircleCheck size={10} className="text-emerald-300" /> memorizado</span>
            <span className="flex items-center gap-1.5"><RotateCcw size={9} className="text-amber-300" /> revisar depois</span>
            <span className="ml-auto hidden sm:flex">Clique duas vezes em um nó para expandir ou recolher o ramo.</span>
          </div>
        </div>
      </section>

      {isFullScreen && (
        <div role="dialog" aria-modal="true" aria-label="Mapa mental em tela cheia" className="fixed inset-0 z-[220] flex flex-col bg-[#080a10] text-white">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
          </div>
          <header className="relative flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0e1119]/90 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200">
                <Network size={17} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{root.label}</p>
                <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                  Mapa mental · {reviewable.length} conceitos · {masteredCount} memorizados
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={openReview}
                className="flex items-center gap-1.5 rounded-xl bg-fuchsia-400 px-3 py-2 text-[10px] font-semibold text-neutral-950 transition hover:bg-fuchsia-300"
              >
                <Brain size={13} /> Revisar
              </button>
              <button type="button" onClick={closeFullScreen} className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-neutral-300 transition hover:border-fuchsia-400/50 hover:text-fuchsia-100">
                <Minimize2 size={13} /> Sair
              </button>
            </div>
          </header>

          <div className="relative shrink-0 border-b border-white/5 px-4 py-2.5 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              {toolbar}
              <span className="ml-auto hidden items-center gap-3 text-[9px] text-neutral-600 sm:flex">
                <span className="flex items-center gap-1.5"><CircleCheck size={10} className="text-emerald-300" /> memorizado</span>
                <span className="flex items-center gap-1.5"><RotateCcw size={9} className="text-amber-300" /> revisar</span>
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
            <div className="relative shrink-0 pb-4 text-center text-[10px] text-neutral-600">
              <Lightbulb size={11} className="mr-1 inline text-fuchsia-300/70" />
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
