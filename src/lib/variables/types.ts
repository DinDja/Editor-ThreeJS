export type VariableScope = 'global' | 'page' | 'session' | 'derived';

export type VariableType = 'string' | 'number' | 'boolean' | 'json' | 'array';

export type AppVariable = {
  id: string;
  name: string;
  label: string;
  scope: VariableScope;
  type: VariableType;
  value: string | number | boolean | Record<string, unknown> | unknown[];
  expression?: string;
  description?: string;
};

export type VariableDocument = {
  version: 1;
  variables: AppVariable[];
  updatedAt: string;
};

export const VARIABLE_TYPES: VariableType[] = ['string', 'number', 'boolean', 'json', 'array'];

export const VARIABLE_SCOPES: VariableScope[] = ['global', 'page', 'session', 'derived'];
