'use client';

import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, ArrowDownToLine, ArrowUpToLine, ChevronsDown, ChevronsUp, Component as ComponentIcon, Copy, Eye, EyeOff, FileCode, Focus, Grid3X3, Grip, Group, Layers, Lock, LockOpen, Maximize2, Minus, Monitor, MousePointer2, Plus, Redo2, Smartphone, Tablet, Trash2, Undo2, Unlink, X } from 'lucide-react';
import PageExperience from './PageExperience';
import { findPageNode, findParentPageNode, flattenPageNodes } from '@/lib/page-builder/tree';
import type { PageNode, PageStyle } from '@/lib/page-builder/types';
import { computeAlignmentGuides, type AlignmentGuide, type Rect } from '@/lib/page-builder/alignment';
import { useEditorPreferences } from '@/lib/preferences/useEditorPreferences';
import FindNodeOverlay from './FindNodeOverlay';
import PageBuilderMiniMap from './PageBuilderMiniMap';
import { useExperienceStore } from '@/store/experienceStore';
import { usePageHistoryStore } from '@/store/pageHistoryStore';
import { PAGE_BUILDER_DND_MIME, usePageBuilderDndStore, type DropTarget, type PageBuilderDragPayload } from '@/store/pageBuilderDndStore';
import { usePageBuilderViewModeStore } from '@/store/pageBuilderViewModeStore';
import { PAGE_BUILDER_ZOOM_MAX, PAGE_BUILDER_ZOOM_MIN, usePageBuilderViewportStore } from '@/store/pageBuilderViewportStore';
import { useContextMenu } from '@/store/contextMenuStore';
import { SegmentedControl } from './ui/primitives';
import PageBuilderContextMenu from './PageBuilderContextMenu';

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

type DragMode =
  | 'move'
  | 'resize-n' | 'resize-s' | 'resize-e' | 'resize-w'
  | 'resize-ne' | 'resize-nw' | 'resize-se' | 'resize-sw';

const RESIZE_AFFECTS = (mode: DragMode) => ({
  east: mode === 'resize-e' || mode === 'resize-ne' || mode === 'resize-se',
  west: mode === 'resize-w' || mode === 'resize-nw' || mode === 'resize-sw',
  south: mode === 'resize-s' || mode === 'resize-se' || mode === 'resize-sw',
  north: mode === 'resize-n' || mode === 'resize-ne' || mode === 'resize-nw',
});

const RESIZE_CURSOR: Record<Exclude<DragMode, 'move'>, string> = {
  'resize-n': 'ns-resize',
  'resize-s': 'ns-resize',
  'resize-e': 'ew-resize',
  'resize-w': 'ew-resize',
  'resize-ne': 'nesw-resize',
  'resize-se': 'nwse-resize',
  'resize-nw': 'nwse-resize',
  'resize-sw': 'nesw-resize',
};

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

