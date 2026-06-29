import { create } from 'zustand';
import { createDefaultInteraction, getDefaultParamsForAction } from '@/lib/interaction-engine/defaults';
import type { InteractionAction, InteractionDocument, InteractionTrigger } from '@/lib/interaction-engine/types';
import {
  createComponentDefinition,
  createEmptyPageDocument,
  createDefaultProjectSettings,
  createPageNode,
} from '@/lib/page-builder/defaults';
import { usePageHistoryStore } from './pageHistoryStore';
import {
  appendPageNode,
  detachComponentInstance,
  duplicatePageNodeTree,
  findPageNode,
  findPageNodeLocation,
  findParentPageNode,
  flattenPageNodes,
  insertPageNodeTree,
  movePageNodeTree,
  type PageNodeMoveDirection,
  removePageNodeTree,
  reparentPageNodeTree,
  syncComponentInstance,
  updatePageNodeTree,
} from '@/lib/page-builder/tree';
import type { ComponentDefinition, EditorMode, ExportTarget, PageDocument, PageEffect, PageEffectsConfig, PageNode, PageNodeType, ProjectSettings, PseudoClass } from '@/lib/page-builder/types';
import { createDefaultEffect, getEffectDefinition } from '@/lib/effects-system/registry';
import type { EffectType } from '@/lib/effects-system/types';
import { instantiateTemplate, type ExperienceTemplateId } from '@/lib/template-engine/templates';
import { applyPresetToPage } from '@/lib/template-engine/sections';
import { getVisualPreset, type VisualPresetId } from '@/lib/template-engine/presets';
import { buildBlock, resolveBlockPreset } from '@/lib/template-engine/blockLibrary';
import { createId } from './types';

type InteractionPatch = Partial<Omit<InteractionDocument, 'id'>>;

