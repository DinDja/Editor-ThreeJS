'use client';

import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Copy, Grip, Monitor, MousePointer2, Plus, Smartphone, Tablet, Trash2, Maximize2 } from 'lucide-react';
import PageExperience from './PageExperience';
import { findPageNode, findParentPageNode, flattenPageNodes } from '@/lib/page-builder/tree';
import type { PageNode, PageStyle } from '@/lib/page-builder/types';
import { computeAlignmentGuides, type AlignmentGuide, type Rect } from '@/lib/page-builder/alignment';
import { useExperienceStore } from '@/store/experienceStore';
import { SegmentedControl } from './ui/primitives';

type Viewport = 'fluid' | 'desktop' | 'tablet' | 'mobile';

const viewportWidths: Record<Viewport, number | null> = {
  fluid: null,
  desktop: 1280,
  tablet: 820,
  mobile: 390,
};

const numberFromCss = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
};

type SelectionRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type DragMode = 'move' | 'resize-east' | 'resize-south' | 'resize-south-east';

type DragState = {
  mode: DragMode;
  pointerX: number;
  pointerY: number;
  startRect: SelectionRect;
  startLeft: number;
  startTop: number;
  startWidth: number;
  startHeight: number;
};

type HoverInfo = {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  rect: SelectionRect;
};

const SNAP_SIZE = 8;
const snapValue = (value: number) => Math.round(value / SNAP_SIZE) * SNAP_SIZE;

const getPageNodeElement = (id: string | null) => {
  if (!id || typeof document === 'undefined') return null;
  return Array.from(document.querySelectorAll<HTMLElement>('[data-experience-node]'))
    .find((element) => element.dataset.experienceNode === id) ?? null;
};

const buildAncestorChain = (pageChildren: PageNode[], id: string | null): Array<{ id: string; name: string; type: string }> => {
  if (!id) return [];
  const allNodes = flattenPageNodes({ id: 'page', type: 'page' as const, name: 'Page', children: pageChildren, responsive: [{ name: 'desktop', width: 1280 }, { name: 'tablet', width: 820 }, { name: 'mobile', width: 390 }] });
  const chain: Array<{ id: string; name: string; type: string }> = [];
  let currentId: string | null = id;
  while (currentId) {
    const entry = allNodes.find((n) => n.node.id === currentId);
    if (!entry) break;
    chain.unshift({ id: entry.node.id, name: entry.node.name, type: entry.node.type });
    currentId = entry.parentId;
  }
  return chain;
};

