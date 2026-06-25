import type { DataCollection, DataField, DataSchema, SavedQuery } from './types';

export type DataRecord = Record<string, unknown>;

const sampleValue = (field: DataField, index: number): unknown => {
  if (field.name === 'id') return `rec_${index + 1}`;
  if (field.type === 'number') return (index + 1) * 12;
  if (field.type === 'boolean') return index % 2 === 0;
  if (field.type === 'date') return new Date(Date.now() - index * 86400000).toISOString().slice(0, 10);
  if (field.type === 'datetime') return new Date(Date.now() - index * 3600000).toISOString();
  if (field.type === 'email') return `contato${index + 1}@example.com`;
  if (field.type === 'url') return 'https://example.com';
  if (field.type === 'image') return '';
  if (field.type === 'enum') return field.enumValues?.[index % Math.max(field.enumValues.length, 1)] ?? 'ativo';
  if (field.type === 'json') return { sample: true };
  if (field.name.toLowerCase().includes('name') || field.label.toLowerCase().includes('nome')) return `Item ${index + 1}`;
  if (field.name.toLowerCase().includes('message') || field.label.toLowerCase().includes('mensagem')) return `Mensagem de exemplo ${index + 1}`;
  return `${field.label} ${index + 1}`;
};

export const createPreviewRecords = (collection: DataCollection, count = 4): DataRecord[] =>
  Array.from({ length: count }, (_item, index) =>
    Object.fromEntries(collection.fields.map((field) => [field.name, sampleValue(field, index)])),
  );

export const findCollection = (schema: DataSchema | null | undefined, collectionRef: unknown): DataCollection | null => {
  if (!schema || typeof collectionRef !== 'string' || !collectionRef) return schema?.collections[0] ?? null;
  return schema.collections.find((collection) => collection.id === collectionRef || collection.name === collectionRef) ?? null;
};

export const findQuery = (collection: DataCollection | null, queryRef: unknown): SavedQuery | null => {
  if (!collection || typeof queryRef !== 'string' || !queryRef) return null;
  return collection.queries.find((query) => query.id === queryRef || query.name === queryRef) ?? null;
};

const matchesFilter = (record: DataRecord, fieldName: string, operator: string, value: unknown): boolean => {
  const current = record[fieldName];
  const currentText = String(current ?? '').toLowerCase();
  const expectedText = String(value ?? '').toLowerCase();
  if (operator === 'equals') return current === value || currentText === expectedText;
  if (operator === 'notEquals') return current !== value && currentText !== expectedText;
  if (operator === 'contains') return currentText.includes(expectedText);
  if (operator === 'startsWith') return currentText.startsWith(expectedText);
  if (operator === 'endsWith') return currentText.endsWith(expectedText);
  if (operator === 'greaterThan') return Number(current) > Number(value);
  if (operator === 'greaterThanOrEqual') return Number(current) >= Number(value);
  if (operator === 'lessThan') return Number(current) < Number(value);
  if (operator === 'lessThanOrEqual') return Number(current) <= Number(value);
  if (operator === 'isEmpty') return current === undefined || current === null || current === '';
  if (operator === 'isNotEmpty') return current !== undefined && current !== null && current !== '';
  return true;
};

export const applySavedQuery = (collection: DataCollection, query: SavedQuery | null, records: DataRecord[]): DataRecord[] => {
  if (!query) return records;
  const byId = new Map(collection.fields.map((field) => [field.id, field]));
  let next = records.filter((record) =>
    query.filters.every((filter) => {
      const field = byId.get(filter.fieldId);
      return field ? matchesFilter(record, field.name, filter.operator, filter.value) : true;
    }),
  );

  for (const sort of query.sort ?? []) {
    const field = byId.get(sort.fieldId);
    if (!field) continue;
    next = [...next].sort((a, b) => {
      const av = String(a[field.name] ?? '');
      const bv = String(b[field.name] ?? '');
      return sort.direction === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }

  return typeof query.limit === 'number' ? next.slice(0, query.limit) : next;
};

export const displayDataValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const collectionToName = (schema: DataSchema | null | undefined, collectionId: string): string =>
  schema?.collections.find((collection) => collection.id === collectionId || collection.name === collectionId)?.name ?? collectionId;
