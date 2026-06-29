import { create } from 'zustand';
import type { ComponentDefinition, PageDocument } from '@/lib/page-builder/types';
import type { InteractionDocument } from '@/lib/interaction-engine/types';
import { useExperienceStore } from './experienceStore';

export type PageHistorySnapshot = {
  page: PageDocument;
  pages: PageDocument[];
  activePageId: string;
  selectedPageNodeId: string | null;
  selectedInteractionId: string | null;
  interactions: InteractionDocument[];
  components: ComponentDefinition[];
};

const MAX_STACK = 80;

const cloneResponsiveStyles = (value: unknown): unknown => {
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      out[key] = { ...(nested as Record<string, unknown>) };
    } else {
      out[key] = nested;
    }
  }
  return out;
};

const clonePageNode = (node: PageDocument['children'][number]): PageDocument['children'][number] => ({
  ...node,
  props: { ...(node.props ?? {}) },
  styles: cloneResponsiveStyles(node.styles) as PageDocument['children'][number]['styles'],
  pseudo: node.pseudo ? (cloneResponsiveStyles(node.pseudo) as PageDocument['children'][number]['pseudo']) : undefined,
  responsive: node.responsive ? ({ ...node.responsive }) : undefined,
  children: node.children ? node.children.map(clonePageNode) : undefined,
  instanceOverrides: node.instanceOverrides ? { ...node.instanceOverrides } : undefined,
});

const clonePage = (page: PageDocument): PageDocument => ({
  ...page,
  children: page.children.map(clonePageNode),
  responsive: page.responsive.map((bp) => ({ ...bp })),
  effects: page.effects ? JSON.parse(JSON.stringify(page.effects)) : undefined,
});

const clonePages = (pages: PageDocument[]): PageDocument[] => pages.map(clonePage);

const cloneInteraction = (interaction: InteractionDocument): InteractionDocument => ({
  ...interaction,
  params: { ...(interaction.params ?? {}) },
});

const cloneComponent = (component: ComponentDefinition): ComponentDefinition => ({
  ...component,
  nodes: component.nodes.map(clonePageNode),
});

const captureSnapshot = (): PageHistorySnapshot => {
  const state = useExperienceStore.getState();
  return {
    page: clonePage(state.page),
    pages: clonePages(state.pages),
    activePageId: state.activePageId,
    selectedPageNodeId: state.selectedPageNodeId,
    selectedInteractionId: state.selectedInteractionId,
    interactions: state.interactions.map(cloneInteraction),
    components: state.components.map(cloneComponent),
  };
};

const restoreSnapshot = (snapshot: PageHistorySnapshot) => {
  const state = useExperienceStore.getState();
  const nextPage = snapshot.pages.find((candidate) => candidate.id === snapshot.activePageId) ?? snapshot.page;
  useExperienceStore.setState({
    page: clonePage(nextPage),
    pages: clonePages(snapshot.pages),
    activePageId: nextPage.id,
    selectedPageNodeId: snapshot.selectedPageNodeId,
    selectedInteractionId: snapshot.selectedInteractionId,
    interactions: snapshot.interactions.map(cloneInteraction),
    components: snapshot.components.map(cloneComponent),
  });
  // Reference state to satisfy unused-var lint when consumers swap implementations.
  void state;
};

type PageHistoryState = {
  undoStack: PageHistorySnapshot[];
  redoStack: PageHistorySnapshot[];
  isApplying: boolean;
  transactionDepth: number;
  pushSnapshot: () => void;
  beginTransaction: () => void;
  endTransaction: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  beginMutation: () => void;
};

export const usePageHistoryStore = create<PageHistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  isApplying: false,
  transactionDepth: 0,

  pushSnapshot: () => {
    get().beginMutation();
  },

  beginMutation: () => {
    if (get().isApplying) return;
    if (get().transactionDepth > 0) return;
    const snapshot = captureSnapshot();
    set((state) => ({
      undoStack: [...state.undoStack, snapshot].slice(-MAX_STACK),
      redoStack: [],
    }));
  },

  beginTransaction: () => {
    if (get().isApplying) return;
    if (get().transactionDepth > 0) {
      set((state) => ({ transactionDepth: state.transactionDepth + 1 }));
      return;
    }
    const snapshot = captureSnapshot();
    set((state) => ({
      undoStack: [...state.undoStack, snapshot].slice(-MAX_STACK),
      redoStack: [],
      transactionDepth: 1,
    }));
  },

  endTransaction: () => {
    set((state) => ({ transactionDepth: Math.max(0, state.transactionDepth - 1) }));
  },

  undo: () => {
    const { undoStack, redoStack, isApplying } = get();
    if (isApplying) return;
    const previous = undoStack.at(-1);
    if (!previous) return;
    const current = captureSnapshot();
    set({ isApplying: true });
    restoreSnapshot(previous);
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, current].slice(-MAX_STACK),
      isApplying: false,
      transactionDepth: 0,
    });
  },

  redo: () => {
    const { undoStack, redoStack, isApplying } = get();
    if (isApplying) return;
    const next = redoStack.at(-1);
    if (!next) return;
    const current = captureSnapshot();
    set({ isApplying: true });
    restoreSnapshot(next);
    set({
      undoStack: [...undoStack, current].slice(-MAX_STACK),
      redoStack: redoStack.slice(0, -1),
      isApplying: false,
      transactionDepth: 0,
    });
  },

  clear: () => set({ undoStack: [], redoStack: [], transactionDepth: 0 }),
}));

export const PAGE_HISTORY_MAX_STACK = MAX_STACK;
