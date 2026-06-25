import { create } from 'zustand';
import {
  cloneDataSchema,
  createDataCollection,
  createDataField,
  createDefaultDataSchema,
  createSavedQuery,
} from '@/lib/data-model/defaults';
import type {
  DataCollection,
  DataField,
  DataFieldType,
  DataSchema,
  QueryFilter,
  SavedQuery,
} from '@/lib/data-model/types';
import { createId } from './types';

type DataSchemaPatch = Partial<Pick<DataSchema, 'name' | 'provider' | 'ormTarget'>>;
type CollectionPatch = Partial<Omit<DataCollection, 'id' | 'fields' | 'queries'>>;
type FieldPatch = Partial<Omit<DataField, 'id'>>;
type QueryPatch = Partial<Omit<SavedQuery, 'id'>>;

type DataModelState = {
  schema: DataSchema;
  selectedCollectionId: string | null;
  selectedFieldId: string | null;
  selectedQueryId: string | null;
  loadSchema: (schema?: DataSchema | null) => void;
  resetSchema: () => void;
  updateSchema: (patch: DataSchemaPatch) => void;
  setSelectedCollection: (collectionId: string | null) => void;
  setSelectedField: (fieldId: string | null) => void;
  setSelectedQuery: (queryId: string | null) => void;
  addCollection: (label?: string) => DataCollection;
  updateCollection: (collectionId: string, patch: CollectionPatch) => void;
  removeCollection: (collectionId: string) => void;
  addField: (collectionId: string, label?: string, type?: DataFieldType) => DataField | null;
  updateField: (collectionId: string, fieldId: string, patch: FieldPatch) => void;
  removeField: (collectionId: string, fieldId: string) => void;
  moveField: (collectionId: string, fieldId: string, direction: 'up' | 'down') => void;
  addSavedQuery: (collectionId: string, name?: string) => SavedQuery | null;
  updateSavedQuery: (collectionId: string, queryId: string, patch: QueryPatch) => void;
  removeSavedQuery: (collectionId: string, queryId: string) => void;
  addQueryFilter: (collectionId: string, queryId: string, fieldId: string) => void;
  updateQueryFilter: (collectionId: string, queryId: string, filterId: string, patch: Partial<QueryFilter>) => void;
  removeQueryFilter: (collectionId: string, queryId: string, filterId: string) => void;
};

const touch = (schema: DataSchema): DataSchema => ({
  ...schema,
  updatedAt: new Date().toISOString(),
});

const firstCollectionId = (schema: DataSchema) => schema.collections[0]?.id ?? null;
const firstFieldId = (schema: DataSchema, collectionId: string | null) =>
  schema.collections.find((collection) => collection.id === collectionId)?.fields[0]?.id ?? null;

