'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Maximize2, Minus, Plus, X } from 'lucide-react';
import { flattenPageNodes, findPageNode } from '@/lib/page-builder/tree';
import type { PageDocument, PageNode } from '@/lib/page-builder/types';
import { useExperienceStore } from '@/store/experienceStore';
import {
  PAGE_BUILDER_ZOOM_MAX,
  PAGE_BUILDER_ZOOM_MIN,
  usePageBuilderViewportStore,
} from '@/store/pageBuilderViewportStore';

const MAP_WIDTH = 200;
const MAP_HEIGHT = 130;

const toCssNumber = (value: number | string | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const isColorLike = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) || /^rgba?\(/i.test(v) || /^hsla?\(/i.test(v);
};

const computeNodeBounds = (node: PageNode): { x: number; y: number; width: number; height: number } => {
  const left = toCssNumber(node.styles.base.left);
  const top = toCssNumber(node.styles.base.top);
  const width = toCssNumber(node.styles.base.width) || 200;
  const height = toCssNumber(node.styles.base.height) || 40;
  return { x: left, y: top, width, height };
};

type MinimapNodeMeta = {
  id: string;
  type: string;
  name: string;
  bounds: { x: number; y: number; width: number; height: number };
  background: string | null;
  color: string | null;
  borderRadius: number;
  textPreview: string | null;
};

const collectNodes = (page: PageDocument): MinimapNodeMeta[] => {
  const all: MinimapNodeMeta[] = [];
  const walk = (nodes: PageNode[]) => {
    for (const node of nodes) {
      const bounds = computeNodeBounds(node);
      const bgRaw = node.styles.base.background;
      const bg = typeof bgRaw === 'string' && bgRaw !== 'transparent' && bgRaw !== 'none' && isColorLike(bgRaw) ? bgRaw : null;
      const colorRaw = node.styles.base.color;
      const color = typeof colorRaw === 'string' && isColorLike(colorRaw) ? colorRaw : null;
      const borderRadius = toCssNumber(node.styles.base.borderRadius);
      const text = typeof node.props.text === 'string'
        ? node.props.text
        : typeof node.props.label === 'string'
          ? node.props.label
          : typeof node.props.title === 'string'
            ? node.props.title
            : typeof node.props.brand === 'string'
              ? node.props.brand
              : null;
      all.push({
        id: node.id,
        type: node.type,
        name: node.name,
        bounds,
        background: bg,
        color,
        borderRadius,
        textPreview: text ? text.slice(0, 40) : null,
      });
      if (node.children) walk(node.children);
    }
  };
  walk(page.children);
  return all;
};

const computeContentBounds = (nodes: MinimapNodeMeta[]): { minX: number; minY: number; width: number; height: number } | null => {
  if (nodes.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.bounds.x);
    minY = Math.min(minY, n.bounds.y);
    maxX = Math.max(maxX, n.bounds.x + n.bounds.width);
    maxY = Math.max(maxY, n.bounds.y + n.bounds.height);
  }
  return { minX, minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
};

type PageBuilderMiniMapProps = {
  workspaceRef: RefObject<HTMLDivElement | null>;
};

export default function PageBuilderMiniMap({ workspaceRef }: PageBuilderMiniMapProps) {
  const page = useExperienceStore((state) => state.page);
  const selectedPageNodeId = useExperienceStore((state) => state.selectedPageNodeId);
  const setSelectedPageNode = useExperienceStore((state) => state.setSelectedPageNode);
  const zoom = usePageBuilderViewportStore((state) => state.zoom);
  const setScale = usePageBuilderViewportStore((state) => state.setScale);
  const setOffset = usePageBuilderViewportStore((state) => state.setOffset);
  const resetViewport = usePageBuilderViewportStore((state) => state.reset);
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState<'br' | 'bl'>('br');
  const [zoomPct, setZoomPct] = useState<25 | 50 | 100 | 200>(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; startOffsetX: number; startOffsetY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const nodes = useMemo(() => collectNodes(page), [page]);
  const bounds = useMemo(() => computeContentBounds(nodes), [nodes]);

  // Calculate map scale based on selected zoomPct and content bounds
  const mapScale = useMemo(() => {
    if (!bounds) return 1;
    const baseScale = Math.min(MAP_WIDTH / bounds.width, MAP_HEIGHT / bounds.height);
    return baseScale * (zoomPct / 100);
  }, [bounds, zoomPct]);

  const offsetX = bounds ? (MAP_WIDTH - bounds.width * mapScale) / 2 - bounds.minX * mapScale : 0;
  const offsetY = bounds ? (MAP_HEIGHT - bounds.height * mapScale) / 2 - bounds.minY * mapScale : 0;

  // Track workspace size to keep viewport indicator accurate
  const [workspaceSize, setWorkspaceSize] = useState({ width: 0, height: 0 });

  // Viewport indicator: area currently visible in canvas (in canvas-space units)
  const viewport = useMemo(() => {
    const ws = workspaceRef.current;
    if (!ws || !bounds) return null;
    const wsWidth = workspaceSize.width || ws.clientWidth;
    const wsHeight = workspaceSize.height || ws.clientHeight;
    const visibleWidth = wsWidth / zoom.scale;
    const visibleHeight = wsHeight / zoom.scale;
    // The top-left of the visible canvas area (in canvas-space)
    // Offset is how much the content is shifted; positive offsetX means content moved right
    // So the visible canvas area's top-left is at -offsetX/scale
    const x = -zoom.offsetX / zoom.scale;
    const y = -zoom.offsetY / zoom.scale;
    return { x, y, width: visibleWidth, height: visibleHeight };
  }, [workspaceRef, bounds, zoom.scale, zoom.offsetX, zoom.offsetY, workspaceSize.width, workspaceSize.height]);

  // Center the canvas on a point in the content (in canvas-space)
  const centerOn = useCallback((contentX: number, contentY: number) => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const wsWidth = workspaceSize.width || ws.clientWidth;
    const wsHeight = workspaceSize.height || ws.clientHeight;
    setOffset(wsWidth / 2 - contentX * zoom.scale, wsHeight / 2 - contentY * zoom.scale);
  }, [workspaceRef, setOffset, zoom.scale, workspaceSize.width, workspaceSize.height]);

  const handleCanvasCenter = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (dragStateRef.current) return; // drag handles centering
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left - offsetX) / mapScale;
    const y = (event.clientY - rect.top - offsetY) / mapScale;
    centerOn(x, y);
  }, [centerOn, offsetX, offsetY, mapScale]);

  // Drag the viewport indicator to pan
  const handleViewportPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: zoom.offsetX,
      startOffsetY: zoom.offsetY,
    };
    setIsDragging(true);
  }, [zoom.offsetX, zoom.offsetY]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      // Convert pixel delta to content delta via mapScale / zoom.scale
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      // When the user drags the viewport in the map, we want the canvas to follow.
      // The viewport in the map represents the visible area; dragging it by (dx, dy)
      // shifts the visible area by (dx, dy) in map pixels.
      // Convert map pixels to content pixels: (dx, dy) / mapScale
      // Then in canvas: dxContent * zoom.scale = dx in screen space
      // And the offset change: newOffset = startOffset + dx * zoom.scale
      // (positive dx in map means dragging right -> canvas content should move left -> offsetX decreases... actually opposite)
      // Actually: when the user drags the viewport right in the map, they're saying "show me what's to the right"
      // That means we should pan the canvas so new content appears from the right.
      // In our offset model: increasing offsetX shifts the content to the left visually.
      // So if user drags right, we want the visible window to move right, which means offsetX decreases.
      setOffset(state.startOffsetX - dx * zoom.scale, state.startOffsetY - dy * zoom.scale);
    };
    const onUp = () => {
      dragStateRef.current = null;
      setIsDragging(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isDragging, setOffset, zoom.scale]);

  // Force re-render when workspace resizes (so viewport indicator stays accurate)
  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const update = () => setWorkspaceSize({ width: ws.clientWidth, height: ws.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(ws);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [workspaceRef]);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        data-tutorial="page-minimap"
        className="absolute right-3 bottom-3 z-30 grid h-9 w-9 place-items-center rounded-md border border-neutral-700 bg-neutral-950/90 text-neutral-400 shadow-2xl backdrop-blur transition hover:border-emerald-400/50 hover:text-emerald-200"
        title="Mostrar mini-mapa"
        aria-label="Mostrar mini-mapa"
      >
        <Maximize2 size={14} />
      </button>
    );
  }

  if (!bounds || page.children.length === 0) {
    return (
      <div className="absolute right-3 bottom-3 z-30 select-none rounded-md border border-neutral-700 bg-neutral-950/90 p-2.5 text-[10px] text-neutral-500 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em]">Mini-mapa</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPosition((p) => (p === 'br' ? 'bl' : 'br'))}
              className="grid h-5 w-5 place-items-center rounded text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200"
              title="Mover para o outro canto"
              aria-label="Mover mini-mapa"
            >
              <Maximize2 size={10} className="rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="grid h-5 w-5 place-items-center rounded text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200"
              title="Fechar"
              aria-label="Fechar mini-mapa"
            >
              <X size={10} />
            </button>
          </div>
        </div>
        <div className="mt-1.5 text-center text-[9px]">Sem conteúdo</div>
      </div>
    );
  }

  // Position class
  const positionClass = position === 'br' ? 'right-3 bottom-3' : 'left-3 bottom-3';

  return (
    <div
      data-tutorial="page-minimap"
      className={`absolute ${positionClass} z-30 select-none rounded-md border border-neutral-700 bg-neutral-950/90 shadow-2xl backdrop-blur`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-1 border-b border-neutral-800 px-2 py-1">
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          Mini-mapa
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setPosition((p) => (p === 'br' ? 'bl' : 'br'))}
            className="grid h-5 w-5 place-items-center rounded text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200"
            title="Mover de canto"
            aria-label="Mover mini-mapa"
          >
            <Maximize2 size={10} className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="grid h-5 w-5 place-items-center rounded text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200"
            title="Fechar"
            aria-label="Fechar mini-mapa"
          >
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Map area */}
      <div
        ref={containerRef}
        className="relative cursor-crosshair overflow-hidden bg-[#0a0c0d]"
        style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
        onClick={handleCanvasCenter}
      >
        {nodes.map((node) => {
          const left = (node.bounds.x - bounds.minX) * mapScale + offsetX;
          const top = (node.bounds.y - bounds.minY) * mapScale + offsetY;
          const width = node.bounds.width * mapScale;
          const height = node.bounds.height * mapScale;
          const isSelected = node.id === selectedPageNodeId;
          const minSize = Math.max(width, height);
          return (
            <div
              key={node.id}
              className={`absolute overflow-hidden transition-colors ${
                isSelected
                  ? 'ring-2 ring-emerald-300/90'
                  : 'ring-1 ring-emerald-400/15'
              }`}
              style={{
                left,
                top,
                width: Math.max(1, width),
                height: Math.max(1, height),
                background: node.background ?? 'rgba(52, 211, 153, 0.08)',
                borderRadius: Math.min(node.borderRadius * mapScale, 8),
              }}
              title={node.name}
            >
              {minSize > 18 && node.textPreview && (
                <div
                  className="truncate px-0.5 text-[7px] leading-tight"
                  style={{ color: node.color ?? 'rgba(255,255,255,0.6)' }}
                >
                  {node.textPreview}
                </div>
              )}
            </div>
          );
        })}

        {/* Viewport indicator (draggable) */}
        {viewport && (
          <div
            onPointerDown={handleViewportPointerDown}
            className={`absolute z-10 border-2 transition-colors ${
              isDragging
                ? 'border-emerald-300 bg-emerald-400/20'
                : 'border-sky-300/80 bg-sky-400/[0.08] hover:border-sky-300 hover:bg-sky-400/[0.12]'
            }`}
            style={{
              left: (viewport.x - bounds.minX) * mapScale + offsetX,
              top: (viewport.y - bounds.minY) * mapScale + offsetY,
              width: viewport.width * mapScale,
              height: viewport.height * mapScale,
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            title="Arraste para mover o canvas"
            aria-label="Viewport (arraste para mover)"
          />
        )}
      </div>

      {/* Footer: zoom + actions */}
      <div className="flex items-center justify-between gap-1 border-t border-neutral-800 px-1.5 py-1">
        <div className="flex items-center gap-0.5">
          {([25, 50, 100, 200] as const).map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => setZoomPct(pct)}
              className={`rounded px-1.5 py-0.5 text-[9px] font-medium transition ${
                zoomPct === pct
                  ? 'bg-emerald-400/15 text-emerald-200'
                  : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
              title={`Zoom do mini-mapa: ${pct}%`}
              aria-pressed={zoomPct === pct}
            >
              {pct}%
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              setScale(Math.max(PAGE_BUILDER_ZOOM_MIN, zoom.scale * 0.9));
            }}
            disabled={zoom.scale <= PAGE_BUILDER_ZOOM_MIN + 0.01}
            className="grid h-5 w-5 place-items-center rounded text-neutral-500 transition hover:bg-neutral-800 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-30"
            title="Diminuir zoom do canvas"
            aria-label="Diminuir zoom"
          >
            <Minus size={10} />
          </button>
          <button
            type="button"
            onClick={resetViewport}
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-emerald-200"
            title="Resetar zoom (100%)"
          >
            {Math.round(zoom.scale * 100)}%
          </button>
          <button
            type="button"
            onClick={() => {
              setScale(Math.min(PAGE_BUILDER_ZOOM_MAX, zoom.scale * 1.1));
            }}
            disabled={zoom.scale >= PAGE_BUILDER_ZOOM_MAX - 0.01}
            className="grid h-5 w-5 place-items-center rounded text-neutral-500 transition hover:bg-neutral-800 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-30"
            title="Aumentar zoom do canvas"
            aria-label="Aumentar zoom"
          >
            <Plus size={10} />
          </button>
        </div>
      </div>

      {/* Selection info */}
      {selectedPageNodeId && findPageNode(page.children, selectedPageNodeId) && (
        <div className="border-t border-neutral-800 px-2 py-1 text-[9px] text-neutral-500">
          {findPageNode(page.children, selectedPageNodeId)?.name}
        </div>
      )}
    </div>
  );
}