const toCssNumber = (value: number | string | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const getPageNodeElement = (id: string | null) => {
  if (!id || typeof document === 'undefined') return null;
  return Array.from(document.querySelectorAll<HTMLElement>('[data-experience-node]'))
    .find((element) => element.dataset.experienceNode === id) ?? null;
};

const LEAF_NODE_TYPES = new Set([
  'text',
  'button',
  'image',
  'video',
  'sceneCanvas',
  'input',
  'select',
  'textarea',
  'label',
  'menuitem',
  'dataTable',
  'dataForm',
  'dataList',
  'dataChart',
  'dataStat',
]);

const resolveDropTarget = (
  event: React.DragEvent<HTMLElement>,
  canvasFrame: HTMLElement | null,
  payload: PageBuilderDragPayload | null,
): DropTarget | null => {
  if (!canvasFrame) return null;
  const nodeEl = (event.target as HTMLElement).closest<HTMLElement>('[data-experience-node]');
  if (!nodeEl) {
    return { kind: 'into', id: null };
  }
  const id = nodeEl.dataset.experienceNode ?? null;
  if (!id) return { kind: 'into', id: null };
  if (payload?.kind === 'move' && payload.id === id) {
    return null;
  }
  const nodeType = nodeEl.dataset.nodeType ?? '';
  if (LEAF_NODE_TYPES.has(nodeType)) {
    const parent = nodeEl.dataset.parentId || null;
    return { kind: 'into', id: parent };
  }
  const rect = nodeEl.getBoundingClientRect();
  const offsetY = event.clientY - rect.top;
  if (offsetY < rect.height * 0.25) {
    return { kind: 'before', id };
  }
  if (offsetY > rect.height * 0.75) {
    return { kind: 'after', id };
  }
  return { kind: 'into', id };
};

type DropIndicatorRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const computeDropIndicator = (
  hover: DropTarget,
  payload: PageBuilderDragPayload,
  canvasFrame: HTMLElement | null,
): DropIndicatorRect | null => {
  if (!canvasFrame) return null;
  const frameRect = canvasFrame.getBoundingClientRect();
  if (hover.kind === 'into' && hover.id === null) {
    return {
      top: 0,
      left: 0,
      width: frameRect.width,
      height: frameRect.height,
    };
  }
  const el = getPageNodeElement(hover.id);
  if (!el) return null;
  const elRect = el.getBoundingClientRect();
  if (hover.kind === 'into') {
    return {
      top: elRect.top - frameRect.top,
      left: elRect.left - frameRect.left,
      width: elRect.width,
      height: elRect.height,
    };
  }
  return {
    top: hover.kind === 'before' ? elRect.top - frameRect.top : elRect.bottom - frameRect.top,
    left: elRect.left - frameRect.left,
    width: elRect.width,
    height: 0,
  };
  // Reference payload to keep the helper signature consistent.
  void payload;
};

const applyDrop = (
  target: DropTarget,
  payload: PageBuilderDragPayload,
  pageChildren: PageNode[],
) => {
  if (payload.kind === 'new') {
    const state = useExperienceStore.getState();
    const parentId = target.kind === 'into' ? target.id : findParentPageNode(pageChildren, target.id)?.id ?? null;
    if (parentId) {
      const parent = findPageNode(state.page.children, parentId);
      if (parent && LEAF_NODE_TYPES.has(parent.type)) return;
    }
    state.addPageNode(payload.type, parentId);
    return;
  }
  // payload.kind === 'move' (reparent)
  const id = payload.id;
  if (target.kind === 'into') {
    useExperienceStore.getState().reparentPageNode(id, target.id);
  } else {
    useExperienceStore.getState().movePageNode(id, target.kind === 'before' ? 'up' : 'down');
  }
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
  const canvasFrameRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const dndPayload = usePageBuilderDndStore((state) => state.payload);
  const dndHover = usePageBuilderDndStore((state) => state.hover);
  const setDndHover = usePageBuilderDndStore((state) => state.setHover);
  const endDnd = usePageBuilderDndStore((state) => state.endDrag);
  const [dropIndicator, setDropIndicator] = useState<DropIndicatorRect | null>(null);
  const [marquee, setMarquee] = useState<SelectionRect | null>(null);
  const [multiSelectRect, setMultiSelectRect] = useState<SelectionRect | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const marqueeAdditiveRef = useRef<boolean>(false);
  const { preferences, setViewport } = useEditorPreferences();
  const viewport = preferences.pageBuilderViewport;
  const undoStackSize = usePageHistoryStore((state) => state.undoStack.length);
  const redoStackSize = usePageHistoryStore((state) => state.redoStack.length);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const page = useExperienceStore((state) => state.page);
  const interactions = useExperienceStore((state) => state.interactions);
  const selectedPageNodeId = useExperienceStore((state) => state.selectedPageNodeId);
  const previewPseudo = useExperienceStore((state) => state.previewPseudo);
  const selectParentPageNode = useExperienceStore((state) => state.selectParentPageNode);
  const updatePageNodeProps = useExperienceStore((state) => state.updatePageNodeProps);
  const updatePageNodeStyle = useExperienceStore((state) => state.updatePageNodeStyle);
  const duplicatePageNode = useExperienceStore((state) => state.duplicatePageNode);
  const removePageNode = useExperienceStore((state) => state.removePageNode);
  const movePageNode = useExperienceStore((state) => state.movePageNode);
  const togglePageNodeLock = useExperienceStore((state) => state.togglePageNodeLock);
  const togglePageNodeVisibility = useExperienceStore((state) => state.togglePageNodeVisibility);
  const pages = useExperienceStore((state) => state.pages);
  const activePageId = useExperienceStore((state) => state.activePageId);
  const setActivePage = useExperienceStore((state) => state.setActivePage);
  const addPage = useExperienceStore((state) => state.addPage);
  const removePage = useExperienceStore((state) => state.removePage);
  const selectedNodeIds = useExperienceStore((state) => state.selectedPageNodeIds);
  const setSelectedPageNode = useExperienceStore((state) => state.setSelectedPageNode);
  const toggleSelectedPageNode = useExperienceStore((state) => state.toggleSelectedPageNode);
  const clearSelectedPageNodes = useExperienceStore((state) => state.clearSelectedPageNodes);
  const setPageNodesLock = useExperienceStore((state) => state.setPageNodesLock);
  const setPageNodesVisibility = useExperienceStore((state) => state.setPageNodesVisibility);
  const removePageNodes = useExperienceStore((state) => state.removePageNodes);
  const duplicatePageNodes = useExperienceStore((state) => state.duplicatePageNodes);
  const movePageNodes = useExperienceStore((state) => state.movePageNodes);
  const reorderPageNodes = useExperienceStore((state) => state.reorderPageNodes);
  const alignPageNodes = useExperienceStore((state) => state.alignPageNodes);
  const distributePageNodes = useExperienceStore((state) => state.distributePageNodes);
  const wrapPageNodesInContainer = useExperienceStore((state) => state.wrapPageNodesInContainer);
  const createComponentFromSelection = useExperienceStore((state) => state.createComponentFromSelection);
  const detachComponentInstance = useExperienceStore((state) => state.detachComponentInstance);
  const zoom = usePageBuilderViewportStore((state) => state.zoom);
  const setScale = usePageBuilderViewportStore((state) => state.setScale);
  const setOffset = usePageBuilderViewportStore((state) => state.setOffset);
  const resetViewport = usePageBuilderViewportStore((state) => state.reset);
  const viewBackground = usePageBuilderViewModeStore((state) => state.background);
  const xrayMode = usePageBuilderViewModeStore((state) => state.xrayMode);
  const showOnlySelection = usePageBuilderViewModeStore((state) => state.showOnlySelection);
  const setBackground = usePageBuilderViewModeStore((state) => state.setBackground);
  const toggleXray = usePageBuilderViewModeStore((state) => state.toggleXray);
  const toggleShowOnlySelection = usePageBuilderViewModeStore((state) => state.toggleShowOnlySelection);
  const showContextMenu = useContextMenu((state) => state.show);
  const selectedNode = useMemo(() => findPageNode(page.children, selectedPageNodeId), [page, selectedPageNodeId]);
  const isMultiSelect = selectedNodeIds.length > 1;
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
    if (selectedNode.locked) return;
    const style = selectedNode.styles.base;
    const position = style.position && style.position !== 'static' ? style.position : 'relative';
    usePageHistoryStore.getState().beginTransaction();
    updatePageNodeStyle(selectedNode.id, {
      position,
      left: numberFromCss(style.left) + deltaX,
      top: numberFromCss(style.top) + deltaY,
    } as Partial<PageStyle>);
    usePageHistoryStore.getState().endTransaction();
  }, [selectedNode, updatePageNodeStyle]);

  const startHandleDrag = (mode: DragMode, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!selectedNode || !selectionRect) return;
    if (selectedNode.locked) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    usePageHistoryStore.getState().beginTransaction();
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

    const affects = RESIZE_AFFECTS(drag.mode);
    const MIN = 24;
    let nextWidth = drag.startWidth;
    let nextHeight = drag.startHeight;
    let nextLeft = drag.startLeft;
    let nextTop = drag.startTop;

    if (affects.east) {
      nextWidth = Math.max(MIN, drag.startWidth + deltaX);
    } else if (affects.west) {
      const proposed = Math.max(MIN, drag.startWidth - deltaX);
      // Keep the east edge fixed: shift left by the change in width
      nextLeft = drag.startLeft + (drag.startWidth - proposed);
      nextWidth = proposed;
    }

    if (affects.south) {
      nextHeight = Math.max(MIN, drag.startHeight + deltaY);
    } else if (affects.north) {
      const proposed = Math.max(MIN, drag.startHeight - deltaY);
      nextTop = drag.startTop + (drag.startHeight - proposed);
      nextHeight = proposed;
    }

    nextWidth = snapValue(nextWidth);
    nextHeight = snapValue(nextHeight);
    nextLeft = snapValue(nextLeft);
    nextTop = snapValue(nextTop);

    const updatedRect = {
      ...drag.startRect,
      left: nextLeft,
      top: nextTop,
      width: nextWidth,
      height: nextHeight,
    };
    updatePageNodeStyle(selectedNode.id, {
      width: nextWidth,
      height: nextHeight,
      left: nextLeft,
      top: nextTop,
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
    if (!node || node.hidden) {
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

  useLayoutEffect(() => {
    if (!isMultiSelect) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMultiSelectRect(null);
      return;
    }
    const workspace = workspaceRef.current;
    if (!workspace) {
       
      setMultiSelectRect(null);
      return;
    }
    const wsRect = workspace.getBoundingClientRect();
    let minLeft = Infinity;
    let minTop = Infinity;
    let maxRight = -Infinity;
    let maxBottom = -Infinity;
    let found = 0;
    for (const id of selectedNodeIds) {
      const el = getPageNodeElement(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      minLeft = Math.min(minLeft, r.left);
      minTop = Math.min(minTop, r.top);
      maxRight = Math.max(maxRight, r.right);
      maxBottom = Math.max(maxBottom, r.bottom);
      found += 1;
    }
    if (found === 0) {
       
      setMultiSelectRect(null);
      return;
    }
     
    setMultiSelectRect({
      left: minLeft - wsRect.left,
      top: minTop - wsRect.top,
      width: maxRight - minLeft,
      height: maxBottom - minTop,
    });
  }, [isMultiSelect, page, selectedNodeIds, viewport]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (marqueeStartRef.current && canvasFrameRef.current) {
        const frameRect = canvasFrameRef.current.getBoundingClientRect();
        const x = event.clientX - frameRect.left;
        const y = event.clientY - frameRect.top;
        const start = marqueeStartRef.current;
        setMarquee({
          top: Math.min(start.y, y),
          left: Math.min(start.x, x),
          width: Math.abs(x - start.x),
          height: Math.abs(y - start.y),
        });
        return;
      }
      moveSelectedWithPointer(event);
    };
    const onPointerUp = () => {
      if (dragStateRef.current) {
        usePageHistoryStore.getState().endTransaction();
      }
      dragStateRef.current = null;
      setAlignmentGuides([]);
      refreshSelectionRect();

      if (marqueeStartRef.current) {
        const frame = canvasFrameRef.current;
        const start = marqueeStartRef.current;
        marqueeStartRef.current = null;
        const currentMarquee = marquee;
        if (frame) {
          const frameRect = frame.getBoundingClientRect();
          const marqueeRect = {
            top: Math.min(start.y, (currentMarquee?.top ?? start.y) + (currentMarquee?.height ?? 0)) - frameRect.top,
            left: Math.min(start.x, (currentMarquee?.left ?? start.x) + (currentMarquee?.width ?? 0)) - frameRect.left,
            width: currentMarquee?.width ?? 0,
            height: currentMarquee?.height ?? 0,
          };
          // Resolve nodes that intersect the marquee
          const candidates = frame.querySelectorAll<HTMLElement>('[data-experience-node]');
          const intersectIds: string[] = [];
          const primaryId = useExperienceStore.getState().selectedPageNodeId;
          for (const el of candidates) {
            if (el.dataset.experienceNode === primaryId) continue;
            const r = el.getBoundingClientRect();
            const elLeft = r.left - frameRect.left;
            const elTop = r.top - frameRect.top;
            const elRight = elLeft + r.width;
            const elBottom = elTop + r.height;
            const mLeft = marqueeRect.left;
            const mTop = marqueeRect.top;
            const mRight = mLeft + marqueeRect.width;
            const mBottom = mTop + marqueeRect.height;
            const overlaps = !(elRight < mLeft || elLeft > mRight || elBottom < mTop || elTop > mBottom);
            if (overlaps && el.dataset.experienceNode) {
              intersectIds.push(el.dataset.experienceNode);
            }
          }
          const storeApi = useExperienceStore.getState();
          if (intersectIds.length > 0) {
            if (marqueeAdditiveRef.current) {
              const next = Array.from(new Set([...storeApi.selectedPageNodeIds, ...intersectIds]));
              storeApi.setSelectedPageNodes(next);
            } else {
              storeApi.setSelectedPageNodes(intersectIds);
            }
          } else if (!marqueeAdditiveRef.current) {
            storeApi.clearSelectedPageNodes();
          }
        }
        setMarquee(null);
      }
    };
    const onResize = () => refreshSelectionRect();
    const onGlobalDragEnd = () => {
      if (usePageBuilderDndStore.getState().payload) {
        usePageBuilderDndStore.getState().endDrag();
      }
      setDropIndicator(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', onResize);
    window.addEventListener('dragend', onGlobalDragEnd);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('dragend', onGlobalDragEnd);
    };
  }, [moveSelectedWithPointer, refreshSelectionRect, marquee]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setFindOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    let spacePressed = false;
    let panPointerId: number | null = null;
    let panLast = { x: 0, y: 0 };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !isTypingTarget(event.target)) {
        if (!spacePressed) {
          spacePressed = true;
        }
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        spacePressed = false;
        panPointerId = null;
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!spacePressed) return;
      if (event.button !== 0 && event.button !== 1) return;
      panPointerId = event.pointerId;
      panLast = { x: event.clientX, y: event.clientY };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!spacePressed || panPointerId === null || panPointerId !== event.pointerId) return;
      const dx = event.clientX - panLast.x;
      const dy = event.clientY - panLast.y;
      panLast = { x: event.clientX, y: event.clientY };
      const current = usePageBuilderViewportStore.getState().zoom;
      setOffset(current.offsetX + dx, current.offsetY + dy);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (panPointerId === event.pointerId) {
        panPointerId = null;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [setOffset]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Tab navigation between elements
      if (event.key === 'Tab' && !isTypingTarget(event.target)) {
        event.preventDefault();
        const flat = flattenPageNodes(page);
        const currentId = useExperienceStore.getState().selectedPageNodeId;
        const currentIndex = flat.findIndex((entry) => entry.node.id === currentId);
        let nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
        if (nextIndex < 0) nextIndex = flat.length - 1;
        if (nextIndex >= flat.length) nextIndex = 0;
        useExperienceStore.getState().setSelectedPageNode(flat[nextIndex].node.id);
        return;
      }
      // Enter: enter container (select first child)
      if (event.key === 'Enter' && !event.shiftKey) {
        const currentId = useExperienceStore.getState().selectedPageNodeId;
        const current = currentId ? findPageNode(page.children, currentId) : null;
        if (current && current.children && current.children.length > 0) {
          event.preventDefault();
          useExperienceStore.getState().setSelectedPageNode(current.children[0].id);
          return;
        }
      }
      const hasSelection = selectedNodeIds.length > 0;
      if (!hasSelection) return;
      if (isTypingTarget(event.target)) return;
      if (selectedNodeIds.some((id) => findPageNode(page.children, id)?.locked)) return;
      const step = event.shiftKey ? 10 : 1;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        if (selectedNodeIds.length > 1) {
          removePageNodes(selectedNodeIds);
        } else {
          removePageNode(selectedNodeIds[0]);
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        if (selectedNodeIds.length > 1) {
          duplicatePageNodes(selectedNodeIds);
        } else {
          duplicatePageNode(selectedNodeIds[0]);
        }
        return;
      }

      if (event.key === 'Escape') {
        clearSelectedPageNodes();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (selectedNodeIds.length > 1) {
          movePageNodes(selectedNodeIds, 'up');
        } else {
          nudgeSelectedNode(0, -step);
        }
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (selectedNodeIds.length > 1) {
          movePageNodes(selectedNodeIds, 'down');
        } else {
          nudgeSelectedNode(0, step);
        }
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (selectedNodeIds.length === 1) {
          nudgeSelectedNode(-step, 0);
        }
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (selectedNodeIds.length === 1) {
          nudgeSelectedNode(step, 0);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    duplicatePageNode,
    duplicatePageNodes,
    movePageNodes,
    nudgeSelectedNode,
    removePageNode,
    removePageNodes,
    selectedNode,
    selectedNodeIds,
    page.children,
    clearSelectedPageNodes,
  ]);

  const frameStyle: React.CSSProperties = viewportWidth
    ? { width: viewportWidth, maxWidth: '100%' }
    : { width: '100%', maxWidth: 1440 };

  return (
      <div
        ref={workspaceRef}
        data-tutorial="page-builder-workspace"
        className="relative h-full overflow-hidden"
        onContextMenu={(e) => e.preventDefault()}
      >
      {/* Scrollable content area */}
      <div
        className="ed-canvas-backdrop ed-scroll h-full overflow-auto"
        onScroll={refreshSelectionRect}
      >
        {/* Top contextual bar */}
        <div data-tutorial="page-topbar" className="sticky top-0 z-20 mx-2 my-4 flex max-w-[1440px] flex-col gap-2 rounded-xl border border-neutral-800/80 bg-[#151719]/95 p-2 shadow-2xl backdrop-blur">
          {/* Page tabs */}
          <div data-tutorial="page-tabs" className="flex max-w-full items-center gap-1 overflow-x-auto ed-scroll">
            {pages.map((pageDoc) => {
              const isActive = pageDoc.id === activePageId;
              return (
                <div
                  key={pageDoc.id}
                  className={`group flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition ${
                    isActive
                      ? 'border-emerald-400/45 bg-emerald-400/10 text-emerald-100'
                      : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setActivePage(pageDoc.id)}
                    className="flex min-w-0 items-center gap-1.5"
                    title={`${pageDoc.name} · ${pageDoc.path ?? '/'}`}
                  >
                    <FileCode size={10} className={isActive ? 'text-emerald-300' : 'text-neutral-600'} />
                    <span className="max-w-[140px] truncate">{pageDoc.name}</span>
                    <span className="hidden text-[9px] text-neutral-600 sm:inline">{pageDoc.path ?? '/'}</span>
                  </button>
                  {pages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remover a página "${pageDoc.name}"?`)) removePage(pageDoc.id);
                      }}
                      className={`grid h-4 w-4 place-items-center rounded text-neutral-600 transition hover:bg-red-500/15 hover:text-red-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      title="Remover página"
                      aria-label={`Remover página ${pageDoc.name}`}
                    >
                      <X size={9} />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => addPage()}
              data-tutorial="page-add-tab"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-emerald-400/30 bg-emerald-400/10 text-emerald-200 transition hover:border-emerald-300/60 hover:bg-emerald-400/15"
              title="Criar nova página"
              aria-label="Criar nova página"
            >
              <Plus size={11} />
            </button>
          </div>

          <div className="h-px bg-neutral-800/70" />

          <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-neutral-400">
            <MousePointer2 size={14} className="shrink-0 text-emerald-300" />
            <span className="truncate">
              {isMultiSelect
                ? `${selectedNodeIds.length} elementos selecionados`
                : selectedNode
                  ? `${selectedNode.name} · ${selectedNode.type}${selectionRect ? ` · ${Math.round(selectionRect.width)}×${Math.round(selectionRect.height)}` : ''} · X ${Math.round(toCssNumber(selectedNode.styles.base.left))} Y ${Math.round(toCssNumber(selectedNode.styles.base.top))}`
                  : 'Selecione um elemento na página'}
            </span>
          </div>

          <div data-tutorial="page-history" className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => usePageHistoryStore.getState().undo()}
              disabled={undoStackSize === 0}
              className="grid h-7 w-7 place-items-center rounded-md border border-neutral-700/60 bg-neutral-900/60 text-neutral-300 transition hover:border-emerald-400/40 hover:text-emerald-200 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-950/40 disabled:text-neutral-600 disabled:hover:border-neutral-800 disabled:hover:text-neutral-600"
              title="Desfazer (Ctrl+Z)"
              aria-label="Desfazer"
            >
              <Undo2 size={12} />
            </button>
            <button
              type="button"
              onClick={() => usePageHistoryStore.getState().redo()}
              disabled={redoStackSize === 0}
              className="grid h-7 w-7 place-items-center rounded-md border border-neutral-700/60 bg-neutral-900/60 text-neutral-300 transition hover:border-emerald-400/40 hover:text-emerald-200 disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-neutral-950/40 disabled:text-neutral-600 disabled:hover:border-neutral-800 disabled:hover:text-neutral-600"
              title="Refazer (Ctrl+Y)"
              aria-label="Refazer"
            >
              <Redo2 size={12} />
            </button>
          </div>

          <div className="h-5 w-px bg-neutral-800" />

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

          <div
            data-tutorial="page-zoom-controls"
            className="flex shrink-0 items-center gap-0.5 rounded-md border border-neutral-700/60 bg-neutral-900/40 p-0.5"
            title="Zoom (Ctrl+Scroll para zoom, Space+drag para pan)"
          >
            <button
              type="button"
              onClick={() => setScale(zoom.scale * 0.9)}
              disabled={zoom.scale <= PAGE_BUILDER_ZOOM_MIN + 0.01}
              className="grid h-7 w-7 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-30"
              title="Diminuir zoom"
              aria-label="Diminuir zoom"
            >
              <Minus size={12} />
            </button>
            <button
              type="button"
              onClick={resetViewport}
              className="grid h-7 min-w-[44px] place-items-center rounded px-1 text-[10px] font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-emerald-200"
              title="Resetar zoom (100%)"
            >
              {Math.round(zoom.scale * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setScale(zoom.scale * 1.1)}
              disabled={zoom.scale >= PAGE_BUILDER_ZOOM_MAX - 0.01}
              className="grid h-7 w-7 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-30"
              title="Aumentar zoom"
              aria-label="Aumentar zoom"
            >
              <Plus size={12} />
            </button>
          </div>

          <div
            data-tutorial="page-view-modes"
            className="flex shrink-0 items-center gap-0.5 rounded-md border border-neutral-700/60 bg-neutral-900/40 p-0.5"
            title="Modos de visualização"
          >
            <button
              type="button"
              onClick={() => setBackground(viewBackground === 'plain' ? 'dots' : viewBackground === 'dots' ? 'grid-8' : viewBackground === 'grid-8' ? 'grid-16' : 'plain')}
              className={`grid h-7 w-7 place-items-center rounded text-[9px] font-bold transition ${
                viewBackground !== 'plain' ? 'bg-emerald-400/15 text-emerald-200' : 'text-neutral-400 hover:bg-neutral-800 hover:text-emerald-200'
              }`}
              title={`Background: ${viewBackground}`}
              aria-label="Alternar background"
            >
              <Grid3X3 size={12} />
            </button>
            <button
              type="button"
              onClick={toggleXray}
              className={`grid h-7 w-7 place-items-center rounded text-[10px] font-bold transition ${
                xrayMode ? 'bg-emerald-400/15 text-emerald-200' : 'text-neutral-400 hover:bg-neutral-800 hover:text-emerald-200'
              }`}
              title="X-ray (apenas outlines)"
              aria-label="X-ray"
              aria-pressed={xrayMode}
            >
              <Eye size={12} />
            </button>
            <button
              type="button"
              onClick={toggleShowOnlySelection}
              className={`grid h-7 w-7 place-items-center rounded text-[10px] font-bold transition ${
                showOnlySelection ? 'bg-emerald-400/15 text-emerald-200' : 'text-neutral-400 hover:bg-neutral-800 hover:text-emerald-200'
              }`}
              title="Mostrar apenas seleção"
              aria-label="Apenas seleção"
              aria-pressed={showOnlySelection}
            >
              <Focus size={12} />
            </button>
          </div>

          {(selectedNode || isMultiSelect) && (
            <>
              <div className="h-5 w-px bg-neutral-800" />
              {isMultiSelect && (
                <span
                  data-tutorial="page-multiselect-count"
                  className="flex h-8 items-center gap-1.5 rounded-md border border-sky-400/40 bg-sky-400/10 px-2.5 text-[11px] font-semibold text-sky-200"
                >
                  <Layers size={12} />
                  {selectedNodeIds.length} elementos
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (isMultiSelect) duplicatePageNodes(selectedNodeIds);
                  else if (selectedNode) duplicatePageNode(selectedNode.id);
                }}
                className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-700/60 px-2.5 text-[11px] text-neutral-300 transition hover:border-emerald-400/50 hover:text-emerald-200"
                title="Duplicar (Ctrl+D)"
              >
                <Copy size={12} />
                Duplicar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isMultiSelect) movePageNodes(selectedNodeIds, 'up');
                  else if (selectedNode) movePageNode(selectedNode.id, 'up');
                }}
                className="h-8 rounded-md border border-neutral-700/60 px-2.5 text-[11px] text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
                title="Mover para cima"
              >
                Subir
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isMultiSelect) movePageNodes(selectedNodeIds, 'down');
                  else if (selectedNode) movePageNode(selectedNode.id, 'down');
                }}
                className="h-8 rounded-md border border-neutral-700/60 px-2.5 text-[11px] text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
                title="Mover para baixo"
              >
                Descer
              </button>
              {isMultiSelect && (
                <>
                  <div className="h-5 w-px bg-neutral-800" />
                  <div
                    data-tutorial="page-align-group"
                    className="flex shrink-0 items-center gap-0.5 rounded-md border border-neutral-700/60 bg-neutral-900/40 p-0.5"
                    title="Alinhar"
                  >
                    <button
                      type="button"
                      onClick={() => alignPageNodes(selectedNodeIds, 'left')}
                      className="grid h-7 w-7 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200"
                      title="Alinhar à esquerda"
                      aria-label="Alinhar à esquerda"
                    >
                      <AlignStartHorizontal size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => alignPageNodes(selectedNodeIds, 'centerX')}
                      className="grid h-7 w-7 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200"
                      title="Centralizar horizontal"
                      aria-label="Centralizar horizontal"
                    >
                      <AlignCenterHorizontal size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => alignPageNodes(selectedNodeIds, 'right')}
                      className="grid h-7 w-7 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200"
                      title="Alinhar à direita"
                      aria-label="Alinhar à direita"
                    >
                      <AlignEndHorizontal size={12} />
                    </button>
                    <span className="mx-0.5 h-4 w-px bg-neutral-800" />
                    <button
                      type="button"
                      onClick={() => alignPageNodes(selectedNodeIds, 'top')}
                      className="grid h-7 w-7 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200"
                      title="Alinhar ao topo"
                      aria-label="Alinhar ao topo"
                    >
                      <AlignStartVertical size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => alignPageNodes(selectedNodeIds, 'centerY')}
                      className="grid h-7 w-7 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200"
                      title="Centralizar vertical"
                      aria-label="Centralizar vertical"
                    >
                      <AlignCenterVertical size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => alignPageNodes(selectedNodeIds, 'bottom')}
                      className="grid h-7 w-7 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200"
                      title="Alinhar à base"
                      aria-label="Alinhar à base"
                    >
                      <AlignEndVertical size={12} />
                    </button>
                    <span className="mx-0.5 h-4 w-px bg-neutral-800" />
                    <button
                      type="button"
                      onClick={() => distributePageNodes(selectedNodeIds, 'horizontal')}
                      disabled={selectedNodeIds.length < 3}
                      className="grid h-7 w-7 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-30"
                      title="Distribuir horizontal"
                      aria-label="Distribuir horizontal"
                    >
                      <span className="text-[10px] font-bold tracking-tighter">H</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => distributePageNodes(selectedNodeIds, 'vertical')}
                      disabled={selectedNodeIds.length < 3}
                      className="grid h-7 w-7 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-30"
                      title="Distribuir vertical"
                      aria-label="Distribuir vertical"
                    >
                      <span className="text-[10px] font-bold tracking-tighter">V</span>
                    </button>
                  </div>
                </>
              )}
              {selectedNode && !isMultiSelect && (
                <>
                  <button
                    type="button"
                    onClick={() => togglePageNodeLock(selectedNode.id)}
                    data-tutorial="page-lock-toggle"
                    className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] transition ${
                      selectedNode.locked
                        ? 'border-amber-400/60 bg-amber-400/10 text-amber-200'
                        : 'border-neutral-700/60 text-neutral-300 hover:border-amber-400/50 hover:text-amber-200'
                    }`}
                    title={selectedNode.locked ? 'Desbloquear (permitir edição)' : 'Bloquear (impedir edição)'}
                    aria-pressed={selectedNode.locked}
                  >
                    {selectedNode.locked ? <LockOpen size={12} /> : <Lock size={12} />}
                    {selectedNode.locked ? 'Bloqueado' : 'Bloquear'}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePageNodeVisibility(selectedNode.id)}
                    data-tutorial="page-hide-toggle"
                    className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] transition ${
                      selectedNode.hidden
                        ? 'border-amber-400/60 bg-amber-400/10 text-amber-200'
                        : 'border-neutral-700/60 text-neutral-300 hover:border-amber-400/50 hover:text-amber-200'
                    }`}
                    title={selectedNode.hidden ? 'Mostrar no canvas' : 'Ocultar do canvas'}
                    aria-pressed={selectedNode.hidden}
                  >
                    {selectedNode.hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                    {selectedNode.hidden ? 'Oculto' : 'Ocultar'}
                  </button>
                </>
              )}
              {isMultiSelect && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const allLocked = selectedNodeIds.every((id) => findPageNode(page.children, id)?.locked);
                      setPageNodesLock(selectedNodeIds, !allLocked);
                    }}
                    data-tutorial="page-lock-toggle"
                    className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-700/60 px-2.5 text-[11px] text-neutral-300 transition hover:border-amber-400/50 hover:text-amber-200"
                    title="Bloquear/desbloquear todos"
                  >
                    <Lock size={12} />
                    Bloquear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const allHidden = selectedNodeIds.every((id) => findPageNode(page.children, id)?.hidden);
                      setPageNodesVisibility(selectedNodeIds, !allHidden);
                    }}
                    data-tutorial="page-hide-toggle"
                    className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-700/60 px-2.5 text-[11px] text-neutral-300 transition hover:border-amber-400/50 hover:text-amber-200"
                    title="Mostrar/ocultar todos"
                  >
                    <EyeOff size={12} />
                    Ocultar
                  </button>
                </>
              )}
              <div className="h-5 w-px bg-neutral-800" />
              <div
                data-tutorial="page-zorder-group"
                className="flex shrink-0 items-center gap-0.5 rounded-md border border-neutral-700/60 bg-neutral-900/40 p-0.5"
                title="Ordem Z"
              >
                <button
                  type="button"
                  onClick={() => reorderPageNodes(selectedNodeIds, 'top')}
                  className="grid h-7 w-7 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200"
                  title="Trazer para o topo"
                  aria-label="Trazer para o topo"
                >
                  <ChevronsUp size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => reorderPageNodes(selectedNodeIds, 'front')}
                  className="grid h-7 w-7 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200"
                  title="Trazer para frente"
                  aria-label="Trazer para frente"
                >
                  <ArrowUpToLine size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => reorderPageNodes(selectedNodeIds, 'back')}
                  className="grid h-7 w-7 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200"
                  title="Enviar para trás"
                  aria-label="Enviar para trás"
                >
                  <ArrowDownToLine size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => reorderPageNodes(selectedNodeIds, 'bottom')}
                  className="grid h-7 w-7 place-items-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-emerald-200"
                  title="Enviar para o fundo"
                  aria-label="Enviar para o fundo"
                >
                  <ChevronsDown size={12} />
                </button>
              </div>
              {isMultiSelect && (
                <button
                  type="button"
                  onClick={() => wrapPageNodesInContainer(selectedNodeIds)}
                  data-tutorial="page-wrap-container"
                  className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-700/60 px-2.5 text-[11px] text-neutral-300 transition hover:border-emerald-400/50 hover:text-emerald-200"
                  title="Agrupar em container"
                >
                  <Group size={12} />
                  Agrupar
                </button>
              )}
              {isMultiSelect && (
                <button
                  type="button"
                  onClick={() => {
                    const name = window.prompt('Nome do componente:', 'Meu Componente');
                    if (name && name.trim()) {
                      createComponentFromSelection(name.trim(), selectedNodeIds);
                    }
                  }}
                  data-tutorial="page-create-component"
                  className="flex h-8 items-center gap-1.5 rounded-md border border-violet-400/30 bg-violet-400/[0.06] px-2.5 text-[11px] font-medium text-violet-200 transition hover:border-violet-400/60 hover:bg-violet-400/[0.12]"
                  title="Criar componente da seleção"
                >
                  <ComponentIcon size={12} />
                  Componente
                </button>
              )}
              {selectedNode && !isMultiSelect && selectedNode.componentId && (
                <button
                  type="button"
                  onClick={() => detachComponentInstance(selectedNode.id)}
                  data-tutorial="page-detach-instance"
                  className="flex h-8 items-center gap-1.5 rounded-md border border-violet-400/30 bg-violet-400/[0.06] px-2.5 text-[11px] font-medium text-violet-200 transition hover:border-violet-400/60 hover:bg-violet-400/[0.12]"
                  title="Desvincular instância do componente"
                >
                  <Unlink size={12} />
                  Desvincular
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (isMultiSelect) removePageNodes(selectedNodeIds);
                  else if (selectedNode) removePageNode(selectedNode.id);
                }}
                className="flex h-8 items-center gap-1.5 rounded-md border border-red-400/25 px-2.5 text-[11px] text-red-300 transition hover:border-red-400/60 hover:bg-red-400/[0.08]"
                title="Remover (Delete)"
              >
                <Trash2 size={12} />
                Remover
              </button>
            </>
          )}
          </div>
        </div>

        {/* Canvas frame */}
        <div className="mx-auto flex min-h-full justify-center px-5 pb-10">
          <div
            ref={canvasFrameRef}
            data-tutorial="page-canvas"
            data-page-canvas="root"
            className="relative w-full overflow-hidden rounded-xl border border-neutral-800 bg-[#101214] shadow-2xl transition-[width] duration-300"
            style={{
              ...frameStyle,
              backgroundColor: '#101214',
              backgroundImage: viewBackground === 'dots'
                ? 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)'
                : viewBackground === 'grid-8'
                  ? 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)'
                  : viewBackground === 'grid-16'
                    ? 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)'
                    : undefined,
              backgroundSize: viewBackground === 'dots'
                ? '16px 16px'
                : viewBackground === 'grid-8'
                  ? '8px 8px'
                  : viewBackground === 'grid-16'
                    ? '16px 16px'
                    : undefined,
            }}
            onWheel={(event) => {
              if (!(event.ctrlKey || event.metaKey)) return;
              event.preventDefault();
              const current = usePageBuilderViewportStore.getState().zoom;
              const factor = event.deltaY > 0 ? 0.92 : 1.08;
              const nextScale = Math.max(PAGE_BUILDER_ZOOM_MIN, Math.min(PAGE_BUILDER_ZOOM_MAX, current.scale * factor));
              setScale(nextScale);
            }}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('[data-experience-node]')) return;
              if (marquee) return;
              if (event.shiftKey) return;
              clearSelectedPageNodes();
            }}
            onContextMenu={(event) => {
              if ((event.target as HTMLElement).closest('[data-experience-node]')) return;
              event.preventDefault();
              showContextMenu(event.clientX, event.clientY, null);
            }}
            onPointerDown={(event) => {
              // Only initiate marquee when clicking on the canvas backdrop, not on a node.
              const target = event.target as HTMLElement;
              if (target.closest('[data-experience-node]')) return;
              if (event.button !== 0) return;
              const frame = canvasFrameRef.current;
              if (!frame) return;
              const frameRect = frame.getBoundingClientRect();
              marqueeStartRef.current = { x: event.clientX - frameRect.left, y: event.clientY - frameRect.top };
              marqueeAdditiveRef.current = event.shiftKey;
              setMarquee({ top: marqueeStartRef.current.y, left: marqueeStartRef.current.x, width: 0, height: 0 });
              try { (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); } catch { /* noop */ }
            }}
            onPointerMove={handleCanvasPointerMove}
            onPointerLeave={handleCanvasPointerLeave}
            onDragEnter={(event) => {
              const types = Array.from(event.dataTransfer.types);
              if (!types.includes(PAGE_BUILDER_DND_MIME)) return;
              event.preventDefault();
            }}
            onDragOver={(event) => {
              const types = Array.from(event.dataTransfer.types);
              if (!types.includes(PAGE_BUILDER_DND_MIME)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = dndPayload?.kind === 'move' ? 'move' : 'copy';
              const target = resolveDropTarget(event, canvasFrameRef.current, dndPayload);
              if (target) {
                setDndHover(target);
                if (dndPayload) {
                  setDropIndicator(computeDropIndicator(target, dndPayload, canvasFrameRef.current));
                }
              }
            }}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) {
                setDndHover(null);
                setDropIndicator(null);
              }
            }}
            onDrop={(event) => {
              const types = Array.from(event.dataTransfer.types);
              if (!types.includes(PAGE_BUILDER_DND_MIME)) return;
              event.preventDefault();
              const target = resolveDropTarget(event, canvasFrameRef.current, dndPayload);
              const payload = dndPayload;
              endDnd();
              setDropIndicator(null);
              if (!target || !payload) return;
              applyDrop(target, payload, page.children);
            }}
            onDragStart={(event) => {
              const target = event.target as HTMLElement;
              const nodeEl = target.closest<HTMLElement>('[data-experience-node]');
              if (!nodeEl) return;
              const id = nodeEl.dataset.experienceNode;
              if (!id) return;
              const types = Array.from(event.dataTransfer.types);
              if (types.includes(PAGE_BUILDER_DND_MIME)) return; // already set elsewhere
              event.dataTransfer.setData(
                PAGE_BUILDER_DND_MIME,
                JSON.stringify({ kind: 'move', id }),
              );
              event.dataTransfer.effectAllowed = 'move';
              usePageBuilderDndStore.getState().beginDrag({ kind: 'move', id });
            }}
            onDragEnd={() => {
              endDnd();
              setDropIndicator(null);
            }}
          >
            {/* ruler bar */}
            <div className="ed-ruler flex h-5 items-center justify-between border-b border-neutral-800/70 bg-[#0d0f10] px-3 text-[9px] font-medium uppercase tracking-[0.16em] text-neutral-600">
              <span>Página</span>
              <span>{viewportWidth ? `${viewportWidth}px` : 'Fluido'}</span>
            </div>

            <div
              data-tutorial="page-canvas-zoom"
              className="relative origin-top-left"
              style={{
                width: viewportWidth ?? '100%',
                maxWidth: 1440,
                transform: `scale(${zoom.scale}) translate(${zoom.offsetX / zoom.scale}px, ${zoom.offsetY / zoom.scale}px)`,
                transformOrigin: 'top left',
              }}
            >
              {hasElements ? (
                <PageExperience
                  page={page}
                  interactions={interactions}
                  selectedNodeId={selectedPageNodeId}
                  selectedNodeIds={selectedNodeIds}
                  mode="edit"
                  activeBreakpoint="base"
                  previewPseudo={previewPseudo}
                  xrayMode={xrayMode}
                  showOnlySelection={showOnlySelection}
                  onSelectNode={(id, additive) => {
                    if (additive) {
                      toggleSelectedPageNode(id);
                    } else {
                      setSelectedPageNode(id);
                    }
                  }}
                  onSelectParentNode={selectParentPageNode}
                  onUpdateNodeProps={updatePageNodeProps}
                  onDuplicateNode={duplicatePageNode}
                  onRemoveNode={removePageNode}
                  onContextMenuNode={(id, event) => {
                    showContextMenu(event.clientX, event.clientY, id);
                  }}
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

      {/* Marquee selection rectangle */}
      {marquee && (
        <div
          className="pointer-events-none absolute z-30 border border-sky-400/70 bg-sky-400/[0.05]"
          style={{
            top: marquee.top,
            left: marquee.left,
            width: marquee.width,
            height: marquee.height,
          }}
        />
      )}

      {/* Drop indicator (overlay relative to canvas frame) */}
      {dndPayload && dndHover && dropIndicator && (() => {
        if (dndHover.kind === 'into') {
          return (
            <div
              className="pointer-events-none absolute z-30 rounded-md border-2 border-emerald-300 bg-emerald-400/[0.08]"
              style={{
                top: dropIndicator.top,
                left: dropIndicator.left,
                width: dropIndicator.width,
                height: dropIndicator.height,
              }}
            >
              <span className="absolute -top-6 left-0 rounded-md border border-emerald-400/40 bg-neutral-950 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                Soltar {dndPayload.kind === 'move' ? 'dentro' : 'aqui'}
              </span>
            </div>
          );
        }
        return (
          <div
            className="pointer-events-none absolute z-30"
            style={{
              top: dropIndicator.top - 2,
              left: dropIndicator.left,
              width: dropIndicator.width,
              height: 4,
            }}
          >
            <div className="h-1 w-full rounded-full bg-rose-400 shadow-[0_0_0_2px_rgba(244,63,94,0.25)]" />
          </div>
        );
      })()}

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

      {/* Multi-select bounding box */}
      {isMultiSelect && multiSelectRect && (
        <div
          data-tutorial="page-multiselect-bounds"
          className="ed-select-glow pointer-events-none absolute z-40 border-2 border-dashed border-sky-300/90"
          style={{
            left: multiSelectRect.left,
            top: multiSelectRect.top,
            width: multiSelectRect.width,
            height: multiSelectRect.height,
          }}
        >
          <div className="absolute -top-7 left-0 flex items-center gap-1.5 rounded-md border border-sky-400/40 bg-neutral-950 px-2 py-0.5 text-[10px] font-semibold text-sky-200 shadow-lg">
            <Layers size={10} />
            {selectedNodeIds.length} elementos
            <span className="text-[9px] font-normal text-sky-300/70">
              {Math.round(multiSelectRect.width)} × {Math.round(multiSelectRect.height)}
            </span>
          </div>
        </div>
      )}

      {/* Selection box */}
      {!isMultiSelect && selectedNode && selectionRect && breadcrumb.length > 0 && (
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
            {selectedNode.locked && (
              <span className="flex items-center gap-1 rounded bg-amber-400/15 px-1 py-0.5 text-[9px] uppercase text-amber-300">
                <Lock size={9} /> Bloqueado
              </span>
            )}
            {selectedNode.hidden && (
              <span className="flex items-center gap-1 rounded bg-amber-400/15 px-1 py-0.5 text-[9px] uppercase text-amber-300">
                <EyeOff size={9} /> Oculto
              </span>
            )}
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

          {!selectedNode.locked && (
            <>
              {/* Move handle (top-center) */}
              <button
                type="button"
                onPointerDown={(event) => startHandleDrag('move', event)}
                className="pointer-events-auto absolute left-1/2 top-0 z-10 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md border border-emerald-300 bg-neutral-950 text-emerald-200 shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition hover:bg-emerald-400 hover:text-neutral-950"
                title="Mover (arraste)"
                aria-label="Mover elemento"
                style={{ cursor: 'move' }}
              >
                <Grip size={14} />
              </button>

              {/* Edge handles (4 sides) - 14x14px hit area centered on each side */}
              {([
                { mode: 'resize-n', pos: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' },
                { mode: 'resize-s', pos: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' },
                { mode: 'resize-w', pos: 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2' },
                { mode: 'resize-e', pos: 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2' },
              ] as const).map(({ mode, pos }) => (
                <button
                  key={mode}
                  type="button"
                  onPointerDown={(event) => startHandleDrag(mode, event)}
                  className="pointer-events-auto absolute grid h-4 w-4 place-items-center rounded-sm border border-emerald-300 bg-neutral-950 transition hover:bg-emerald-300 hover:scale-125"
                  style={{
                    top: pos.includes('top-0') ? 0 : pos.includes('bottom-0') ? 'auto' : '50%',
                    bottom: pos.includes('bottom-0') ? 0 : 'auto',
                    left: pos.includes('left-0') ? 0 : pos.includes('right-0') ? 'auto' : '50%',
                    right: pos.includes('right-0') ? 0 : 'auto',
                    transform: `translate(${pos.includes('-x-1/2') ? '-50%' : pos.includes('translate-x-1/2') ? '50%' : '0'}, ${pos.includes('-y-1/2') ? '-50%' : pos.includes('translate-y-1/2') ? '50%' : '0'})`,
                    cursor: RESIZE_CURSOR[mode],
                  }}
                  title={`Redimensionar (${mode.replace('resize-', '').toUpperCase()})`}
                  aria-label={`Redimensionar para ${mode.replace('resize-', '')}`}
                />
              ))}

              {/* Corner handles (4 corners) - 14x14px with diagonal icon */}
              {([
                { mode: 'resize-nw', pos: 'top-0 left-0', offset: '-translate-x-1/2 -translate-y-1/2' },
                { mode: 'resize-ne', pos: 'top-0 right-0', offset: 'translate-x-1/2 -translate-y-1/2' },
                { mode: 'resize-sw', pos: 'bottom-0 left-0', offset: '-translate-x-1/2 translate-y-1/2' },
                { mode: 'resize-se', pos: 'bottom-0 right-0', offset: 'translate-x-1/2 translate-y-1/2' },
              ] as const).map(({ mode, pos, offset }) => (
                <button
                  key={mode}
                  type="button"
                  onPointerDown={(event) => startHandleDrag(mode, event)}
                  className="pointer-events-auto absolute grid h-5 w-5 place-items-center rounded-md border-2 border-emerald-300 bg-neutral-950 text-emerald-300 shadow-[0_0_0_2px_rgba(0,0,0,0.4)] transition hover:bg-emerald-400 hover:text-neutral-950 hover:scale-110"
                  style={{
                    top: pos.includes('top-0') ? 0 : 'auto',
                    bottom: pos.includes('bottom-0') ? 0 : 'auto',
                    left: pos.includes('left-0') ? 0 : 'auto',
                    right: pos.includes('right-0') ? 0 : 'auto',
                    transform: offset,
                    cursor: RESIZE_CURSOR[mode],
                  }}
                  title={`Redimensionar do canto ${mode.replace('resize-', '').toUpperCase()}`}
                  aria-label={`Redimensionar canto ${mode.replace('resize-', '')}`}
                >
                  <span
                    className="block h-2 w-2"
                    style={{
                      background: 'currentColor',
                      clipPath: mode === 'resize-nw' || mode === 'resize-se'
                        ? 'polygon(0 0, 100% 0, 0 100%)'
                        : 'polygon(100% 0, 100% 100%, 0 0)',
                    }}
                  />
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Mini-map */}
      <PageBuilderMiniMap workspaceRef={workspaceRef} />

      <FindNodeOverlay open={findOpen} onClose={() => setFindOpen(false)} />
      <PageBuilderContextMenu />
    </div>
  );
}
