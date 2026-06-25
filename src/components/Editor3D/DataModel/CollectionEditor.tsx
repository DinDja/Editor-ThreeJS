'use client';

import { ArrowDown, ArrowUp, Database, Plus, Trash2 } from 'lucide-react';
import {
  DATA_FIELD_TYPE_LABELS,
  DATA_FIELD_TYPES,
  type DataCollection,
  type DataFieldType,
} from '@/lib/data-model/types';
import { useDataModelStore } from '@/store/dataModelStore';
import { SelectField, TextField, ToggleRow } from '../ui/primitives';
import FieldEditor from './FieldEditor';

export default function CollectionEditor({
  collection,
  collections,
}: {
  collection: DataCollection | null;
  collections: DataCollection[];
}) {
  const selectedFieldId = useDataModelStore((state) => state.selectedFieldId);
  const updateCollection = useDataModelStore((state) => state.updateCollection);
  const removeCollection = useDataModelStore((state) => state.removeCollection);
  const addField = useDataModelStore((state) => state.addField);
  const removeField = useDataModelStore((state) => state.removeField);
  const moveField = useDataModelStore((state) => state.moveField);
  const setSelectedField = useDataModelStore((state) => state.setSelectedField);

  if (!collection) {
    return (
      <section className="grid h-full place-items-center bg-[#0d0f10] p-8 text-center">
        <div className="max-w-sm rounded-lg border border-neutral-800 bg-neutral-950/40 p-6">
          <Database className="mx-auto mb-3 text-neutral-600" size={28} />
          <h2 className="text-sm font-semibold text-neutral-200">Nenhuma colecao selecionada</h2>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Crie ou selecione uma colecao para definir campos, validacoes e queries usadas pelo site.
          </p>
        </div>
      </section>
    );
  }

  const selectedField = collection.fields.find((field) => field.id === selectedFieldId) ?? collection.fields[0] ?? null;

  return (
    <section data-tutorial="data-collection-editor" className="grid h-full min-h-0 grid-cols-[minmax(340px,0.86fr)_minmax(360px,1.14fr)] overflow-hidden bg-[#0d0f10] max-xl:grid-cols-1">
      <div className="ed-scroll min-h-0 overflow-auto border-r border-neutral-800 bg-[#111315] p-4 max-xl:border-b max-xl:border-r-0">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Colecao</p>
            <h2 className="mt-1 truncate text-lg font-semibold text-neutral-100">{collection.label}</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Remover colecao "${collection.label}"?`)) removeCollection(collection.id);
            }}
            className="grid h-8 w-8 place-items-center rounded-md border border-red-400/25 text-red-300 transition hover:border-red-400/60 hover:bg-red-400/10"
            title="Remover colecao"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="grid gap-3 rounded-lg border border-neutral-800 bg-neutral-950/45 p-3">
          <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
            <TextField
              label="Label"
              value={collection.label}
              onChange={(label) => updateCollection(collection.id, { label })}
            />
            <TextField
              label="Nome tecnico"
              value={collection.name}
              mono
              onChange={(name) => updateCollection(collection.id, { name })}
            />
          </div>
          <TextField
            label="Descricao"
            value={collection.description ?? ''}
            onChange={(description) => updateCollection(collection.id, { description })}
          />
          <div className="grid grid-cols-2 gap-2">
            <ToggleRow
              label="Timestamps"
              enabled={collection.config.timestamps !== false}
              onChange={() => updateCollection(collection.id, { config: { timestamps: collection.config.timestamps === false } })}
            />
            <ToggleRow
              label="Soft delete"
              enabled={Boolean(collection.config.softDelete)}
              onChange={() => updateCollection(collection.id, { config: { softDelete: !collection.config.softDelete } })}
            />
            <ToggleRow
              label="Public read"
              enabled={Boolean(collection.config.publicRead)}
              onChange={() => updateCollection(collection.id, { config: { publicRead: !collection.config.publicRead } })}
            />
            <ToggleRow
              label="Public write"
              enabled={Boolean(collection.config.publicWrite)}
              onChange={() => updateCollection(collection.id, { config: { publicWrite: !collection.config.publicWrite } })}
            />
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-950/45 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Campos</p>
              <p className="text-[11px] text-neutral-600">{collection.fields.length} campo(s)</p>
            </div>
            <button
              type="button"
              onClick={() => addField(collection.id)}
              className="flex h-8 items-center gap-1.5 rounded-md border border-emerald-400/35 bg-emerald-400/10 px-3 text-[11px] font-medium text-emerald-200 transition hover:border-emerald-300/60"
            >
              <Plus size={12} />
              Campo
            </button>
          </div>

          <div className="grid gap-1.5">
            {collection.fields.map((field) => (
              <div
                key={field.id}
                className={`group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border px-2.5 py-2 text-left transition ${
                  selectedField?.id === field.id
                    ? 'border-emerald-400/35 bg-emerald-400/10'
                    : 'border-neutral-800 bg-neutral-950/50 hover:border-neutral-700 hover:bg-neutral-900/70'
                }`}
              >
                <button type="button" onClick={() => setSelectedField(field.id)} className="min-w-0 text-left">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-xs font-medium text-neutral-200">{field.label}</span>
                    {field.system && (
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-neutral-500">
                        system
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-neutral-600">
                    {field.name} · {DATA_FIELD_TYPE_LABELS[field.type]}
                  </span>
                </button>
                <span className="flex items-center gap-1 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      moveField(collection.id, field.id, 'up');
                    }}
                    className="grid h-6 w-6 place-items-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
                    title="Mover acima"
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      moveField(collection.id, field.id, 'down');
                    }}
                    className="grid h-6 w-6 place-items-center rounded text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200"
                    title="Mover abaixo"
                  >
                    <ArrowDown size={11} />
                  </button>
                  {!field.system && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeField(collection.id, field.id);
                      }}
                      className="grid h-6 w-6 place-items-center rounded text-neutral-500 hover:bg-red-500/15 hover:text-red-200"
                      title="Remover campo"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <SelectField<DataFieldType>
              label="Tipo rapido"
              value="string"
              options={DATA_FIELD_TYPES.map((value) => ({ value, label: DATA_FIELD_TYPE_LABELS[value] }))}
              onChange={(type) => addField(collection.id, `Campo ${collection.fields.length + 1}`, type)}
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-hidden p-4">
        <FieldEditor collection={collection} field={selectedField} collections={collections} />
      </div>
    </section>
  );
}
