import { create } from 'zustand';
import { createPreviewRecords, type DataRecord } from '@/lib/data-model/runtime';
import type { DataSchema } from '@/lib/data-model/types';
import { createId } from './types';

type DataRuntimeState = {
  recordsByCollection: Record<string, DataRecord[]>;
  ensureSchemaRecords: (schema: DataSchema | null | undefined) => void;
  loadCollection: (collectionId: string, records: DataRecord[]) => void;
  createRecord: (collectionId: string, record: DataRecord) => DataRecord;
  updateRecord: (collectionId: string, recordId: string, patch: DataRecord) => void;
  deleteRecord: (collectionId: string, recordId: string) => void;
};

const recordId = (record: DataRecord) => String(record.id ?? record.uuid ?? '');

export const useDataRuntimeStore = create<DataRuntimeState>((set) => ({
  recordsByCollection: {},

  ensureSchemaRecords: (schema) =>
    set((state) => {
      if (!schema) return state;
      const next = { ...state.recordsByCollection };
      for (const collection of schema.collections) {
        const key = collection.id;
        if (!next[key]) next[key] = createPreviewRecords(collection);
      }
      return { recordsByCollection: next };
    }),

  loadCollection: (collectionId, records) =>
    set((state) => ({
      recordsByCollection: { ...state.recordsByCollection, [collectionId]: records },
    })),

  createRecord: (collectionId, record) => {
    const next = { id: record.id ?? createId(), ...record };
    set((state) => ({
      recordsByCollection: {
        ...state.recordsByCollection,
        [collectionId]: [...(state.recordsByCollection[collectionId] ?? []), next],
      },
    }));
    return next;
  },

  updateRecord: (collectionId, id, patch) =>
    set((state) => ({
      recordsByCollection: {
        ...state.recordsByCollection,
        [collectionId]: (state.recordsByCollection[collectionId] ?? []).map((record) =>
          recordId(record) === id ? { ...record, ...patch } : record,
        ),
      },
    })),

  deleteRecord: (collectionId, id) =>
    set((state) => ({
      recordsByCollection: {
        ...state.recordsByCollection,
        [collectionId]: (state.recordsByCollection[collectionId] ?? []).filter((record) => recordId(record) !== id),
      },
    })),
}));
