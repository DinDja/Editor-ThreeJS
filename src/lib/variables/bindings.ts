import type { VariableDocument } from './types';

export type BindingContext = {
  variables?: VariableDocument | null;
  record?: Record<string, unknown> | null;
  collections?: Record<string, unknown[]>;
};

const valueFromPath = (source: unknown, path: string[]): unknown => {
  let current = source;
  for (const part of path) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
};

export const getBindingValue = (expression: string, context: BindingContext): unknown => {
  const key = expression.trim();
  if (!key) return '';

  if (key.startsWith('record.')) return valueFromPath(context.record, key.slice(7).split('.'));
  if (key.startsWith('vars.')) {
    const name = key.slice(5);
    return context.variables?.variables.find((variable) => variable.name === name)?.value;
  }
  if (key.startsWith('collections.')) {
    const [, collectionName, prop] = key.split('.');
    const collection = context.collections?.[collectionName] ?? [];
    if (prop === 'count') return collection.length;
    return collection;
  }

  return (
    context.variables?.variables.find((variable) => variable.name === key)?.value ??
    valueFromPath(context.record, key.split('.')) ??
    ''
  );
};

export const resolveBindingString = (value: string, context: BindingContext): string =>
  value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, expression: string) => {
    const resolved = getBindingValue(expression, context);
    if (resolved === undefined || resolved === null) return '';
    if (typeof resolved === 'object') return JSON.stringify(resolved);
    return String(resolved);
  });

export const resolveMaybeBinding = (value: unknown, context: BindingContext): unknown => {
  if (typeof value !== 'string') return value;
  const exact = value.match(/^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/);
  if (exact) return getBindingValue(exact[1], context);
  return resolveBindingString(value, context);
};