export default function PageBuilderWorkspace() {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [viewport, setViewport] = useState<Viewport>('fluid');
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const page = useExperienceStore((state) => state.page);
  const interactions = useExperienceStore((state) => state.interactions);
  const selectedPageNodeId = useExperienceStore((state) => state.selectedPageNodeId);
  const previewPseudo = useExperienceStore((state) => state.previewPseudo);
  const setSelectedPageNode = useExperienceStore((state) => state.setSelectedPageNode);
  const selectParentPageNode = useExperienceStore((state) => state.selectParentPageNode);
  const updatePageNodeProps = useExperienceStore((state) => state.updatePageNodeProps);
  const updatePageNodeStyle = useExperienceStore((state) => state.updatePageNodeStyle);
  const duplicatePageNode = useExperienceStore((state) => state.duplicatePageNode);
  const removePageNode = useExperienceStore((state) => state.removePageNode);
  const movePageNode = useExperienceStore((state) => state.movePageNode);
  const selectedNode = useMemo(() => findPageNode(page.children, selectedPageNodeId), [page, selectedPageNodeId]);
  const breadcrumb = useMemo(() => buildAncestorChain(page.children, selectedPageNodeId), [page, selectedPageNodeId]);
  const hasElements = page.children.length > 0;
  const viewportWidth = viewportWidths[viewport];

  const refreshSelectionRect = useCallback(() => {
    const element = getPageNodeElement(selectedPageNodeId);
    const workspace = workspaceRef.current;
    if (!element || !workspace) {
      setSelectionRect(null);
      return;
    }

    const elRect = element.getBoundingClientRect();
    const wsRect = workspace.getBoundingClientRect();
    setSelectionRect({
      top: elRect.top - wsRect.top,
      left: elRect.left - wsRect.left,
      width: elRect.width,
      height: elRect.height,
    });
  }, [selectedPageNodeId]);

  const nudgeSelectedNode = useCallback((deltaX: number, deltaY: number) => {
    if (!selectedNode) return;
    const style = selectedNode.styles.base;
    const position = style.position && style.position !== 'static' ? style.position : 'relative';
    updatePageNodeStyle(selectedNode.id, {
      position,
      left: numberFromCss(style.left) + deltaX,
      top: numberFromCss(style.top) + deltaY,
    } as Partial<PageStyle>);
  }, [selectedNode, updatePageNodeStyle]);

  const startHandleDrag = (mode: DragMode, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!selectedNode || !selectionRect) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const style = selectedNode.styles.base;
    dragStateRef.current = {
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startRect: selectionRect,
      startLeft: numberFromCss(style.left),
      startTop: numberFromCss(style.top),
      startWidth: numberFromCss(style.width) || selectionRect.width,
      startHeight: numberFromCss(style.height) || selectionRect.height,
    };
  };

  const computeAndSetGuides = useCallback((targetRect: { left: number; top: number; width: number; height: number }) => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const wsRect = workspace.getBoundingClientRect();
    const descendantIds = new Set<string>();
    if (selectedPageNodeId) {
      const selected = findPageNode(page.children, selectedPageNodeId);
      if (selected?.children) {
        const collectDescendants = (nodes: PageNode[]) => {
          for (const node of nodes) {
            descendantIds.add(node.id);
            if (node.children) collectDescendants(node.children);
          }
        };
        collectDescendants(selected.children);
      }
    }
    const candidates: Rect[] = [];
    const elements = workspace.querySelectorAll<HTMLElement>('[data-experience-node]');
    for (const el of elements) {
      const id = el.dataset.experienceNode;
      if (!id || id === selectedPageNodeId || descendantIds.has(id)) continue;
      const elRect = el.getBoundingClientRect();
      candidates.push({
        top: elRect.top - wsRect.top,
        left: elRect.left - wsRect.left,
        width: elRect.width,
        height: elRect.height,
      });
    }
    const guides = computeAlignmentGuides(targetRect as Rect, candidates);
    setAlignmentGuides(guides.length > 0 ? guides : []);
  }, [page.children, selectedPageNodeId]);

  const moveSelectedWithPointer = useCallback((event: PointerEvent) => {
    const drag = dragStateRef.current;
    if (!drag || !selectedNode) return;
    const deltaX = event.clientX - drag.pointerX;
    const deltaY = event.clientY - drag.pointerY;

    if (drag.mode === 'move') {
      const nextLeft = snapValue(drag.startLeft + deltaX);
      const nextTop = snapValue(drag.startTop + deltaY);
      updatePageNodeStyle(selectedNode.id, {
        position: selectedNode.styles.base.position && selectedNode.styles.base.position !== 'static'
          ? selectedNode.styles.base.position
          : 'relative',
        left: nextLeft,
        top: nextTop,
      } as Partial<PageStyle>);
      const updatedRect = {
        ...drag.startRect,
        left: drag.startRect.left + nextLeft - drag.startLeft,
        top: drag.startRect.top + nextTop - drag.startTop,
      };
      setSelectionRect(updatedRect);
      computeAndSetGuides(updatedRect);
      return;
    }

    const nextWidth = drag.mode === 'resize-east' || drag.mode === 'resize-south-east'
      ? Math.max(24, snapValue(drag.startWidth + deltaX))
      : drag.startWidth;
    const nextHeight = drag.mode === 'resize-south' || drag.mode === 'resize-south-east'
      ? Math.max(24, snapValue(drag.startHeight + deltaY))
      : drag.startHeight;

    const updatedRect = {
      ...drag.startRect,
      width: nextWidth,
      height: nextHeight,
    };
    updatePageNodeStyle(selectedNode.id, {
      width: nextWidth,
      height: nextHeight,
    } as Partial<PageStyle>);
    setSelectionRect(updatedRect);
    computeAndSetGuides(updatedRect);
  }, [computeAndSetGuides, selectedNode, updatePageNodeStyle]);

  const handleCanvasPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const nodeEl = target.closest('[data-experience-node]') as HTMLElement | null;
    if (!nodeEl) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      setHoverInfo(null);
      return;
    }
    const id = nodeEl.dataset.experienceNode;
    const type = nodeEl.dataset.nodeType;
    if (!id || !type) {
      setHoverInfo(null);
      return;
    }
    if (id === selectedPageNodeId) {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      setHoverInfo(null);
      return;
    }
    const node = findPageNode(page.children, id);
    if (!node) {
      setHoverInfo(null);
      return;
    }

    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      const rect = nodeEl.getBoundingClientRect();
      const wsRect = workspaceRef.current?.getBoundingClientRect();
      if (!wsRect) return;
      setHoverInfo({
        id,
        name: node.name,
        type,
        x: event.clientX - wsRect.left + 14,
        y: event.clientY - wsRect.top - 10,
        rect: { top: rect.top - wsRect.top, left: rect.left - wsRect.left, width: rect.width, height: rect.height },
      });
    }, 60);
  }, [page, selectedPageNodeId]);

  const handleCanvasPointerLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoverInfo(null);
  }, []);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(refreshSelectionRect);
    return () => window.cancelAnimationFrame(frame);
  }, [page, refreshSelectionRect, viewport]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => moveSelectedWithPointer(event);
    const onPointerUp = () => {
      dragStateRef.current = null;
      setAlignmentGuides([]);
      refreshSelectionRect();
    };
    const onResize = () => refreshSelectionRect();

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
    };
  }, [moveSelectedWithPointer, refreshSelectionRect]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!selectedPageNodeId || isTypingTarget(event.target)) return;
      const step = event.shiftKey ? 10 : 1;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        removePageNode(selectedPageNodeId);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicatePageNode(selectedPageNodeId);
        return;
      }

      if (event.key === 'Escape') {
        setSelectedPageNode(null);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        nudgeSelectedNode(0, -step);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        nudgeSelectedNode(0, step);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        nudgeSelectedNode(-step, 0);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        nudgeSelectedNode(step, 0);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [duplicatePageNode, nudgeSelectedNode, removePageNode, selectedPageNodeId, setSelectedPageNode]);

  const frameStyle: React.CSSProperties = viewportWidth
    ? { width: viewportWidth, maxWidth: '100%' }
    : { width: '100%', maxWidth: 1440 };

  return (
    <div
      ref={workspaceRef}
      data-tutorial="page-builder-workspace"
      className="relative h-full overflow-hidden"
    >
      {/* Scrollable content area */}
      <div
        className="ed-canvas-backdrop ed-scroll h-full overflow-auto"
        onScroll={refreshSelectionRect}
      >
        {/* Top contextual bar */}
        <div data-tutorial="page-topbar" className="sticky top-0 z-20 mx-2 my-4 flex max-w-[1440px] flex-wrap items-center gap-2 rounded-xl border border-neutral-800/80 bg-[#151719]/95 p-2 shadow-2xl backdrop-blur">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-neutral-400">
            <MousePointer2 size={14} className="shrink-0 text-emerald-300" />
            <span className="truncate">
              {selectedNode
                ? `${selectedNode.name} · ${selectedNode.type}${selectionRect ? ` · ${Math.round(selectionRect.width)}×${Math.round(selectionRect.height)}` : ''}`
                : 'Selecione um elemento na página'}
            </span>
          </div>

          <div data-tutorial="page-device-preview">
            <SegmentedControl
              size="sm"
              value={viewport}
              onChange={(v) => setViewport(v as Viewport)}
              options={[
                { value: 'fluid', label: <Maximize2 size={12} />, title: 'Fluido' },
                { value: 'desktop', label: <Monitor size={12} />, title: 'Desktop 1280' },
                { value: 'tablet', label: <Tablet size={12} />, title: 'Tablet 820' },
                { value: 'mobile', label: <Smartphone size={12} />, title: 'Mobile 390' },
              ]}
            />
          </div>

          {selectedNode && (
            <>
              <div className="h-5 w-px bg-neutral-800" />
              <button
                type="button"
                onClick={() => duplicatePageNode(selectedNode.id)}
                className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-700/60 px-2.5 text-[11px] text-neutral-300 transition hover:border-emerald-400/50 hover:text-emerald-200"
                title="Duplicar (Ctrl+D)"
              >
                <Copy size={12} />
                Duplicar
              </button>
              <button
                type="button"
                onClick={() => movePageNode(selectedNode.id, 'up')}
                className="h-8 rounded-md border border-neutral-700/60 px-2.5 text-[11px] text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
                title="Mover para cima"
              >
                Subir
              </button>
              <button
                type="button"
                onClick={() => movePageNode(selectedNode.id, 'down')}
                className="h-8 rounded-md border border-neutral-700/60 px-2.5 text-[11px] text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
                title="Mover para baixo"
              >
                Descer
              </button>
              <button
                type="button"
                onClick={() => removePageNode(selectedNode.id)}
                className="flex h-8 items-center gap-1.5 rounded-md border border-red-400/25 px-2.5 text-[11px] text-red-300 transition hover:border-red-400/60 hover:bg-red-400/[0.08]"
                title="Remover (Delete)"
              >
                <Trash2 size={12} />
                Remover
              </button>
            </>
          )}
        </div>

        {/* Canvas frame */}
        <div className="mx-auto flex min-h-full justify-center px-5 pb-10">
          <div
            data-tutorial="page-canvas"
            className="relative w-full overflow-hidden rounded-xl border border-neutral-800 bg-[#101214] shadow-2xl transition-[width] duration-300"
            style={frameStyle}
            onClick={() => setSelectedPageNode(null)}
            onPointerMove={handleCanvasPointerMove}
            onPointerLeave={handleCanvasPointerLeave}
          >
            {/* ruler bar */}
            <div className="ed-ruler flex h-5 items-center justify-between border-b border-neutral-800/70 bg-[#0d0f10] px-3 text-[9px] font-medium uppercase tracking-[0.16em] text-neutral-600">
              <span>Página</span>
              <span>{viewportWidth ? `${viewportWidth}px` : 'Fluido'}</span>
            </div>

            {hasElements ? (
              <PageExperience
                page={page}
                interactions={interactions}
                selectedNodeId={selectedPageNodeId}
                mode="edit"
                activeBreakpoint="base"
                previewPseudo={previewPseudo}
                onSelectNode={setSelectedPageNode}
                onSelectParentNode={selectParentPageNode}
                onUpdateNodeProps={updatePageNodeProps}
                onDuplicateNode={duplicatePageNode}
                onRemoveNode={removePageNode}
              />
            ) : (
              <div className="grid min-h-[420px] place-items-center px-6 text-center">
                <div className="grid gap-3">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-neutral-800 bg-neutral-950/60 text-neutral-600">
                    <Plus size={22} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-neutral-300">Página vazia</p>
                    <p className="max-w-[280px] text-[11px] leading-4 text-neutral-500">
                      Use o menu <span className="font-medium text-emerald-300">Inserir</span> na toolbar ou um template para começar a montar sua página.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlays - outside scroll, absolute to workspace */}
      {/* Alignment guides */}
      {alignmentGuides.map((guide, i) => {
        const isVertical = guide.axis === 'left' || guide.axis === 'centerX' || guide.axis === 'right';
        const isCenter = guide.axis === 'centerX' || guide.axis === 'centerY';
        const color = isCenter ? 'border-cyan-400/60' : 'border-rose-400/60';
        return isVertical ? (
          <div
            key={`guide-${i}`}
            className={`pointer-events-none absolute z-40 border-l ${color}`}
            style={{
              left: guide.value,
              top: guide.start,
              height: guide.end - guide.start,
            }}
          />
        ) : (
          <div
            key={`guide-${i}`}
            className={`pointer-events-none absolute z-40 border-t ${color}`}
            style={{
              left: guide.start,
              top: guide.value,
              width: guide.end - guide.start,
            }}
          />
        );
      })}

      {/* Hover tooltip */}
      {hoverInfo && (
        <div
          className="pointer-events-none absolute z-50 flex items-center gap-1.5 rounded-md border border-neutral-700/60 bg-neutral-950/90 px-2 py-1 text-[10px] font-medium text-neutral-200 shadow-xl backdrop-blur-sm"
          style={{ left: hoverInfo.x, top: hoverInfo.y }}
        >
          <span className="rounded bg-sky-400/15 px-1 py-0.5 text-[9px] uppercase tracking-wider text-sky-300">{hoverInfo.type}</span>
          <span>{hoverInfo.name}</span>
        </div>
      )}

      {/* Hover outline (blue) */}
      {hoverInfo && hoverInfo.id !== selectedPageNodeId && (
        <div
          className="pointer-events-none absolute z-30 border border-sky-400/70 bg-sky-400/[0.04]"
          style={{
            left: hoverInfo.rect.left,
            top: hoverInfo.rect.top,
            width: hoverInfo.rect.width,
            height: hoverInfo.rect.height,
          }}
        />
      )}

      {/* Selection box */}
      {selectedNode && selectionRect && breadcrumb.length > 0 && (
        <div
          data-tutorial="page-selection-handles"
          className="ed-select-glow pointer-events-none absolute z-40 border-2 border-emerald-300/90"
          style={{
            left: selectionRect.left,
            top: selectionRect.top,
            width: selectionRect.width,
            height: selectionRect.height,
          }}
        >
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-emerald-300/15" />
          <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-emerald-300/15" />

          {/* dimension label */}
          <div className="absolute -top-7 left-0 flex items-center gap-1.5 rounded-md border border-emerald-400/40 bg-neutral-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 shadow-lg">
            <span className="rounded bg-emerald-400/15 px-1 py-0.5 text-[9px] uppercase text-emerald-300">{selectedNode.type}</span>
            <span>{Math.round(selectionRect.width)} × {Math.round(selectionRect.height)}</span>
          </div>

          {selectedPageNodeId && findParentPageNode(page.children, selectedPageNodeId) && (
            <div className="absolute -top-7 right-0 rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-0.5 text-[9px] font-medium text-neutral-500">
              Alt+Click: pai
            </div>
          )}

          {/* breadcrumb */}
          <div className="absolute -bottom-6 left-0 flex max-w-full items-center gap-1 overflow-hidden text-[9px] text-neutral-500">
            {breadcrumb.map((item, index) => (
              <span key={item.id} className="flex shrink-0 items-center gap-1">
                {index > 0 && <span className="text-neutral-700">/</span>}
                <span className="rounded bg-neutral-800/90 px-1.5 py-0.5">{item.name}</span>
              </span>
            ))}
          </div>

          {/* move handle */}
          <button
            type="button"
            onPointerDown={(event) => startHandleDrag('move', event)}
            className="pointer-events-auto absolute left-1/2 top-0 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md border border-emerald-300/70 bg-neutral-950 text-emerald-200 shadow-lg transition hover:bg-emerald-400 hover:text-neutral-950"
            title="Mover"
            aria-label="Mover elemento"
          >
            <Grip size={12} />
          </button>
          {/* resize handles */}
          <button
            type="button"
            onPointerDown={(event) => startHandleDrag('resize-east', event)}
            className="pointer-events-auto absolute right-0 top-1/2 h-8 w-2.5 -translate-y-1/2 translate-x-1/2 rounded-sm border border-emerald-300/70 bg-neutral-950 transition hover:bg-emerald-300"
            title="Redimensionar largura"
            aria-label="Redimensionar largura"
          />
          <button
            type="button"
            onPointerDown={(event) => startHandleDrag('resize-south', event)}
            className="pointer-events-auto absolute bottom-0 left-1/2 h-2.5 w-8 -translate-x-1/2 translate-y-1/2 rounded-sm border border-emerald-300/70 bg-neutral-950 transition hover:bg-emerald-300"
            title="Redimensionar altura"
            aria-label="Redimensionar altura"
          />
          <button
            type="button"
            onPointerDown={(event) => startHandleDrag('resize-south-east', event)}
            className="pointer-events-auto absolute bottom-0 right-0 h-3.5 w-3.5 translate-x-1/2 translate-y-1/2 rounded-sm border border-emerald-300/80 bg-neutral-950 transition hover:bg-emerald-300"
            title="Redimensionar"
            aria-label="Redimensionar canto"
          />
        </div>
      )}
    </div>
  );
}