type ExperienceState = {
  activeMode: EditorMode;
  page: PageDocument;
  pages: PageDocument[];
  activePageId: string;
  interactions: InteractionDocument[];
  settings: ProjectSettings;
  components: ComponentDefinition[];
  selectedPageNodeId: string | null;
  selectedPageNodeIds: string[];
  selectedInteractionId: string | null;
  activeBreakpoint: string;
  previewPseudo: PseudoClass | null;
  exportTarget: ExportTarget;
  setActiveMode: (mode: EditorMode) => void;
  setSelectedPageNode: (id: string | null) => void;
  toggleSelectedPageNode: (id: string) => void;
  setSelectedPageNodes: (ids: string[]) => void;
  clearSelectedPageNodes: () => void;
  setActiveBreakpoint: (breakpoint: string) => void;
  setPreviewPseudo: (pseudo: PseudoClass | null) => void;
  updatePageNodePseudoStyle: (id: string, pseudoClass: PseudoClass, patch: Partial<PageNode['styles']['base']>, breakpoint?: string) => void;
  selectParentPageNode: () => void;
  setActivePage: (pageId: string) => void;
  addPage: (name?: string, path?: string) => PageDocument;
  duplicatePage: (pageId?: string) => PageDocument | null;
  removePage: (pageId: string) => void;
  updatePageMeta: (patch: Partial<Pick<PageDocument, 'name' | 'path' | 'title' | 'description' | 'protected'>>) => void;
  setSelectedInteraction: (id: string | null) => void;
  setExportTarget: (target: ExportTarget) => void;
  updateSettings: (patch: Partial<ProjectSettings>) => void;
  loadExperience: (experience: { page: PageDocument; pages?: PageDocument[]; activePageId?: string; interactions: InteractionDocument[]; settings: ProjectSettings; components?: ComponentDefinition[]; activeMode?: EditorMode }) => void;
  addPageNode: (type: PageNodeType, parentId?: string | null) => PageNode;
  updatePageNode: (id: string, patch: Partial<Omit<PageNode, 'id' | 'children'>> & { children?: PageNode[] }) => void;
  updatePageNodeStyle: (id: string, patch: Partial<PageNode['styles']['base']>, breakpoint?: string) => void;
  updatePageNodeProps: (id: string, patch: Record<string, unknown>) => void;
  movePageNode: (id: string, direction: PageNodeMoveDirection) => void;
  reparentPageNode: (id: string, newParentId: string | null, index?: number) => void;
  removePageNode: (id: string) => void;
  duplicatePageNode: (id: string) => void;
  togglePageNodeLock: (id: string) => void;
  togglePageNodeVisibility: (id: string) => void;
  setPageNodesLock: (ids: string[], locked: boolean) => void;
  setPageNodesVisibility: (ids: string[], hidden: boolean) => void;
  removePageNodes: (ids: string[]) => void;
  duplicatePageNodes: (ids: string[]) => void;
  movePageNodes: (ids: string[], direction: PageNodeMoveDirection) => void;
  reorderPageNodes: (ids: string[], direction: 'front' | 'back' | 'top' | 'bottom') => void;
  alignPageNodes: (ids: string[], axis: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom') => void;
  distributePageNodes: (ids: string[], axis: 'horizontal' | 'vertical') => void;
  wrapPageNodesInContainer: (ids: string[]) => void;
  resetPage: () => void;
  applyTemplate: (templateId: ExperienceTemplateId, sceneTargetId?: string) => void;
  applyPreset: (presetId: VisualPresetId) => void;
  insertBlock: (blockId: string, parentId?: string | null) => PageNode | null;
  addBreakpoint: (name: string, width: number) => void;
  renameBreakpoint: (oldName: string, newName: string) => void;
  removeBreakpoint: (name: string) => void;
  updateBreakpointWidth: (name: string, width: number) => void;
  addEffect: (type: EffectType, scope?: 'page' | string) => PageEffect;
  updateEffect: (id: string, patch: Partial<Omit<PageEffect, 'id' | 'type'>>) => void;
  updateEffectProps: (id: string, propsPatch: Record<string, unknown>) => void;
  toggleEffect: (id: string) => void;
  removeEffect: (id: string) => void;
  reorderEffect: (id: string, direction: PageNodeMoveDirection) => void;
  setEffectIntensity: (intensity: number) => void;
  addInteraction: (sourceId?: string, targetId?: string, trigger?: InteractionTrigger, action?: InteractionAction) => InteractionDocument;
  updateInteraction: (id: string, patch: InteractionPatch) => void;
  setInteractionAction: (id: string, action: InteractionAction) => void;
  removeInteraction: (id: string) => void;
  createComponentFromSelection: (name: string, nodeIds: string[], description?: string) => void;
  addComponentInstance: (componentId: string, parentId?: string | null) => PageNode | null;
  updateComponent: (id: string, patch: Partial<Omit<ComponentDefinition, 'id'>>) => void;
  removeComponent: (id: string) => void;
  syncComponentInstances: (componentId: string) => void;
  detachComponentInstance: (instanceNodeId: string) => void;
};

const defaultPage = createEmptyPageDocument();
const firstPageNodeId = flattenPageNodes(defaultPage)[0]?.node.id ?? null;

const normalizePath = (path: string) => {
  const clean = path.trim().toLowerCase().replace(/[^a-z0-9/-]+/g, '-').replace(/\/+/g, '/').replace(/^-+|-+$/g, '');
  const withSlash = clean.startsWith('/') ? clean : `/${clean}`;
  return withSlash === '/-' || withSlash === '' ? '/' : withSlash.replace(/\/-+$/, '');
};

const pathFromName = (name: string) =>
  normalizePath(name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-'));

const uniquePath = (pages: PageDocument[], requested: string) => {
  const base = normalizePath(requested || '/pagina');
  if (!pages.some((page) => (page.path ?? '/') === base)) return base;
  let index = 2;
  while (pages.some((page) => (page.path ?? '/') === `${base === '/' ? '/pagina' : base}-${index}`)) {
    index += 1;
  }
  return `${base === '/' ? '/pagina' : base}-${index}`;
};

const normalizePageDocument = (page: PageDocument, fallbackIndex = 0): PageDocument => ({
  ...page,
  path: page.path ?? (fallbackIndex === 0 ? '/' : pathFromName(page.name || `pagina-${fallbackIndex + 1}`)),
  title: page.title ?? page.name ?? 'Page',
  description: page.description ?? '',
  protected: page.protected ?? false,
});

const syncActivePage = (
  state: Pick<ExperienceState, 'page' | 'pages' | 'activePageId'>,
  page: PageDocument,
) => {
  const activePageId = state.activePageId || page.id;
  const sourcePages = state.pages.length > 0 ? state.pages : [state.page];
  const pages = sourcePages.some((candidate) => candidate.id === activePageId)
    ? sourcePages.map((candidate) => (candidate.id === activePageId ? page : candidate))
    : [...sourcePages, page];
  return {
    page,
    pages,
    activePageId: page.id,
  };
};

const cloneJson = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const duplicatePageDocument = (page: PageDocument, pages: PageDocument[]): PageDocument => {
  const name = `${page.name || 'Page'} Copy`;
  return normalizePageDocument({
    ...page,
    id: createId(),
    name,
    title: `${page.title ?? page.name ?? 'Page'} Copy`,
    path: uniquePath(pages, `${page.path ?? pathFromName(page.name || 'pagina')}-copy`),
    children: page.children.map((child) => duplicatePageNodeTree(child, createId)),
    responsive: page.responsive.map((bp) => ({ ...bp })),
    effects: page.effects ? cloneJson(page.effects) : undefined,
  });
};

const pushPageHistory = () => {
  usePageHistoryStore.getState().beginMutation();
};

const primarySelection = (id: string | null) => ({
  selectedPageNodeId: id,
  selectedPageNodeIds: id ? [id] : [],
});

const parseTranslate = (transform: string | undefined): { x: number; y: number } => {
  if (!transform || typeof transform !== 'string') return { x: 0, y: 0 };
  const match = transform.match(/translate\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*\)/);
  if (!match) return { x: 0, y: 0 };
  return { x: Number.parseFloat(match[1]), y: Number.parseFloat(match[2]) };
};

const composeTranslate = (transform: string | undefined, dx: number, dy: number) => {
  const { x, y } = parseTranslate(transform);
  const next = `translate(${x + dx}px, ${y + dy}px)`;
  // Strip other transforms (we only manage translate for now)
  return next;
};

const toCssNumber = (value: number | string | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const useExperienceStore = create<ExperienceState>((set, get) => ({
  activeMode: 'scene',
  page: defaultPage,
  pages: [defaultPage],
  activePageId: defaultPage.id,
  interactions: [],
  settings: createDefaultProjectSettings(),
  components: [],
  selectedPageNodeId: firstPageNodeId,
  selectedPageNodeIds: firstPageNodeId ? [firstPageNodeId] : [],
  selectedInteractionId: null,
  activeBreakpoint: 'base',
  previewPseudo: null,
  exportTarget: 'next',

  setActiveMode: (activeMode) => set({ activeMode }),
  setSelectedPageNode: (selectedPageNodeId) => set({
    selectedPageNodeId,
    selectedPageNodeIds: selectedPageNodeId ? [selectedPageNodeId] : [],
  }),
  toggleSelectedPageNode: (id) =>
    set((state) => {
      const exists = state.selectedPageNodeIds.includes(id);
      const next = exists
        ? state.selectedPageNodeIds.filter((existing) => existing !== id)
        : [...state.selectedPageNodeIds, id];
      return {
        selectedPageNodeIds: next,
        selectedPageNodeId: next[0] ?? null,
      };
    }),
  setSelectedPageNodes: (ids) => set({
    selectedPageNodeIds: ids,
    selectedPageNodeId: ids[0] ?? null,
  }),
  clearSelectedPageNodes: () => set({
    selectedPageNodeIds: [],
    selectedPageNodeId: null,
  }),
  selectParentPageNode: () =>
    set((state) => {
      const parent = findParentPageNode(state.page.children, state.selectedPageNodeId);
      if (!parent) return state;
      return {
        selectedPageNodeId: parent.id,
        selectedPageNodeIds: [parent.id],
      };
    }),
  setActivePage: (pageId) =>
    set((state) => {
      const page = state.pages.find((candidate) => candidate.id === pageId);
      if (!page) return state;
      const primary = flattenPageNodes(page)[0]?.node.id ?? null;
      return {
        activePageId: page.id,
        page,
        ...primarySelection(primary),
      };
    }),
  addPage: (name = 'Nova pagina', requestedPath) => {
    pushPageHistory();
    const pages = get().pages;
    const page = createEmptyPageDocument({
      name,
      title: name,
      path: uniquePath(pages, requestedPath ?? pathFromName(name)),
    });
    set((state) => {
      const primary = flattenPageNodes(page)[0]?.node.id ?? null;
      return {
        pages: [...state.pages, page],
        activePageId: page.id,
        page,
        ...primarySelection(primary),
        activeMode: 'page',
      };
    });
    return page;
  },
  duplicatePage: (pageId = get().activePageId) => {
    const state = get();
    const source = state.pages.find((candidate) => candidate.id === pageId);
    if (!source) return null;
    pushPageHistory();
    const page = duplicatePageDocument(source, state.pages);
    set((current) => {
      const primary = flattenPageNodes(page)[0]?.node.id ?? null;
      return {
        pages: [...current.pages, page],
        activePageId: page.id,
        page,
        ...primarySelection(primary),
        activeMode: 'page',
      };
    });
    return page;
  },
  removePage: (pageId) => {
    const before = get().pages.length;
    if (before <= 1) return;
    pushPageHistory();
    set((state) => {
      if (state.pages.length <= 1) return state;
      const pages = state.pages.filter((candidate) => candidate.id !== pageId);
      if (pages.length === state.pages.length) return state;
      const page = state.activePageId === pageId ? pages[0] : state.page;
      const primary = flattenPageNodes(page)[0]?.node.id ?? null;
      return {
        pages,
        activePageId: page.id,
        page,
        ...primarySelection(primary),
      };
    });
  },
  updatePageMeta: (patch) => {
    pushPageHistory();
    set((state) => {
      const nextPage = normalizePageDocument({ ...state.page, ...patch });
      const existingPages = state.pages.filter((candidate) => candidate.id !== nextPage.id);
      if (patch.path) nextPage.path = uniquePath(existingPages, patch.path);
      return syncActivePage(state, nextPage);
    });
  },
  setSelectedInteraction: (selectedInteractionId) => set({ selectedInteractionId }),
  setActiveBreakpoint: (activeBreakpoint) => set({ activeBreakpoint }),
  setPreviewPseudo: (previewPseudo) => set({ previewPseudo }),
  updatePageNodePseudoStyle: (id, pseudoClass, patch, breakpoint = 'base') => {
    pushPageHistory();
    set((state) => {
      const page = {
        ...state.page,
        children: updatePageNodeTree(state.page.children, id, (node) => {
          const existingPseudo = node.pseudo?.[pseudoClass];
          const existingBreakpoint = existingPseudo
            ? (existingPseudo as Record<string, unknown>)[breakpoint] as Record<string, unknown> ?? {}
            : {};
          return {
            ...node,
            pseudo: {
              ...node.pseudo,
              [pseudoClass]: {
                ...(existingPseudo as Record<string, unknown>),
                [breakpoint]: { ...existingBreakpoint, ...patch },
              } as PageNode['styles'],
            },
          };
        }),
      };
      return syncActivePage(state, page);
    });
  },
  setExportTarget: (exportTarget) =>
    set((state) => ({
      exportTarget,
      settings: { ...state.settings, exportTarget },
    })),
  updateSettings: (patch) =>
    set((state) => ({
      settings: { ...state.settings, ...patch },
    })),

  addBreakpoint: (name, width) => {
    if (get().page.responsive.some((bp) => bp.name === name)) return;
    pushPageHistory();
    set((state) => {
      if (state.page.responsive.some((bp) => bp.name === name)) return state;
      const page = {
        ...state.page,
        responsive: [...state.page.responsive, { name, width }],
      };
      return syncActivePage(state, page);
    });
  },
  renameBreakpoint: (oldName, newName) => {
    if (oldName === 'base' || oldName === newName) return;
    pushPageHistory();
    set((state) => {
      if (oldName === 'base' || oldName === newName) return state;
      const renameInStyles = (styles: Record<string, unknown>): Record<string, unknown> => {
        if (styles[oldName] !== undefined) {
          const { [oldName]: value, ...rest } = styles;
          return { ...rest, [newName]: value };
        }
        return styles;
      };
      const updateChildren = (nodes: PageNode[]): PageNode[] =>
        nodes.map((node) => ({
          ...node,
          styles: renameInStyles(node.styles) as PageNode['styles'],
          responsive: node.responsive
            ? renameInStyles(node.responsive as unknown as Record<string, unknown>) as unknown as PageNode['responsive']
            : undefined,
          children: node.children ? updateChildren(node.children) : undefined,
        }));
      const page = {
        ...state.page,
        responsive: state.page.responsive.map((bp) =>
          bp.name === oldName ? { ...bp, name: newName } : bp,
        ),
        children: updateChildren(state.page.children),
      };
      return syncActivePage(state, page);
    });
  },
  removeBreakpoint: (name) => {
    if (name === 'base') return;
    if (get().page.responsive.length <= 1) return;
    pushPageHistory();
    set((state) => {
      if (name === 'base') return state;
      if (state.page.responsive.length <= 1) return state;
      const removeInStyles = <T extends Record<string, unknown>>(styles: T): T => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [name]: _removed, ...rest } = styles;
        return rest as T;
      };
      const updateChildren = (nodes: PageNode[]): PageNode[] =>
        nodes.map((node) => ({
          ...node,
          styles: removeInStyles(node.styles),
          responsive: node.responsive ? removeInStyles(node.responsive) : undefined,
          children: node.children ? updateChildren(node.children) : undefined,
        }));
      const page = {
        ...state.page,
        responsive: state.page.responsive.filter((bp) => bp.name !== name),
        children: updateChildren(state.page.children),
      };
      return syncActivePage(state, page);
    });
  },
  updateBreakpointWidth: (name, width) => {
    pushPageHistory();
    set((state) => {
      const page = {
        ...state.page,
        responsive: state.page.responsive.map((bp) =>
          bp.name === name ? { ...bp, width } : bp,
        ),
      };
      return syncActivePage(state, page);
    });
  },
  loadExperience: ({ page, pages, activePageId, interactions, settings, components, activeMode }) => {
    pushPageHistory();
    set((state) => {
      const normalizedPages = (pages && pages.length > 0 ? pages : [page]).map(normalizePageDocument);
      const activePage = normalizedPages.find((candidate) => candidate.id === activePageId)
        ?? normalizedPages.find((candidate) => candidate.id === page.id)
        ?? normalizedPages[0];
      return {
        page: activePage,
        pages: normalizedPages,
        activePageId: activePage.id,
        interactions,
        settings,
        components: components ?? [],
        exportTarget: settings.exportTarget,
        activeMode: activeMode ?? state.activeMode,
        ...primarySelection(flattenPageNodes(activePage)[0]?.node.id ?? null),
        selectedInteractionId: interactions[0]?.id ?? null,
      };
    });
  },

  addPageNode: (type, parentId = get().selectedPageNodeId) => {
    pushPageHistory();
    const node = createPageNode(type);
    set((state) => {
      const parent = findPageNode(state.page.children, parentId);
      const canNest = parent && !['text', 'button', 'image', 'video', 'sceneCanvas', 'input', 'select', 'textarea', 'label', 'menuitem', 'dataTable', 'dataForm', 'dataList', 'dataChart', 'dataStat'].includes(parent.type);
      const nextChildren = appendPageNode(state.page.children, canNest ? parentId : null, node);
      return {
        ...syncActivePage(state, { ...state.page, children: nextChildren }),
        ...primarySelection(node.id),
      };
    });
    return node;
  },

  updatePageNode: (id, patch) => {
    pushPageHistory();
    set((state) => {
      const page = {
        ...state.page,
        children: updatePageNodeTree(state.page.children, id, (node) => ({
          ...node,
          ...patch,
          props: patch.props ? { ...node.props, ...patch.props } : node.props,
          styles: patch.styles
            ? (Object.fromEntries(
                [...new Set([...Object.keys(node.styles), ...Object.keys(patch.styles)])].map((key) => [
                  key,
                  { ...(node.styles[key] ?? {}), ...(patch.styles![key] ?? {}) },
                ]),
              ) as PageNode['styles'])
            : node.styles,
        })),
      };
      return syncActivePage(state, page);
    });
  },

  updatePageNodeStyle: (id, patch, breakpoint = 'base') => {
    pushPageHistory();
    set((state) => {
      const page = {
        ...state.page,
        children: updatePageNodeTree(state.page.children, id, (node) => ({
          ...node,
          styles: {
            ...node.styles,
            [breakpoint]: {
              ...(node.styles[breakpoint] ?? {}),
              ...patch,
            },
          },
        })),
      };
      return syncActivePage(state, page);
    });
  },

  updatePageNodeProps: (id, patch) => {
    pushPageHistory();
    set((state) => {
      const page = {
        ...state.page,
        children: updatePageNodeTree(state.page.children, id, (node) => ({
          ...node,
          props: { ...node.props, ...patch },
        })),
      };
      return syncActivePage(state, page);
    });
  },

  movePageNode: (id, direction) => {
    pushPageHistory();
    set((state) => {
      const preserved = state.selectedPageNodeIds.includes(id) ? state.selectedPageNodeIds : [id];
      const next = movePageNodeTree(state.page.children, id, direction);
      const newPreserved = preserved
        .map((entry) => findPageNode(next, entry)?.id)
        .filter((entry): entry is string => Boolean(entry));
      return {
        ...syncActivePage(state, {
          ...state.page,
          children: next,
        }),
        ...primarySelection(id),
        selectedPageNodeIds: newPreserved.length > 0 ? newPreserved : [id],
      };
    });
  },

  reparentPageNode: (id, newParentId, index) => {
    pushPageHistory();
    set((state) => {
      const next = reparentPageNodeTree(state.page.children, id, newParentId, index);
      const preserved = state.selectedPageNodeIds.includes(id) ? state.selectedPageNodeIds : [id];
      const newPreserved = preserved
        .map((entry) => findPageNode(next, entry)?.id)
        .filter((entry): entry is string => Boolean(entry));
      return {
        ...syncActivePage(state, {
          ...state.page,
          children: next,
        }),
        ...primarySelection(id),
        selectedPageNodeIds: newPreserved.length > 0 ? newPreserved : [id],
      };
    });
  },

  removePageNode: (id) => {
    pushPageHistory();
    set((state) => {
      const nextChildren = removePageNodeTree(state.page.children, id);
      const remaining = state.selectedPageNodeIds.filter((entry) => entry !== id);
      const fallback = remaining[0] ?? flattenPageNodes({ ...state.page, children: nextChildren })[0]?.node.id ?? null;
      return {
        ...syncActivePage(state, { ...state.page, children: nextChildren }),
        ...primarySelection(fallback),
        selectedPageNodeIds: fallback ? [fallback] : remaining,
        interactions: state.interactions.filter((interaction) => interaction.sourceId !== id && interaction.targetId !== id),
      };
    });
  },

  duplicatePageNode: (id) => {
    pushPageHistory();
    set((state) => {
      const original = findPageNode(state.page.children, id);
      const location = findPageNodeLocation(state.page.children, id);
      if (!original) return state;
      const copy = duplicatePageNodeTree(original, createId);
      return {
        ...syncActivePage(state, {
          ...state.page,
          children: insertPageNodeTree(state.page.children, location?.parentId ?? null, copy, (location?.index ?? state.page.children.length) + 1),
        }),
        ...primarySelection(copy.id),
      };
    });
  },

  togglePageNodeLock: (id) => {
    if (!findPageNode(get().page.children, id)) return;
    pushPageHistory();
    set((state) => {
      const target = findPageNode(state.page.children, id);
      if (!target) return state;
      const nextLocked = !target.locked;
      const page = {
        ...state.page,
        children: updatePageNodeTree(state.page.children, id, (node) => ({ ...node, locked: nextLocked })),
      };
      const shouldDeselect = nextLocked && state.selectedPageNodeIds.includes(id);
      const remaining = shouldDeselect
        ? state.selectedPageNodeIds.filter((entry) => entry !== id)
        : state.selectedPageNodeIds;
      return {
        ...syncActivePage(state, page),
        ...primarySelection(remaining[0] ?? null),
        selectedPageNodeIds: remaining,
      };
    });
  },

  togglePageNodeVisibility: (id) => {
    if (!findPageNode(get().page.children, id)) return;
    pushPageHistory();
    set((state) => {
      const target = findPageNode(state.page.children, id);
      if (!target) return state;
      const nextHidden = !target.hidden;
      const page = {
        ...state.page,
        children: updatePageNodeTree(state.page.children, id, (node) => ({ ...node, hidden: nextHidden })),
      };
      const shouldDeselect = nextHidden && state.selectedPageNodeIds.includes(id);
      const remaining = shouldDeselect
        ? state.selectedPageNodeIds.filter((entry) => entry !== id)
        : state.selectedPageNodeIds;
      return {
        ...syncActivePage(state, page),
        ...primarySelection(remaining[0] ?? null),
        selectedPageNodeIds: remaining,
      };
    });
  },

  resetPage: () => {
    pushPageHistory();
    const current = get().page;
    const page = createEmptyPageDocument({
      name: current.name,
      title: current.title,
      path: current.path,
      description: current.description,
      protected: current.protected,
    });
    set((state) => ({
      ...syncActivePage(state, page),
      ...primarySelection(flattenPageNodes(page)[0]?.node.id ?? null),
      interactions: [],
      selectedInteractionId: null,
    }));
  },

  setPageNodesLock: (ids, locked) => {
    if (ids.length === 0) return;
    const allValid = ids.every((id) => findPageNode(get().page.children, id));
    if (!allValid) return;
    pushPageHistory();
    usePageHistoryStore.getState().beginTransaction();
    for (const id of ids) {
      useExperienceStore.setState((current) => {
        const next = updatePageNodeTree(current.page.children, id, (node) => ({ ...node, locked }));
        return syncActivePage(current, { ...current.page, children: next });
      });
    }
    usePageHistoryStore.getState().endTransaction();
    set((state) => {
      const idSet = new Set(ids);
      const remaining = locked
        ? state.selectedPageNodeIds.filter((entry) => !idSet.has(entry))
        : Array.from(new Set([...state.selectedPageNodeIds.filter((entry) => !idSet.has(entry)), ...ids]));
      return {
        ...primarySelection(remaining[0] ?? null),
        selectedPageNodeIds: remaining,
      };
    });
  },

  setPageNodesVisibility: (ids, hidden) => {
    if (ids.length === 0) return;
    const allValid = ids.every((id) => findPageNode(get().page.children, id));
    if (!allValid) return;
    pushPageHistory();
    usePageHistoryStore.getState().beginTransaction();
    for (const id of ids) {
      useExperienceStore.setState((current) => {
        const next = updatePageNodeTree(current.page.children, id, (node) => ({ ...node, hidden }));
        return syncActivePage(current, { ...current.page, children: next });
      });
    }
    usePageHistoryStore.getState().endTransaction();
    set((state) => {
      const idSet = new Set(ids);
      const remaining = hidden
        ? state.selectedPageNodeIds.filter((entry) => !idSet.has(entry))
        : Array.from(new Set([...state.selectedPageNodeIds.filter((entry) => !idSet.has(entry)), ...ids]));
      return {
        ...primarySelection(remaining[0] ?? null),
        selectedPageNodeIds: remaining,
      };
    });
  },

  removePageNodes: (ids) => {
    if (ids.length === 0) return;
    const allValid = ids.every((id) => findPageNode(get().page.children, id));
    if (!allValid) return;
    pushPageHistory();
    usePageHistoryStore.getState().beginTransaction();
    for (const id of ids) {
      useExperienceStore.setState((current) => {
        const next = removePageNodeTree(current.page.children, id);
        const nextInteractions = current.interactions.filter(
          (interaction) => interaction.sourceId !== id && interaction.targetId !== id,
        );
        return {
          ...syncActivePage(current, { ...current.page, children: next }),
          interactions: nextInteractions,
        };
      });
    }
    usePageHistoryStore.getState().endTransaction();
    set((state) => {
      const idSet = new Set(ids);
      const remaining = state.selectedPageNodeIds.filter((entry) => !idSet.has(entry));
      const fallback = remaining[0] ?? flattenPageNodes(state.page)[0]?.node.id ?? null;
      return {
        ...primarySelection(fallback),
        selectedPageNodeIds: fallback ? [fallback] : remaining,
      };
    });
  },

  duplicatePageNodes: (ids) => {
    if (ids.length === 0) return;
    const allValid = ids.every((id) => findPageNode(get().page.children, id));
    if (!allValid) return;
    pushPageHistory();
    usePageHistoryStore.getState().beginTransaction();
    const newIds: string[] = [];
    for (const id of ids) {
      const before = useExperienceStore.getState().page;
      const original = findPageNode(before.children, id);
      if (!original) continue;
      const copy = duplicatePageNodeTree(original, createId);
      const location = findPageNodeLocation(before.children, id);
      useExperienceStore.setState((current) => {
        const newPage = {
          ...current.page,
          children: insertPageNodeTree(current.page.children, location?.parentId ?? null, copy, (location?.index ?? current.page.children.length) + 1),
        };
        return syncActivePage(current, newPage);
      });
      newIds.push(copy.id);
    }
    usePageHistoryStore.getState().endTransaction();
    set((state) => ({
      ...primarySelection(newIds[0] ?? null),
      selectedPageNodeIds: newIds.length > 0 ? newIds : state.selectedPageNodeIds,
    }));
  },

  movePageNodes: (ids, direction) => {
    if (ids.length === 0) return;
    const allValid = ids.every((id) => findPageNode(get().page.children, id));
    if (!allValid) return;
    pushPageHistory();
    usePageHistoryStore.getState().beginTransaction();
    // Process in an order that produces the expected visual result.
    // For 'up' move smallest-position first; for 'down' move largest first.
    const ordered = [...ids].sort((a, b) => {
      const idxA = findPageNodeLocation(get().page.children, a)?.index ?? 0;
      const idxB = findPageNodeLocation(get().page.children, b)?.index ?? 0;
      return direction === 'up' ? idxA - idxB : idxB - idxA;
    });
    for (const id of ordered) {
      useExperienceStore.setState((current) => {
        const newPage = {
          ...current.page,
          children: movePageNodeTree(current.page.children, id, direction),
        };
        return syncActivePage(current, newPage);
      });
    }
    usePageHistoryStore.getState().endTransaction();
    set((state) => {
      const preserved = ids.filter((id) => findPageNode(state.page.children, id));
      return {
        ...primarySelection(preserved[0] ?? null),
        selectedPageNodeIds: preserved,
      };
    });
  },

  reorderPageNodes: (ids, direction) => {
    if (ids.length === 0) return;
    const allValid = ids.every((id) => findPageNode(get().page.children, id));
    if (!allValid) return;
    pushPageHistory();
    set((state) => {
      const idSet = new Set(ids);
      const reorder = (nodes: PageNode[]): PageNode[] => {
        const selected = nodes.filter((n) => idSet.has(n.id));
        const others = nodes.filter((n) => !idSet.has(n.id));
        if (selected.length === 0) return nodes;
        let next: PageNode[];
        if (direction === 'front') {
          // Bring forward: place selected after the first non-selected sibling
          const firstNonSelected = others[0];
          if (!firstNonSelected) next = nodes;
          else {
            const head = nodes.slice(0, nodes.indexOf(firstNonSelected) + 1);
            const tail = nodes.slice(nodes.indexOf(firstNonSelected) + 1);
            next = [...head, ...selected, ...tail.filter((n) => !idSet.has(n.id))];
          }
        } else if (direction === 'back') {
          // Send backward: place selected before the last non-selected sibling
          const lastNonSelected = others[others.length - 1];
          if (!lastNonSelected) next = nodes;
          else {
            const idx = nodes.indexOf(lastNonSelected);
            const head = nodes.slice(0, idx);
            const tail = nodes.slice(idx);
            next = [...head.filter((n) => !idSet.has(n.id)), ...selected, ...tail];
          }
        } else if (direction === 'top') {
          next = [...selected, ...others];
        } else {
          next = [...others, ...selected];
        }
        return next.map((n) => n.children ? { ...n, children: reorder(n.children) } : n);
      };
      const children = reorder(state.page.children);
      return {
        ...syncActivePage(state, { ...state.page, children }),
        ...primarySelection(ids[0] ?? null),
        selectedPageNodeIds: ids,
      };
    });
  },

  alignPageNodes: (ids, axis) => {
    if (ids.length < 2) return;
    const allValid = ids.every((id) => findPageNode(get().page.children, id));
    if (!allValid) return;
    const targets = ids
      .map((id) => findPageNode(get().page.children, id))
      .filter((n): n is PageNode => Boolean(n));
    if (targets.length < 2) return;
    pushPageHistory();

    const isHorizontalAxis = axis === 'left' || axis === 'centerX' || axis === 'right';
    let target: number;
    if (axis === 'left' || axis === 'top') {
      target = Math.min(...targets.map((n) => isHorizontalAxis ? toCssNumber(n.styles.base.left) : toCssNumber(n.styles.base.top)));
    } else if (axis === 'right' || axis === 'bottom') {
      target = Math.max(...targets.map((n) => isHorizontalAxis
        ? toCssNumber(n.styles.base.left) + toCssNumber(n.styles.base.width)
        : toCssNumber(n.styles.base.top) + toCssNumber(n.styles.base.height)));
    } else {
      const sum = targets.reduce((acc, n) => acc + (isHorizontalAxis
        ? toCssNumber(n.styles.base.left) + toCssNumber(n.styles.base.width) / 2
        : toCssNumber(n.styles.base.top) + toCssNumber(n.styles.base.height) / 2), 0);
      target = sum / targets.length;
    }

    usePageHistoryStore.getState().beginTransaction();
    for (const id of ids) {
      useExperienceStore.setState((current) => {
        const next = updatePageNodeTree(current.page.children, id, (node) => {
          if (axis === 'left') {
            const newLeft = target;
            const delta = newLeft - toCssNumber(node.styles.base.left);
            return { ...node, styles: { ...node.styles, base: { ...node.styles.base, left: newLeft, transform: composeTranslate(node.styles.base.transform, delta, 0) } } };
          }
          if (axis === 'right') {
            const width = toCssNumber(node.styles.base.width);
            const newLeft = target - width;
            const delta = newLeft - toCssNumber(node.styles.base.left);
            return { ...node, styles: { ...node.styles, base: { ...node.styles.base, left: newLeft, transform: composeTranslate(node.styles.base.transform, delta, 0) } } };
          }
          if (axis === 'centerX') {
            const width = toCssNumber(node.styles.base.width);
            const newLeft = target - width / 2;
            const delta = newLeft - toCssNumber(node.styles.base.left);
            return { ...node, styles: { ...node.styles, base: { ...node.styles.base, left: newLeft, transform: composeTranslate(node.styles.base.transform, delta, 0) } } };
          }
          if (axis === 'top') {
            const newTop = target;
            const delta = newTop - toCssNumber(node.styles.base.top);
            return { ...node, styles: { ...node.styles, base: { ...node.styles.base, top: newTop, transform: composeTranslate(node.styles.base.transform, 0, delta) } } };
          }
          if (axis === 'bottom') {
            const height = toCssNumber(node.styles.base.height);
            const newTop = target - height;
            const delta = newTop - toCssNumber(node.styles.base.top);
            return { ...node, styles: { ...node.styles, base: { ...node.styles.base, top: newTop, transform: composeTranslate(node.styles.base.transform, 0, delta) } } };
          }
          const height = toCssNumber(node.styles.base.height);
          const newTop = target - height / 2;
          const delta = newTop - toCssNumber(node.styles.base.top);
          return { ...node, styles: { ...node.styles, base: { ...node.styles.base, top: newTop, transform: composeTranslate(node.styles.base.transform, 0, delta) } } };
        });
        return syncActivePage(current, { ...current.page, children: next });
      });
    }
    usePageHistoryStore.getState().endTransaction();
  },

  distributePageNodes: (ids, axis) => {
    if (ids.length < 3) return;
    const allValid = ids.every((id) => findPageNode(get().page.children, id));
    if (!allValid) return;
    const targets = ids
      .map((id) => findPageNode(get().page.children, id))
      .filter((n): n is PageNode => Boolean(n));
    if (targets.length < 3) return;
    pushPageHistory();

    const isHorizontal = axis === 'horizontal';
    const sorted = [...targets].sort((a, b) => {
      const posA = isHorizontal ? toCssNumber(a.styles.base.left) : toCssNumber(a.styles.base.top);
      const posB = isHorizontal ? toCssNumber(b.styles.base.left) : toCssNumber(b.styles.base.top);
      return posA - posB;
    });
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const firstPos = isHorizontal ? toCssNumber(first.styles.base.left) : toCssNumber(first.styles.base.top);
    const lastPos = isHorizontal ? toCssNumber(last.styles.base.left) : toCssNumber(last.styles.base.top);
    const totalSpan = lastPos - firstPos;
    const step = totalSpan / (sorted.length - 1);
    const middle = sorted.slice(1, -1);

    usePageHistoryStore.getState().beginTransaction();
    for (let i = 0; i < middle.length; i += 1) {
      const node = middle[i];
      const targetPos = firstPos + step * (i + 1);
      const id = node.id;
      useExperienceStore.setState((current) => {
        const next = updatePageNodeTree(current.page.children, id, (n) => {
          if (isHorizontal) {
            const delta = targetPos - toCssNumber(n.styles.base.left);
            return { ...n, styles: { ...n.styles, base: { ...n.styles.base, left: targetPos, transform: composeTranslate(n.styles.base.transform, delta, 0) } } };
          }
          const delta = targetPos - toCssNumber(n.styles.base.top);
          return { ...n, styles: { ...n.styles, base: { ...n.styles.base, top: targetPos, transform: composeTranslate(n.styles.base.transform, 0, delta) } } };
        });
        return syncActivePage(current, { ...current.page, children: next });
      });
    }
    usePageHistoryStore.getState().endTransaction();
  },

  wrapPageNodesInContainer: (ids) => {
    if (ids.length === 0) return;
    const allValid = ids.every((id) => findPageNode(get().page.children, id));
    if (!allValid) return;
    pushPageHistory();
    const container = createPageNode('container', {
      name: 'Grupo',
      styles: {
        base: {
          display: 'flex',
          gap: 16,
          padding: 16,
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.12)',
          borderRadius: 8,
        },
      },
    });
    set((state) => {
      const idSet = new Set(ids);
      const firstLocation = findPageNodeLocation(state.page.children, ids[0]);
      const parentId = firstLocation?.parentId ?? null;
      const targetIndex = firstLocation?.index ?? 0;
      const removeFromTree = (nodes: PageNode[]): PageNode[] =>
        nodes
          .filter((n) => !idSet.has(n.id))
          .map((n) => n.children ? { ...n, children: removeFromTree(n.children) } : n);
      const withoutTop = state.page.children.map((n) => n.children ? { ...n, children: removeFromTree(n.children) } : n).filter((n) => !idSet.has(n.id));
      const next = parentId
        ? updatePageNodeTree(withoutTop, parentId, (node) => {
            const idx = Math.min(targetIndex, node.children?.length ?? 0);
            return { ...node, children: [...(node.children ?? []).slice(0, idx), container, ...(node.children ?? []).slice(idx)] };
          })
        : (() => {
            const idx = Math.min(targetIndex, withoutTop.length);
            return [...withoutTop.slice(0, idx), container, ...withoutTop.slice(idx)];
          })();
      const collected: PageNode[] = [];
      const collect = (nodes: PageNode[]) => {
        for (const n of nodes) {
          if (idSet.has(n.id)) collected.push(n);
          if (n.children) collect(n.children);
        }
      };
      collect(state.page.children);
      const filled = updatePageNodeTree(next, container.id, (node) => ({
        ...node,
        children: collected,
      }));
      return {
        ...syncActivePage(state, { ...state.page, children: filled }),
        ...primarySelection(container.id),
        selectedPageNodeIds: [container.id],
      };
    });
  },

  applyTemplate: (templateId, sceneTargetId) => {
    pushPageHistory();
    const template = instantiateTemplate(templateId, sceneTargetId);
    set((state) => {
      const page = normalizePageDocument({
        ...template.page,
        id: state.page.id,
        name: state.page.name,
        path: state.page.path,
        title: state.page.title ?? template.page.title,
        description: state.page.description ?? template.page.description,
        protected: state.page.protected,
      });
      return {
        ...syncActivePage(state, page),
        interactions: template.interactions,
        exportTarget: template.exportTarget,
        settings: { ...state.settings, exportTarget: template.exportTarget },
        ...primarySelection(flattenPageNodes(page)[0]?.node.id ?? null),
        selectedInteractionId: template.interactions[0]?.id ?? null,
      };
    });
  },

  applyPreset: (presetId) => {
    pushPageHistory();
    const preset = getVisualPreset(presetId);
    set((state) => syncActivePage(state, applyPresetToPage(state.page, preset)));
  },

  insertBlock: (blockId, parentId) => {
    const state = get();
    const preset = resolveBlockPreset(state.page.effects?.presetId);
    let node: PageNode;
    try {
      node = buildBlock(blockId, preset);
    } catch {
      return null;
    }
    pushPageHistory();
    set((s) => {
      const targetParentId = parentId ?? s.selectedPageNodeId;
      const parent = findPageNode(s.page.children, targetParentId);
      // Section-level blocks go to page root; atomic blocks nest when possible.
      const isSectionLike = node.type === 'section' || node.type === 'navbar' || node.type === 'footer';
      const canNest =
        parent &&
        !['text', 'button', 'image', 'video', 'sceneCanvas', 'input', 'select', 'textarea', 'label', 'menuitem', 'dataTable', 'dataForm', 'dataList', 'dataChart', 'dataStat'].includes(parent.type) &&
        !isSectionLike;
      const nextChildren = appendPageNode(s.page.children, canNest ? targetParentId : null, node);
      return {
        ...syncActivePage(s, { ...s.page, children: nextChildren }),
        ...primarySelection(node.id),
      };
    });
    return node;
  },

  addEffect: (type, scope = 'page') => {
    pushPageHistory();
    const def = getEffectDefinition(type);
    const newEffect = createDefaultEffect(type, scope, { zIndex: def.category === 'background' ? 0 : 40 });
    set((state) => {
      const effects: PageEffectsConfig = state.page.effects ?? { version: 1, items: [], intensity: 1 };
      return syncActivePage(state, { ...state.page, effects: { ...effects, items: [...effects.items, newEffect] } });
    });
    return newEffect;
  },

  updateEffect: (id, patch) => {
    pushPageHistory();
    set((state) => {
      if (!state.page.effects) return state;
      return syncActivePage(state, {
        ...state.page,
        effects: {
          ...state.page.effects,
          items: state.page.effects.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        },
      });
    });
  },

  updateEffectProps: (id, propsPatch) => {
    pushPageHistory();
    set((state) => {
      if (!state.page.effects) return state;
      return syncActivePage(state, {
        ...state.page,
        effects: {
          ...state.page.effects,
          items: state.page.effects.items.map((item) =>
            item.id === id ? { ...item, props: { ...item.props, ...propsPatch } } : item,
          ),
        },
      });
    });
  },

  toggleEffect: (id) => {
    pushPageHistory();
    set((state) => {
      if (!state.page.effects) return state;
      return syncActivePage(state, {
        ...state.page,
        effects: {
          ...state.page.effects,
          items: state.page.effects.items.map((item) =>
            item.id === id ? { ...item, enabled: !item.enabled } : item,
          ),
        },
      });
    });
  },

  removeEffect: (id) => {
    pushPageHistory();
    set((state) => {
      if (!state.page.effects) return state;
      return syncActivePage(state, {
        ...state.page,
        effects: { ...state.page.effects, items: state.page.effects.items.filter((item) => item.id !== id) },
      });
    });
  },

  reorderEffect: (id, direction) => {
    pushPageHistory();
    set((state) => {
      if (!state.page.effects) return state;
      const items = [...state.page.effects.items];
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return state;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= items.length) return state;
      [items[index], items[target]] = [items[target], items[index]];
      return syncActivePage(state, { ...state.page, effects: { ...state.page.effects, items } });
    });
  },

  setEffectIntensity: (intensity) => {
    pushPageHistory();
    set((state) => {
      const effects = state.page.effects ?? { version: 1, items: [], intensity: 1 };
      return syncActivePage(state, { ...state.page, effects: { ...effects, intensity: Math.max(0, Math.min(1, intensity)) } });
    });
  },

  addInteraction: (sourceId, targetId, trigger = 'hover', action = 'rotateObject3D') => {
    const pageNodes = flattenPageNodes(get().page);
    const resolvedSourceId = sourceId ?? get().selectedPageNodeId ?? pageNodes[0]?.node.id ?? 'page';
    const resolvedTargetId = targetId ?? 'current-scene';
    const interaction = createDefaultInteraction(resolvedSourceId, resolvedTargetId, trigger, action);
    pushPageHistory();
    set((state) => ({
      interactions: [...state.interactions, interaction],
      selectedInteractionId: interaction.id,
      activeMode: 'interactions',
    }));
    return interaction;
  },

  updateInteraction: (id, patch) => {
    pushPageHistory();
    set((state) => ({
      interactions: state.interactions.map((interaction) =>
        interaction.id === id ? { ...interaction, ...patch } : interaction,
      ),
    }));
  },

  setInteractionAction: (id, action) => {
    pushPageHistory();
    set((state) => ({
      interactions: state.interactions.map((interaction) =>
        interaction.id === id
          ? { ...interaction, action, params: getDefaultParamsForAction(action) }
          : interaction,
      ),
    }));
  },

  removeInteraction: (id) => {
    pushPageHistory();
    set((state) => ({
      interactions: state.interactions.filter((interaction) => interaction.id !== id),
      selectedInteractionId: state.selectedInteractionId === id
        ? state.interactions.find((interaction) => interaction.id !== id)?.id ?? null
        : state.selectedInteractionId,
    }));
  },

  createComponentFromSelection: (name, nodeIds, description) => {
    pushPageHistory();
    set((state) => {
      const selectedNodes: PageNode[] = [];
      for (const id of nodeIds) {
        const node = findPageNode(state.page.children, id);
        if (node) selectedNodes.push(node);
      }
      if (selectedNodes.length === 0) return state;
      const def = createComponentDefinition(name, selectedNodes, description);
      return { components: [...state.components, def] };
    });
  },

  addComponentInstance: (componentId, parentId) => {
    const state = get();
    const def = state.components.find((c) => c.id === componentId);
    if (!def) return null;
    const synced = syncComponentInstance(
      { id: '', type: 'container', name: def.name, props: {}, styles: { base: {} }, componentId, children: [] },
      def,
    );
    const instance: PageNode = {
      id: createId(),
      type: 'container',
      name: def.name,
      props: {},
      styles: { base: {} },
      componentId,
      children: synced.children,
    };
    const targetParentId = parentId ?? state.selectedPageNodeId;
    pushPageHistory();
    set((s) => {
      const parent = findPageNode(s.page.children, targetParentId);
      const canNest = parent && !['text', 'button', 'image', 'video', 'sceneCanvas', 'input', 'select', 'textarea', 'label', 'menuitem', 'dataTable', 'dataForm', 'dataList', 'dataChart', 'dataStat'].includes(parent.type);
      return {
        ...syncActivePage(s, {
          ...s.page,
          children: appendPageNode(s.page.children, canNest ? targetParentId : null, instance),
        }),
        ...primarySelection(instance.id),
      };
    });
    return instance;
  },

  updateComponent: (id, patch) => {
    pushPageHistory();
    set((state) => ({
      components: state.components.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  },

  removeComponent: (id) => {
    pushPageHistory();
    set((state) => ({
      components: state.components.filter((c) => c.id !== id),
    }));
  },

  syncComponentInstances: (componentId) => {
    pushPageHistory();
    set((state) => {
      const def = state.components.find((c) => c.id === componentId);
      if (!def) return state;
      const updateChildren = (nodes: PageNode[]): PageNode[] =>
        nodes.map((node) => {
          if (node.componentId === componentId) {
            return syncComponentInstance(node, def);
          }
          return { ...node, children: node.children ? updateChildren(node.children) : undefined };
        });
      return syncActivePage(state, { ...state.page, children: updateChildren(state.page.children) });
    });
  },

  detachComponentInstance: (instanceNodeId) => {
    pushPageHistory();
    set((state) => {
      const updateChildren = (nodes: PageNode[]): PageNode[] =>
        nodes.map((node) => {
          if (node.id === instanceNodeId) {
            return detachComponentInstance(node);
          }
          return { ...node, children: node.children ? updateChildren(node.children) : undefined };
        });
      return syncActivePage(state, { ...state.page, children: updateChildren(state.page.children) });
    });
  },
}));
