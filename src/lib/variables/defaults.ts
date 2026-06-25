import { createId } from '@/store/types';
import type { AppVariable, VariableDocument, VariableType } from './types';

export const createAppVariable = (
  label = 'Nova variavel',
  type: VariableType = 'string',
  overrides: Partial<AppVariable> = {},
): AppVariable => ({
  id: overrides.id ?? createId(),
  name: overrides.name ?? (label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'variable'),
  label,
  scope: overrides.scope ?? 'global',
  type,
  value: overrides.value ?? (type === 'number' ? 0 : type === 'boolean' ? false : type === 'array' ? [] : type === 'json' ? {} : ''),
  expression: overrides.expression,
  description: overrides.description,
});

export const createDefaultVariableDocument = (): VariableDocument => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  variables: [
    createAppVariable('Usuario logado', 'boolean', { name: 'isLoggedIn', value: false, scope: 'session' }),
    createAppVariable('Mensagem de status', 'string', { name: 'statusMessage', value: 'Pronto', scope: 'page' }),
    createAppVariable('Carregando', 'boolean', { name: 'isLoading', value: false, scope: 'page' }),
  ],
});

export const cloneVariableDocument = (document: VariableDocument): VariableDocument => ({
  ...document,
  variables: document.variables.map((variable) => ({
    ...variable,
    value: Array.isArray(variable.value)
      ? [...variable.value]
      : variable.value && typeof variable.value === 'object'
        ? { ...(variable.value as Record<string, unknown>) }
        : variable.value,
  })),
});
