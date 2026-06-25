'use client';

import { Filter, Plus, Trash2 } from 'lucide-react';
import {
  QUERY_OPERATOR_LABELS,
  QUERY_OPERATORS,
  type DataCollection,
  type QueryOperator,
} from '@/lib/data-model/types';
import { useDataModelStore } from '@/store/dataModelStore';
import { NumberField, SelectField, TextField } from '../ui/primitives';

export default function QueryBuilder({ collection }: { collection: DataCollection | null }) {
  const selectedQueryId = useDataModelStore((state) => state.selectedQueryId);
  const setSelectedQuery = useDataModelStore((state) => state.setSelectedQuery);
  const addSavedQuery = useDataModelStore((state) => state.addSavedQuery);
  const updateSavedQuery = useDataModelStore((state) => state.updateSavedQuery);
  const removeSavedQuery = useDataModelStore((state) => state.removeSavedQuery);
  const addQueryFilter = useDataModelStore((state) => state.addQueryFilter);
  const updateQueryFilter = useDataModelStore((state) => state.updateQueryFilter);
  const removeQueryFilter = useDataModelStore((state) => state.removeQueryFilter);

  if (!collection) {
    return (
      <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-[#151719]">
        <div className="grid place-items-center px-5 py-10 text-center text-xs text-neutral-500">
          Selecione uma colecao para criar queries salvas.
        </div>
      </aside>
    );
  }

  const query = collection.queries.find((item) => item.id === selectedQueryId) ?? collection.queries[0] ?? null;
  const firstField = collection.fields[0];
  const sort = query?.sort?.[0];

  return (
    <aside data-tutorial="data-query-builder" className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-[#151719]">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Queries</p>
          <p className="text-xs text-neutral-400">{collection.queries.length} salvas</p>
        </div>
        <button
          type="button"
          onClick={() => addSavedQuery(collection.id)}
          className="grid h-8 w-8 place-items-center rounded-md border border-emerald-400/35 bg-emerald-400/10 text-emerald-200 transition hover:border-emerald-300/60"
          title="Nova query"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="ed-scroll min-h-0 flex-1 overflow-auto p-3">
        <div className="mb-3 grid gap-1">
          {collection.queries.length === 0 ? (
            <button
              type="button"
              onClick={() => addSavedQuery(collection.id, 'Listar recentes')}
              className="rounded-lg border border-dashed border-neutral-700 bg-neutral-950/40 px-3 py-5 text-center text-xs text-neutral-500 transition hover:border-emerald-400/35 hover:text-emerald-200"
            >
              Criar primeira query
            </button>
          ) : (
            collection.queries.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedQuery(item.id)}
                className={`rounded-md border px-2.5 py-2 text-left transition ${
                  query?.id === item.id
                    ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-100'
                    : 'border-neutral-800 bg-neutral-950/45 text-neutral-400 hover:border-neutral-700 hover:text-neutral-100'
                }`}
              >
                <span className="block truncate text-xs font-medium">{item.name}</span>
                <span className="mt-0.5 block text-[10px] text-neutral-600">
                  {item.filters.length} filtro(s) · limit {item.limit ?? 'sem limite'}
                </span>
              </button>
            ))
          )}
        </div>

        {query && (
          <div className="grid gap-3">
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/45 p-3">
              <TextField
                label="Nome"
                value={query.name}
                onChange={(name) => updateSavedQuery(collection.id, query.id, { name })}
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <NumberField
                  label="Limit"
                  value={query.limit ?? 50}
                  min={1}
                  max={500}
                  onChange={(limit) => updateSavedQuery(collection.id, query.id, { limit })}
                />
                <button
                  type="button"
                  onClick={() => removeSavedQuery(collection.id, query.id)}
                  className="mt-4 flex h-8 items-center justify-center gap-1.5 rounded-md border border-red-400/25 text-[11px] text-red-300 transition hover:border-red-400/60 hover:bg-red-400/10"
                >
                  <Trash2 size={12} />
                  Remover
                </button>
              </div>
            </div>

            <div className="grid gap-2 rounded-lg border border-neutral-800 bg-neutral-950/45 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                  <Filter size={12} />
                  Filtros
                </div>
                <button
                  type="button"
                  disabled={!firstField}
                  onClick={() => firstField && addQueryFilter(collection.id, query.id, firstField.id)}
                  className="grid h-7 w-7 place-items-center rounded-md border border-neutral-700/60 text-neutral-400 transition hover:border-emerald-400/40 hover:text-emerald-200 disabled:opacity-30"
                  title="Adicionar filtro"
                >
                  <Plus size={12} />
                </button>
              </div>
              {query.filters.length === 0 ? (
                <p className="rounded-md border border-dashed border-neutral-800 px-3 py-4 text-center text-[11px] text-neutral-600">
                  Sem filtros. A query retorna os registros pelo sort/limit.
                </p>
              ) : (
                query.filters.map((filter) => (
                  <div key={filter.id} className="grid gap-2 rounded-md border border-neutral-800 bg-[#101214] p-2">
                    <SelectField
                      label="Campo"
                      value={filter.fieldId}
                      options={collection.fields.map((field) => ({ value: field.id, label: field.label }))}
                      onChange={(fieldId) => updateQueryFilter(collection.id, query.id, filter.id, { fieldId })}
                    />
                    <SelectField<QueryOperator>
                      label="Operador"
                      value={filter.operator}
                      options={QUERY_OPERATORS.map((operator) => ({ value: operator, label: QUERY_OPERATOR_LABELS[operator] }))}
                      onChange={(operator) => updateQueryFilter(collection.id, query.id, filter.id, { operator })}
                    />
                    {!['isEmpty', 'isNotEmpty'].includes(filter.operator) && (
                      <TextField
                        label="Valor"
                        value={String(filter.value ?? '')}
                        onChange={(value) => updateQueryFilter(collection.id, query.id, filter.id, { value })}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeQueryFilter(collection.id, query.id, filter.id)}
                      className="flex h-7 items-center justify-center gap-1 rounded-md border border-red-400/20 text-[10px] text-red-300 transition hover:border-red-400/50 hover:bg-red-400/10"
                    >
                      <Trash2 size={11} />
                      Remover filtro
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="grid gap-2 rounded-lg border border-neutral-800 bg-neutral-950/45 p-3">
              <SelectField
                label="Ordenar por"
                value={sort?.fieldId ?? firstField?.id ?? ''}
                options={collection.fields.map((field) => ({ value: field.id, label: field.label }))}
                onChange={(fieldId) => updateSavedQuery(collection.id, query.id, { sort: [{ fieldId, direction: sort?.direction ?? 'desc' }] })}
              />
              <SelectField<'asc' | 'desc'>
                label="Direcao"
                value={sort?.direction ?? 'desc'}
                options={[
                  { value: 'desc', label: 'Desc' },
                  { value: 'asc', label: 'Asc' },
                ]}
                onChange={(direction) =>
                  updateSavedQuery(collection.id, query.id, {
                    sort: [{ fieldId: sort?.fieldId ?? firstField?.id ?? '', direction }],
                  })
                }
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
