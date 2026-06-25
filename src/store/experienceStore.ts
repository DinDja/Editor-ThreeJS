import { create } from 'zustand';
import { createDefaultInteraction, getDefaultParamsForAction } from '@/lib/interaction-engine/defaults';
import type { InteractionAction, InteractionDocument, InteractionTrigger } from '@/lib/interaction-engine/types';
import { createDefaultPageDocument, createDefaultProjectSettings, createPageNode } from '@/lib/page-builder/defaults';
import {
  appendPageNode,
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
  updatePageNodeTree,
} from '@/lib/page-builder/tree';
import type { EditorMode, ExportTarget, PageDocument, PageEffect, PageEffectsConfig, PageNode, PageNodeType, PreviewDevice, ProjectSettings } from '@/lib/page-builder/types';
import { createDefaultEffect, getEffectDefinition } from '@/lib/effects-system/registry';
import type { EffectType } from '@/lib/effects-system/types';
import { instantiateTemplate, type ExperienceTemplateId } from '@/lib/template-engine/templates';
import { applyPresetToPage } from '@/lib/template-engine/sections';
import { getVisualPreset, type VisualPresetId } from '@/lib/template-engine/presets';
import { createId } from './types';

type InteractionPatch = Partial<Omit<InteractionDocument, 'id'>>;

type ExperienceState = {
  activeMode: EditorMode;
  page: PageDocument;
  interactions: InteractionDocument[];
  settings: ProjectSettings;
  selectedPageNodeId: string | null;
  selectedInteractionId: string | null;
  previewDevice: PreviewDevice;
  exportTarget: ExportTarget;
  setActiveMode: (mode: EditorMode) => void;
  setSelectedPageNode: (id: string | null) => void;
  selectParentPageNode: () => void;
  setSelectedInteraction: (id: string | null) => void;
  setPreviewDevice: (device: PreviewDevice) => void;
  setExportTarget: (target: ExportTarget) => void;
  updateSettings: (patch: Partial<ProjectSettings>) => void;
  loadExperience: (experience: { page: PageDocument; interactions: InteractionDocument[]; settings: ProjectSettings; activeMode?: EditorMode }) => void;
  addPageNode: (type: PageNodeType, parentId?: string | null) => PageNode;
  updatePageNode: (id: string, patch: Partial<Omit<PageNode, 'id' | 'children'>> & { children?: PageNode[] }) => void;
  updatePageNodeStyle: (id: string, patch: Partial<PageNode['styles']['base']>, breakpoint?: 'base' | 'tablet' | 'mobile') => void;
  updatePageNodeProps: (id: string, patch: Record<string, unknown>) => void;
  movePageNode: (id: string, direction: PageNodeMoveDirection) => void;
  reparentPageNode: (id: string, newParentId: string | null, index?: number) => void;
  removePageNode: (id: string) => void;
  duplicatePageNode: (id: string) => void;
  resetPage: () => void;
  applyTemplate: (templateId: ExperienceTemplateId, sceneTargetId?: string) => void;
  applyPreset: (presetId: VisualPresetId) => void;
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
};

const defaultPage = createDefaultPageDocument();
const firstPageNodeId = flattenPageNodes(defaultPage)[0]?.node.id ?? null;

