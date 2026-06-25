import { createId } from '@/store/types';
import type {
  DataCollection,
  DataField,
  DataFieldType,
  DataSchema,
  SavedQuery,
} from './types';

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'collection';

export const createDataField = (
  label = 'Novo campo',
  type: DataFieldType = 'string',
  overrides: Partial<DataField> = {},
): DataField => ({
  id: overrides.id ?? createId(),
  name: overrides.name ?? slugify(label),
  label,
  type,
  required: overrides.required ?? false,
  defaultValue: overrides.defaultValue,
  enumValues: overrides.enumValues,
  validation: overrides.validation ? { ...overrides.validation } : undefined,
  relation: overrides.relation ? { ...overrides.relation } : undefined,
  uiHint: overrides.uiHint,
  system: overrides.system,
  description: overrides.description,
});

export const createSystemField = (name: string, label: string, type: DataFieldType): DataField =>
  createDataField(label, type, {
    name,
    required: true,
    system: true,
    uiHint: name === 'id' || name.endsWith('At') ? 'readonly' : undefined,
  });

export const createDataCollection = (
  label = 'Nova colecao',
  overrides: Partial<DataCollection> = {},
): DataCollection => {
  const idField = createSystemField('id', 'ID', 'string');
  const createdAt = createSystemField('createdAt', 'Criado em', 'datetime');
  const updatedAt = createSystemField('updatedAt', 'Atualizado em', 'datetime');

  return {
    id: overrides.id ?? createId(),
    name: overrides.name ?? slugify(label),
    label,
    description: overrides.description ?? '',
    fields: overrides.fields ?? [idField, createdAt, updatedAt],
    queries: overrides.queries ?? [],
    config: {
      timestamps: true,
      softDelete: false,
      publicRead: false,
      publicWrite: false,
      ...(overrides.config ?? {}),
    },
  };
};

export const createSavedQuery = (collectionId: string, name = 'Nova query'): SavedQuery => ({
  id: createId(),
  name,
  collectionId,
  filters: [],
  sort: [],
  limit: 50,
});

export const createDefaultDataSchema = (name = 'App Data'): DataSchema => ({
  version: 1,
  name,
  provider: 'sqlite',
  ormTarget: 'prisma',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  collections: [
    createDataCollection('Leads', {
      name: 'leads',
      description: 'Contatos enviados pelo site ou landing page.',
      config: { timestamps: true, publicRead: false, publicWrite: true, color: '#34d399', icon: 'users' },
      fields: [
        createSystemField('id', 'ID', 'string'),
        createDataField('Nome', 'string', { name: 'name', required: true, uiHint: 'input' }),
        createDataField('Email', 'email', { name: 'email', required: true, validation: { unique: false }, uiHint: 'input' }),
        createDataField('Mensagem', 'text', { name: 'message', uiHint: 'textarea' }),
        createSystemField('createdAt', 'Criado em', 'datetime'),
        createSystemField('updatedAt', 'Atualizado em', 'datetime'),
      ],
    }),
  ],
});

export const cloneDataSchema = (schema: DataSchema): DataSchema => ({
  ...schema,
  collections: schema.collections.map((collection) => ({
    ...collection,
    config: { ...collection.config },
    fields: collection.fields.map((field) => ({
      ...field,
      enumValues: field.enumValues ? [...field.enumValues] : undefined,
      validation: field.validation ? { ...field.validation } : undefined,
      relation: field.relation ? { ...field.relation } : undefined,
    })),
    queries: collection.queries.map((query) => ({
      ...query,
      filters: query.filters.map((filter) => ({ ...filter })),
      sort: query.sort?.map((sort) => ({ ...sort })),
    })),
  })),
});
