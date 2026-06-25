import { create } from 'zustand';
import {
  cloneVariableDocument,
  createAppVariable,
  createDefaultVariableDocument,
} from '@/lib/variables/defaults';
import type { AppVariable, VariableDocument, VariableType } from '@/lib/variables/types';

type VariablePatch = Partial<Omit<AppVariable, 'id'>>;

type VariableState = {
  document: VariableDocument;
  selectedVariableId: string | null;
  loadVariables: (document?: VariableDocument | null) => void;
  resetVariables: () => void;
  setSelectedVariable: (id: string | null) => void;
  addVariable: (label?: string, type?: VariableType) => AppVariable;
  updateVariable: (id: string, patch: VariablePatch) => void;
  removeVariable: (id: string) => void;
  setVariableValue: (name: string, value: AppVariable['value']) => void;
  incrementVariable: (name: string, amount?: number) => void;
  toggleVariable: (name: string) => void;
};

const touch = (document: VariableDocument): VariableDocument => ({
  ...document,
  updatedAt: new Date().toISOString(),
});

export const useVariableStore = create<VariableState>((set) => {
  const initial = createDefaultVariableDocument();
  return {
    document: initial,
    selectedVariableId: initial.variables[0]?.id ?? null,

    loadVariables: (document) => {
      const next = cloneVariableDocument(document ?? createDefaultVariableDocument());
      set({ document: next, selectedVariableId: next.variables[0]?.id ?? null });
    },

    resetVariables: () => {
      const next = createDefaultVariableDocument();
      set({ document: next, selectedVariableId: next.variables[0]?.id ?? null });
    },

    setSelectedVariable: (selectedVariableId) => set({ selectedVariableId }),

    addVariable: (label = 'Nova variavel', type = 'string') => {
      const variable = createAppVariable(label, type);
      set((state) => ({
        document: touch({ ...state.document, variables: [...state.document.variables, variable] }),
        selectedVariableId: variable.id,
      }));
      return variable;
    },

    updateVariable: (id, patch) =>
      set((state) => ({
        document: touch({
          ...state.document,
          variables: state.document.variables.map((variable) =>
            variable.id === id ? { ...variable, ...patch } : variable,
          ),
        }),
      })),

    removeVariable: (id) =>
      set((state) => {
        const variables = state.document.variables.filter((variable) => variable.id !== id);
        return {
          document: touch({ ...state.document, variables }),
          selectedVariableId: state.selectedVariableId === id ? variables[0]?.id ?? null : state.selectedVariableId,
        };
      }),

    setVariableValue: (name, value) =>
      set((state) => ({
        document: touch({
          ...state.document,
          variables: state.document.variables.map((variable) =>
            variable.name === name ? { ...variable, value } : variable,
          ),
        }),
      })),

    incrementVariable: (name, amount = 1) =>
      set((state) => ({
        document: touch({
          ...state.document,
          variables: state.document.variables.map((variable) =>
            variable.name === name
              ? { ...variable, value: Number(variable.value || 0) + amount, type: 'number' }
              : variable,
          ),
        }),
      })),

    toggleVariable: (name) =>
      set((state) => ({
        document: touch({
          ...state.document,
          variables: state.document.variables.map((variable) =>
            variable.name === name
              ? { ...variable, value: !Boolean(variable.value), type: 'boolean' }
              : variable,
          ),
        }),
      })),
  };
});