export const useExperienceStore = create<ExperienceState>((set, get) => ({
  activeMode: 'scene',
  page: defaultPage,
  interactions: [],
  settings: createDefaultProjectSettings(),
  selectedPageNodeId: firstPageNodeId,
  selectedInteractionId: null,
  previewDevice: 'desktop',
  exportTarget: 'next',

  setActiveMode: (activeMode) => set({ activeMode }),
  setSelectedPageNode: (selectedPageNodeId) => set({ selectedPageNodeId }),
  selectParentPageNode: () =>
    set((state) => {
      const parent = findParentPageNode(state.page.children, state.selectedPageNodeId);
      return parent ? { selectedPageNodeId: parent.id } : state;
    }),
  setSelectedInteraction: (selectedInteractionId) => set({ selectedInteractionId }),
  setPreviewDevice: (previewDevice) => set({ previewDevice }),
  setExportTarget: (exportTarget) =>
    set((state) => ({
      exportTarget,
      settings: { ...state.settings, exportTarget },
    })),
  updateSettings: (patch) =>
    set((state) => ({
      settings: { ...state.settings, ...patch },
    })),

  loadExperience: ({ page, interactions, settings, activeMode }) =>
    set((state) => ({
      page,
      interactions,
      settings,
      exportTarget: settings.exportTarget,
      activeMode: activeMode ?? state.activeMode,
      selectedPageNodeId: flattenPageNodes(page)[0]?.node.id ?? null,
      selectedInteractionId: interactions[0]?.id ?? null,
    })),

  addPageNode: (type, parentId = get().selectedPageNodeId) => {
    const node = createPageNode(type);
    set((state) => {
      const parent = findPageNode(state.page.children, parentId);
      const canNest = parent && !['text', 'button', 'image', 'video', 'sceneCanvas'].includes(parent.type);
      const nextChildren = appendPageNode(state.page.children, canNest ? parentId : null, node);
      return {
        page: { ...state.page, children: nextChildren },
        selectedPageNodeId: node.id,
      };
    });
    return node;
  },

  updatePageNode: (id, patch) =>
    set((state) => ({
      page: {
        ...state.page,
        children: updatePageNodeTree(state.page.children, id, (node) => ({
          ...node,
          ...patch,
          props: patch.props ? { ...node.props, ...patch.props } : node.props,
          styles: patch.styles
            ? {
                base: { ...node.styles.base, ...(patch.styles.base ?? {}) },
                tablet: { ...(node.styles.tablet ?? {}), ...(patch.styles.tablet ?? {}) },
                mobile: { ...(node.styles.mobile ?? {}), ...(patch.styles.mobile ?? {}) },
              }
            : node.styles,
        })),
      },
    })),

  updatePageNodeStyle: (id, patch, breakpoint = 'base') =>
    set((state) => ({
      page: {
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
      },
    })),

  updatePageNodeProps: (id, patch) =>
    set((state) => ({
      page: {
        ...state.page,
        children: updatePageNodeTree(state.page.children, id, (node) => ({
          ...node,
          props: { ...node.props, ...patch },
        })),
      },
    })),

  movePageNode: (id, direction) =>
    set((state) => ({
      page: {
        ...state.page,
        children: movePageNodeTree(state.page.children, id, direction),
      },
      selectedPageNodeId: id,
    })),

  reparentPageNode: (id, newParentId, index) =>
    set((state) => ({
      page: {
        ...state.page,
        children: reparentPageNodeTree(state.page.children, id, newParentId, index),
      },
      selectedPageNodeId: id,
    })),

  removePageNode: (id) =>
    set((state) => {
      const nextChildren = removePageNodeTree(state.page.children, id);
      const selectedPageNodeId = state.selectedPageNodeId === id
        ? flattenPageNodes({ ...state.page, children: nextChildren })[0]?.node.id ?? null
        : state.selectedPageNodeId;
      return {
        page: { ...state.page, children: nextChildren },
        selectedPageNodeId,
        interactions: state.interactions.filter((interaction) => interaction.sourceId !== id && interaction.targetId !== id),
      };
    }),

  duplicatePageNode: (id) =>
    set((state) => {
      const original = findPageNode(state.page.children, id);
      const location = findPageNodeLocation(state.page.children, id);
      if (!original) return state;
      const copy = duplicatePageNodeTree(original, createId);
      return {
        page: {
          ...state.page,
          children: insertPageNodeTree(state.page.children, location?.parentId ?? null, copy, (location?.index ?? state.page.children.length) + 1),
        },
        selectedPageNodeId: copy.id,
      };
    }),

  resetPage: () => {
    const page = createDefaultPageDocument();
    set({
      page,
      selectedPageNodeId: flattenPageNodes(page)[0]?.node.id ?? null,
      interactions: [],
      selectedInteractionId: null,
    });
  },

  applyTemplate: (templateId, sceneTargetId) => {
    const template = instantiateTemplate(templateId, sceneTargetId);
    set((state) => ({
      page: template.page,
      interactions: template.interactions,
      exportTarget: template.exportTarget,
      settings: { ...state.settings, exportTarget: template.exportTarget },
      selectedPageNodeId: flattenPageNodes(template.page)[0]?.node.id ?? null,
      selectedInteractionId: template.interactions[0]?.id ?? null,
    }));
  },

  applyPreset: (presetId) => {
    const preset = getVisualPreset(presetId);
    set((state) => ({ page: applyPresetToPage(state.page, preset) }));
  },

  addEffect: (type, scope = 'page') => {
    const def = getEffectDefinition(type);
    const newEffect = createDefaultEffect(type, scope, { zIndex: def.category === 'background' ? 0 : 40 });
    set((state) => {
      const effects: PageEffectsConfig = state.page.effects ?? { version: 1, items: [], intensity: 1 };
      return {
        page: { ...state.page, effects: { ...effects, items: [...effects.items, newEffect] } },
      };
    });
    return newEffect;
  },

  updateEffect: (id, patch) =>
    set((state) => {
      if (!state.page.effects) return state;
      return {
        page: {
          ...state.page,
          effects: {
            ...state.page.effects,
            items: state.page.effects.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
          },
        },
      };
    }),

  updateEffectProps: (id, propsPatch) =>
    set((state) => {
      if (!state.page.effects) return state;
      return {
        page: {
          ...state.page,
          effects: {
            ...state.page.effects,
            items: state.page.effects.items.map((item) =>
              item.id === id ? { ...item, props: { ...item.props, ...propsPatch } } : item,
            ),
          },
        },
      };
    }),

  toggleEffect: (id) =>
    set((state) => {
      if (!state.page.effects) return state;
      return {
        page: {
          ...state.page,
          effects: {
            ...state.page.effects,
            items: state.page.effects.items.map((item) =>
              item.id === id ? { ...item, enabled: !item.enabled } : item,
            ),
          },
        },
      };
    }),

  removeEffect: (id) =>
    set((state) => {
      if (!state.page.effects) return state;
      return {
        page: {
          ...state.page,
          effects: { ...state.page.effects, items: state.page.effects.items.filter((item) => item.id !== id) },
        },
      };
    }),

  reorderEffect: (id, direction) =>
    set((state) => {
      if (!state.page.effects) return state;
      const items = [...state.page.effects.items];
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return state;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= items.length) return state;
      [items[index], items[target]] = [items[target], items[index]];
      return { page: { ...state.page, effects: { ...state.page.effects, items } } };
    }),

  setEffectIntensity: (intensity) =>
    set((state) => {
      const effects = state.page.effects ?? { version: 1, items: [], intensity: 1 };
      return { page: { ...state.page, effects: { ...effects, intensity: Math.max(0, Math.min(1, intensity)) } } };
    }),

  addInteraction: (sourceId, targetId, trigger = 'hover', action = 'rotateObject3D') => {
    const pageNodes = flattenPageNodes(get().page);
    const resolvedSourceId = sourceId ?? get().selectedPageNodeId ?? pageNodes[0]?.node.id ?? 'page';
    const resolvedTargetId = targetId ?? 'current-scene';
    const interaction = createDefaultInteraction(resolvedSourceId, resolvedTargetId, trigger, action);
    set((state) => ({
      interactions: [...state.interactions, interaction],
      selectedInteractionId: interaction.id,
      activeMode: 'interactions',
    }));
    return interaction;
  },

  updateInteraction: (id, patch) =>
    set((state) => ({
      interactions: state.interactions.map((interaction) =>
        interaction.id === id ? { ...interaction, ...patch } : interaction,
      ),
    })),

  setInteractionAction: (id, action) =>
    set((state) => ({
      interactions: state.interactions.map((interaction) =>
        interaction.id === id
          ? { ...interaction, action, params: getDefaultParamsForAction(action) }
          : interaction,
      ),
    })),

  removeInteraction: (id) =>
    set((state) => ({
      interactions: state.interactions.filter((interaction) => interaction.id !== id),
      selectedInteractionId: state.selectedInteractionId === id
        ? state.interactions.find((interaction) => interaction.id !== id)?.id ?? null
        : state.selectedInteractionId,
    })),
}));
