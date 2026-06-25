'use client';

import { Database, Plus, Table2 } from 'lucide-react';
import { useDataModelStore } from '@/store/dataModelStore';
import { useVariableStore } from '@/store/variableStore';
import { VARIABLE_SCOPES, VARIABLE_TYPES, type VariableScope, type VariableType } from '@/lib/variables/types';
import { SelectField, TextField } from '../ui/primitives';
import CollectionEditor from './CollectionEditor';
import QueryBuilder from './QueryBuilder';

export default function DataModelPanel() {
  const schema = useDataModelStore((state) => state.schema);
  const selectedCollectionId = useDataModelStore((state) => state.selectedCollectionId);
  const setSelectedCollection = useDataModelStore((state) => state.setSelectedCollection);
  const updateSchema = useDataModelStore((state) => state.updateSchema);
  const addCollection = useDataModelStore((state) => state.addCollection);
  const variableDocument = useVariableStore((state) => state.document);
  const selectedVariableId = useVariableStore((state) => state.selectedVariableId);
  const setSelectedVariable = useVariableStore((state) => state.setSelectedVariable);
  const addVariable = useVariableStore((state) => state.addVariable);
  const updateVariable = useVariableStore((state) => state.updateVariable);
  const removeVariable = useVariableStore((state) => state.removeVariable);

  const collection = schema.collections.find((item) => item.id === selectedCollectionId) ?? schema.collections[0] ?? null;
  const selectedVariable = variableDocument.variables.find((variable) => variable.id === selectedVariableId) ?? variableDocument.variables[0] ?? null;
  return (
    <div data-tutorial="data-model-panel" className="grid h-full min-h-0 grid-cols-[280px_minmax(0,1fr)_320px] overflow-hidden bg-[#0d0f10] max-xl:grid-cols-[260px_minmax(0,1fr)] max-lg:grid-cols-1">
      <aside data-tutorial="data-sidebar" className="flex min-h-0 flex-col border-r border-neutral-800 bg-[#151719] max-lg:hidden">
        <div className="border-b border-neutral-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Database size={15} className="text-emerald-300" />
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Dados</h2>
          </div>
        </div>

        <div className="ed-scroll min-h-0 flex-1 overflow-auto p-3">
          <div className="mb-3 grid gap-3 rounded-lg border border-neutral-800 bg-neutral-950/45 p-3">
            <TextField label="Schema" value={schema.name} onChange={(name) => updateSchema({ name })} />
            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label="DB"
                value={schema.provider}
                options={[
                  { value: 'sqlite', label: 'SQLite' },
                  { value: 'postgres', label: 'Postgres' },
                  { value: 'mysql', label: 'MySQL' },
                  { value: 'mongodb', label: 'MongoDB' },
                  { value: 'json', label: 'JSON' },
                ]}
                onChange={(provider) => updateSchema({ provider })}
              />
              <SelectField
                label="ORM"
                value={schema.ormTarget}
                options={[
                  { value: 'prisma', label: 'Prisma' },
                  { value: 'drizzle', label: 'Drizzle' },
                  { value: 'none', label: 'JSON' },
                ]}
                onChange={(ormTarget) => updateSchema({ ormTarget })}
              />
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Colecoes</p>
            <button
              type="button"
              onClick={() => addCollection()}
              className="grid h-7 w-7 place-items-center rounded-md border border-emerald-400/35 bg-emerald-400/10 text-emerald-200 transition hover:border-emerald-300/60"
              title="Nova colecao"
            >
              <Plus size={13} />
            </button>
          </div>

          <div className="grid gap-1.5">
            {schema.collections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedCollection(item.id)}
                className={`rounded-md border px-2.5 py-2 text-left transition ${
                  collection?.id === item.id
                    ? 'border-emerald-400/35 bg-emerald-400/10 text-emerald-100'
                    : 'border-neutral-800 bg-neutral-950/45 text-neutral-400 hover:border-neutral-700 hover:text-neutral-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Table2 size={13} className="shrink-0 text-neutral-500" />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.label}</span>
                </span>
                <span className="mt-1 block truncate pl-5 font-mono text-[10px] text-neutral-600">
                  {item.name} · {item.fields.length} campos
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 border-t border-neutral-800 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Variaveis</p>
              <button
                type="button"
                onClick={() => addVariable()}
                className="grid h-7 w-7 place-items-center rounded-md border border-sky-400/35 bg-sky-400/10 text-sky-200 transition hover:border-sky-300/60"
                title="Nova variavel"
              >
                <Plus size={13} />
              </button>
            </div>
            <div className="grid gap-1.5">
              {variableDocument.variables.map((variable) => (
                <button
                  key={variable.id}
                  type="button"
                  onClick={() => setSelectedVariable(variable.id)}
                  className={`rounded-md border px-2.5 py-2 text-left transition ${
                    selectedVariable?.id === variable.id
                      ? 'border-sky-400/35 bg-sky-400/10 text-sky-100'
                      : 'border-neutral-800 bg-neutral-950/45 text-neutral-400 hover:border-neutral-700 hover:text-neutral-100'
                  }`}
                >
                  <span className="block truncate text-xs font-medium">{variable.label}</span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-neutral-600">
                    {`{{${variable.name}}}`} · {String(variable.value)}
                  </span>
                </button>
              ))}
            </div>
            {selectedVariable && (
              <div className="mt-3 grid gap-2 rounded-lg border border-neutral-800 bg-neutral-950/45 p-3">
                <TextField label="Label" value={selectedVariable.label} onChange={(label) => updateVariable(selectedVariable.id, { label })} />
                <TextField label="Nome" value={selectedVariable.name} mono onChange={(name) => updateVariable(selectedVariable.id, { name })} />
                <div className="grid grid-cols-2 gap-2">
                  <SelectField<VariableType>
                    label="Tipo"
                    value={selectedVariable.type}
                    options={VARIABLE_TYPES.map((value) => ({ value, label: value }))}
                    onChange={(type) => updateVariable(selectedVariable.id, { type })}
                  />
                  <SelectField<VariableScope>
                    label="Escopo"
                    value={selectedVariable.scope}
                    options={VARIABLE_SCOPES.map((value) => ({ value, label: value }))}
                    onChange={(scope) => updateVariable(selectedVariable.id, { scope })}
                  />
                </div>
                <TextField
                  label="Valor"
                  value={typeof selectedVariable.value === 'object' ? JSON.stringify(selectedVariable.value) : String(selectedVariable.value)}
                  onChange={(raw) => {
                    const value =
                      selectedVariable.type === 'number' ? Number(raw) || 0 :
                      selectedVariable.type === 'boolean' ? raw === 'true' :
                      raw;
                    updateVariable(selectedVariable.id, { value });
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeVariable(selectedVariable.id)}
                  className="h-8 rounded-md border border-red-400/25 text-[11px] text-red-300 transition hover:border-red-400/60 hover:bg-red-400/10"
                >
                  Remover variavel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-neutral-800 p-3">
          <div className="rounded-md border border-neutral-800 bg-neutral-950/45 px-2.5 py-2 text-[10px] leading-4 text-neutral-500">
            O schema, variaveis e queries ja ficam no `.web3d.json`; persistencia real em banco e autenticacao ficam para as proximas fases.
          </div>
        </div>
      </aside>

      <CollectionEditor collection={collection} collections={schema.collections} />

      <div className="max-xl:hidden">
        <QueryBuilder collection={collection} />
      </div>
    </div>
  );
}