export const useDataModelStore = create<DataModelState>((set, get) => {
  const initial = createDefaultDataSchema();
  const initialCollectionId = firstCollectionId(initial);

  return {
    schema: initial,
    selectedCollectionId: initialCollectionId,
    selectedFieldId: firstFieldId(initial, initialCollectionId),
    selectedQueryId: null,

    loadSchema: (schema) => {
      const next = cloneDataSchema(schema ?? createDefaultDataSchema());
      const selectedCollectionId = firstCollectionId(next);
      set({
        schema: next,
        selectedCollectionId,
        selectedFieldId: firstFieldId(next, selectedCollectionId),
        selectedQueryId: next.collections.find((collection) => collection.id === selectedCollectionId)?.queries[0]?.id ?? null,
      });
    },

    resetSchema: () => {
      const next = createDefaultDataSchema();
      const selectedCollectionId = firstCollectionId(next);
      set({
        schema: next,
        selectedCollectionId,
        selectedFieldId: firstFieldId(next, selectedCollectionId),
        selectedQueryId: null,
      });
    },

    updateSchema: (patch) =>
      set((state) => ({
        schema: touch({ ...state.schema, ...patch }),
      })),

    setSelectedCollection: (selectedCollectionId) =>
      set((state) => ({
        selectedCollectionId,
        selectedFieldId: firstFieldId(state.schema, selectedCollectionId),
        selectedQueryId: state.schema.collections.find((collection) => collection.id === selectedCollectionId)?.queries[0]?.id ?? null,
      })),

    setSelectedField: (selectedFieldId) => set({ selectedFieldId }),
    setSelectedQuery: (selectedQueryId) => set({ selectedQueryId }),

    addCollection: (label = 'Nova colecao') => {
      const collection = createDataCollection(label);
      set((state) => ({
        schema: touch({
          ...state.schema,
          collections: [...state.schema.collections, collection],
        }),
        selectedCollectionId: collection.id,
        selectedFieldId: collection.fields[0]?.id ?? null,
        selectedQueryId: null,
      }));
      return collection;
    },

    updateCollection: (collectionId, patch) =>
      set((state) => ({
        schema: touch({
          ...state.schema,
          collections: state.schema.collections.map((collection) =>
            collection.id === collectionId
              ? { ...collection, ...patch, config: { ...collection.config, ...(patch.config ?? {}) } }
              : collection,
          ),
        }),
      })),

    removeCollection: (collectionId) =>
      set((state) => {
        const collections = state.schema.collections.filter((collection) => collection.id !== collectionId);
        const selectedCollectionId =
          state.selectedCollectionId === collectionId ? collections[0]?.id ?? null : state.selectedCollectionId;
        return {
          schema: touch({ ...state.schema, collections }),
          selectedCollectionId,
          selectedFieldId: firstFieldId({ ...state.schema, collections }, selectedCollectionId),
          selectedQueryId: collections.find((collection) => collection.id === selectedCollectionId)?.queries[0]?.id ?? null,
        };
      }),

    addField: (collectionId, label = 'Novo campo', type = 'string') => {
      const field = createDataField(label, type);
      let added = false;
      set((state) => ({
        schema: touch({
          ...state.schema,
          collections: state.schema.collections.map((collection) => {
            if (collection.id !== collectionId) return collection;
            added = true;
            return { ...collection, fields: [...collection.fields, field] };
          }),
        }),
        selectedCollectionId: collectionId,
        selectedFieldId: field.id,
      }));
      return added ? field : null;
    },

    updateField: (collectionId, fieldId, patch) =>
      set((state) => ({
        schema: touch({
          ...state.schema,
          collections: state.schema.collections.map((collection) =>
            collection.id === collectionId
              ? {
                  ...collection,
                  fields: collection.fields.map((field) =>
                    field.id === fieldId
                      ? {
                          ...field,
                          ...patch,
                          validation: patch.validation
                            ? { ...(field.validation ?? {}), ...patch.validation }
                            : field.validation,
                          relation: patch.relation
                            ? { ...(field.relation ?? {}), ...patch.relation }
                            : field.relation,
                        }
                      : field,
                  ),
                }
              : collection,
          ),
        }),
      })),

    removeField: (collectionId, fieldId) =>
      set((state) => {
        const collections = state.schema.collections.map((collection) =>
          collection.id === collectionId
            ? { ...collection, fields: collection.fields.filter((field) => field.id !== fieldId || field.system) }
            : collection,
        );
        return {
          schema: touch({ ...state.schema, collections }),
          selectedFieldId:
            state.selectedFieldId === fieldId
              ? collections.find((collection) => collection.id === collectionId)?.fields[0]?.id ?? null
              : state.selectedFieldId,
        };
      }),

    moveField: (collectionId, fieldId, direction) =>
      set((state) => ({
        schema: touch({
          ...state.schema,
          collections: state.schema.collections.map((collection) => {
            if (collection.id !== collectionId) return collection;
            const fields = [...collection.fields];
            const index = fields.findIndex((field) => field.id === fieldId);
            const target = direction === 'up' ? index - 1 : index + 1;
            if (index < 0 || target < 0 || target >= fields.length) return collection;
            [fields[index], fields[target]] = [fields[target], fields[index]];
            return { ...collection, fields };
          }),
        }),
      })),

    addSavedQuery: (collectionId, name = 'Nova query') => {
      const query = createSavedQuery(collectionId, name);
      let added = false;
      set((state) => ({
        schema: touch({
          ...state.schema,
          collections: state.schema.collections.map((collection) => {
            if (collection.id !== collectionId) return collection;
            added = true;
            return { ...collection, queries: [...collection.queries, query] };
          }),
        }),
        selectedQueryId: query.id,
      }));
      return added ? query : null;
    },

    updateSavedQuery: (collectionId, queryId, patch) =>
      set((state) => ({
        schema: touch({
          ...state.schema,
          collections: state.schema.collections.map((collection) =>
            collection.id === collectionId
              ? {
                  ...collection,
                  queries: collection.queries.map((query) => (query.id === queryId ? { ...query, ...patch } : query)),
                }
              : collection,
          ),
        }),
      })),

    removeSavedQuery: (collectionId, queryId) =>
      set((state) => ({
        schema: touch({
          ...state.schema,
          collections: state.schema.collections.map((collection) =>
            collection.id === collectionId
              ? { ...collection, queries: collection.queries.filter((query) => query.id !== queryId) }
              : collection,
          ),
        }),
        selectedQueryId: state.selectedQueryId === queryId ? null : state.selectedQueryId,
      })),

    addQueryFilter: (collectionId, queryId, fieldId) => {
      const filter: QueryFilter = {
        id: createId(),
        fieldId,
        operator: 'equals',
        value: '',
      };
      get().updateSavedQuery(collectionId, queryId, {
        filters: [
          ...(get().schema.collections
            .find((collection) => collection.id === collectionId)
            ?.queries.find((query) => query.id === queryId)?.filters ?? []),
          filter,
        ],
      });
    },

    updateQueryFilter: (collectionId, queryId, filterId, patch) => {
      const query = get().schema.collections
        .find((collection) => collection.id === collectionId)
        ?.queries.find((item) => item.id === queryId);
      if (!query) return;
      get().updateSavedQuery(collectionId, queryId, {
        filters: query.filters.map((filter) => (filter.id === filterId ? { ...filter, ...patch } : filter)),
      });
    },

    removeQueryFilter: (collectionId, queryId, filterId) => {
      const query = get().schema.collections
        .find((collection) => collection.id === collectionId)
        ?.queries.find((item) => item.id === queryId);
      if (!query) return;
      get().updateSavedQuery(collectionId, queryId, {
        filters: query.filters.filter((filter) => filter.id !== filterId),
      });
    },
  };
});
