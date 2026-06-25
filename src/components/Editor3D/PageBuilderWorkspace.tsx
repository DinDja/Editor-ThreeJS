'use client';

import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Copy, Grip, MousePointer2, Plus, Trash2 } from 'lucide-react';
import PageExperience from './PageExperience';
import { findPageNode } from '@/lib/page-builder/tree';
import type { PageNodeType, PageStyle } from '@/lib/page-builder/types';
import { useExperienceStore } from '@/store/experienceStore';

const canvasAddTypes: Array<{ type: PageNodeType; label: string }> = [
  { type: 'section', label: 'Section' },
  { type: 'container', label: 'Container' },
  { type: 'text', label: 'Text' },
  { type: 'button', label: 'Button' },
  { type: 'card', label: 'Card' },
];

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

const SNAP_SIZE = 8;
const snapValue = (value: number) => Math.round(value / SNAP_SIZE) * SNAP_SIZE;

const getPageNodeElement = (id: string | null) => {
  if (!id || typeof document === 'undefined') return null;
  return Array.from(document.querySelectorAll<HTMLElement>('[data-experience-node]'))
    .find((element) => element.dataset.experienceNode === id) ?? null;
};

export default function PageBuilderWorkspace() {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const page = useExperienceStore((state) => state.page);
  const interactions = useExperienceStore((state) => state.interactions);
  const selectedPageNodeId = useExperienceStore((state) => state.selectedPageNodeId);
  const setSelectedPageNode = useExperienceStore((state) => state.setSelectedPageNode);
  const addPageNode = useExperienceStore((state) => state.addPageNode);
  const updatePageNodeProps = useExperienceStore((state) => state.updatePageNodeProps);
  const updatePageNodeStyle = useExperienceStore((state) => state.updatePageNodeStyle);
  const duplicatePageNode = useExperienceStore((state) => state.duplicatePageNode);
  const removePageNode = useExperienceStore((state) => state.removePageNode);
  const movePageNode = useExperienceStore((state) => state.movePageNode);
  const selectedNode = useMemo(() => findPageNode(page.children, selectedPageNodeId), [page, selectedPageNodeId]);

  const refreshSelectionRect = useCallback(() => {
    const element = getPageNodeElement(selectedPageNodeId);
    if (!element) {
      setSelectionRect(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    setSelectionRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
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
      setSelectionRect({
        ...drag.startRect,
        left: drag.startRect.left + nextLeft - drag.startLeft,
        top: drag.startRect.top + nextTop - drag.startTop,
      });
      return;
    }

    const nextWidth = drag.mode === 'resize-east' || drag.mode === 'resize-south-east'
      ? Math.max(24, snapValue(drag.startWidth + deltaX))
      : drag.startWidth;
    const nextHeight = drag.mode === 'resize-south' || drag.mode === 'resize-south-east'
      ? Math.max(24, snapValue(drag.startHeight + deltaY))
      : drag.startHeight;

    updatePageNodeStyle(selectedNode.id, {
      width: nextWidth,
      height: nextHeight,
    } as Partial<PageStyle>);
    setSelectionRect({
      ...drag.startRect,
      width: nextWidth,
      height: nextHeight,
    });
  }, [selectedNode, updatePageNodeStyle]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(refreshSelectionRect);
    return () => window.cancelAnimationFrame(frame);
  }, [page, refreshSelectionRect]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => moveSelectedWithPointer(event);
    const onPointerUp = () => {
      dragStateRef.current = null;
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

  return (
    <div ref={workspaceRef} className="h-full overflow-auto bg-[#0d0f10] p-5" onScroll={refreshSelectionRect}>
      <div className="sticky top-0 z-20 mx-auto mb-3 flex max-w-[1440px] flex-wrap items-center gap-2 rounded-md border border-neutral-800 bg-[#151719]/95 p-2 shadow-xl backdrop-blur">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-neutral-400">
          <MousePointer2 size={14} className="shrink-0 text-emerald-300" />
          <span className="truncate">
            {selectedNode
              ? `${selectedNode.name} / ${selectedNode.type}${selectionRect ? ` / ${Math.round(selectionRect.width)}x${Math.round(selectionRect.height)}` : ''}`
              : 'Selecione um elemento na pagina'}
          </span>
        </div>
        {selectedNode && (
          <>
            <button
              type="button"
              onClick={() => duplicatePageNode(selectedNode.id)}
              className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-700/60 px-2.5 text-[11px] text-neutral-300 transition hover:border-emerald-400/50 hover:text-emerald-200"
            >
              <Copy size={12} />
              Duplicar
            </button>
            <button
              type="button"
              onClick={() => removePageNode(selectedNode.id)}
              className="flex h-8 items-center gap-1.5 rounded-md border border-red-400/25 px-2.5 text-[11px] text-red-300 transition hover:border-red-400/60 hover:bg-red-400/8"
            >
              <Trash2 size={12} />
              Remover
            </button>
            <button
              type="button"
              onClick={() => movePageNode(selectedNode.id, 'up')}
              className="h-8 rounded-md border border-neutral-700/60 px-2.5 text-[11px] text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
            >
              Subir
            </button>
            <button
              type="button"
              onClick={() => movePageNode(selectedNode.id, 'down')}
              className="h-8 rounded-md border border-neutral-700/60 px-2.5 text-[11px] text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
            >
              Descer
            </button>
          </>
        )}
        <div className="h-5 w-px bg-neutral-800" />
        {canvasAddTypes.map((item) => (
          <button
            key={item.type}
            type="button"
            onClick={() => addPageNode(item.type, selectedPageNodeId)}
            className="flex h-8 items-center gap-1 rounded-md border border-neutral-700/60 px-2.5 text-[11px] text-neutral-300 transition hover:border-emerald-400/50 hover:text-emerald-200"
          >
            <Plus size={12} />
            {item.label}
          </button>
        ))}
      </div>

      <div
        className="mx-auto min-h-full w-full max-w-[1440px] overflow-hidden rounded-md border border-neutral-800 bg-[#101214] shadow-2xl"
        onClick={() => setSelectedPageNode(null)}
      >
        <PageExperience
          page={page}
          interactions={interactions}
          selectedNodeId={selectedPageNodeId}
          mode="edit"
          device="desktop"
          onSelectNode={setSelectedPageNode}
          onUpdateNodeProps={updatePageNodeProps}
          onDuplicateNode={duplicatePageNode}
          onRemoveNode={removePageNode}
        />
      </div>
      {selectedNode && selectionRect && (
        <div
          className="pointer-events-none fixed z-40 border border-emerald-300/90 shadow-[0_0_0_1px_rgba(16,185,129,0.22),0_0_34px_rgba(16,185,129,0.16)]"
          style={{
            left: selectionRect.left,
            top: selectionRect.top,
            width: selectionRect.width,
            height: selectionRect.height,
          }}
        >
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-emerald-300/20" />
          <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-emerald-300/20" />
          <div className="absolute -top-6 left-0 rounded border border-neutral-700 bg-neutral-950 px-1.5 py-0.5 text-[10px] font-medium text-neutral-300">
            {Math.round(selectionRect.width)} x {Math.round(selectionRect.height)}
          </div>
          <button
            type="button"
            onPointerDown={(event) => startHandleDrag('move', event)}
            className="pointer-events-auto absolute left-1/2 top-0 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded border border-emerald-300/70 bg-neutral-950 text-emerald-200 shadow-lg transition hover:bg-emerald-400 hover:text-neutral-950"
            title="Mover"
          >
            <Grip size={12} />
          </button>
          <button
            type="button"
            onPointerDown={(event) => startHandleDrag('resize-east', event)}
            className="pointer-events-auto absolute right-0 top-1/2 h-8 w-3 -translate-y-1/2 translate-x-1/2 rounded border border-emerald-300/70 bg-neutral-950 transition hover:bg-emerald-300"
            title="Redimensionar largura"
          />
          <button
            type="button"
            onPointerDown={(event) => startHandleDrag('resize-south', event)}
            className="pointer-events-auto absolute bottom-0 left-1/2 h-3 w-8 -translate-x-1/2 translate-y-1/2 rounded border border-emerald-300/70 bg-neutral-950 transition hover:bg-emerald-300"
            title="Redimensionar altura"
          />
          <button
            type="button"
            onPointerDown={(event) => startHandleDrag('resize-south-east', event)}
            className="pointer-events-auto absolute bottom-0 right-0 h-4 w-4 translate-x-1/2 translate-y-1/2 rounded border border-emerald-300/80 bg-neutral-950 transition hover:bg-emerald-300"
            title="Redimensionar"
          />
        </div>
      )}
    </div>
  );
}
