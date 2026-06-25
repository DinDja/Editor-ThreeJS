'use client';

import { Link2, ShieldCheck } from 'lucide-react';
import {
  DATA_FIELD_TYPE_LABELS,
  DATA_FIELD_TYPES,
  type DataCollection,
  type DataField,
  type DataFieldType,
  type DataFieldUiHint,
} from '@/lib/data-model/types';
import { useDataModelStore } from '@/store/dataModelStore';
import {
  Field,
  NumberField,
  SelectField,
  TextField,
  ToggleRow,
} from '../ui/primitives';

const uiHints: DataFieldUiHint[] = [
  'input',
  'textarea',
  'richText',
  'select',
  'checkbox',
  'switch',
  'datePicker',
  'imageUpload',
  'fileUpload',
  'hidden',
  'readonly',
];

const relationKinds = ['oneToOne', 'oneToMany', 'manyToOne', 'manyToMany'] as const;

const numberOrUndefined = (value: number) => (Number.isFinite(value) ? value : undefined);

export default function FieldEditor({
  collection,
  field,
  collections,
}: {
  collection: DataCollection;
  field: DataField | null;
  collections: DataCollection[];
}) {
  const updateField = useDataModelStore((state) => state.updateField);

  if (!field) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 px-4 py-10 text-center">
        <div className="max-w-xs text-xs leading-5 text-neutral-500">
          Selecione um campo da colecao para editar nome tecnico, tipo, validacoes e comportamento de UI.
        </div>
      </div>
    );
  }

  const update = (patch: Parameters<typeof updateField>[2]) => updateField(collection.id, field.id, patch);
  const validation = field.validation ?? {};
  const relation = field.relation ?? {
    collectionId: collections.find((item) => item.id !== collection.id)?.id ?? collection.id,
    kind: 'manyToOne' as const,
  };

  return (
    <div data-tutorial="data-field-editor" className="ed-scroll grid max-h-full gap-3 overflow-auto pr-1">
      <div className="grid gap-3 rounded-lg border border-neutral-800 bg-neutral-950/45 p-3">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
          {field.system ? <ShieldCheck size={12} className="text-emerald-300" /> : null}
          Campo
        </div>
        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          <TextField label="Label" value={field.label} onChange={(label) => update({ label })} />
          <TextField label="Nome tecnico" value={field.name} mono onChange={(name) => update({ name })} />
        </div>
        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          <SelectField<DataFieldType>
            label="Tipo"
            value={field.type}
            options={DATA_FIELD_TYPES.map((value) => ({ value, label: DATA_FIELD_TYPE_LABELS[value] }))}
            onChange={(type) => update({ type })}
          />
          <SelectField<DataFieldUiHint>
            label="UI"
            value={field.uiHint ?? 'input'}
            options={uiHints.map((value) => ({ value, label: value }))}
            onChange={(uiHint) => update({ uiHint })}
          />
        </div>
        <ToggleRow label="Obrigatorio" enabled={field.required} onChange={() => update({ required: !field.required })} />
        <TextField
          label="Descricao"
          value={field.description ?? ''}
          onChange={(description) => update({ description })}
        />
      </div>

      {(field.type === 'enum' || field.uiHint === 'select') && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950/45 p-3">
          <TextField
            label="Opcoes"
            value={(field.enumValues ?? []).join(', ')}
            placeholder="novo, ativo, arquivado"
            onChange={(value) =>
              update({ enumValues: value.split(',').map((item) => item.trim()).filter(Boolean) })
            }
          />
        </div>
      )}

      {field.type === 'relation' && (
        <div className="grid gap-3 rounded-lg border border-sky-400/20 bg-sky-400/[0.04] p-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200">
            <Link2 size={12} />
            Relacao
          </div>
          <SelectField
            label="Colecao alvo"
            value={relation.collectionId}
            options={collections.map((item) => ({ value: item.id, label: item.label }))}
            onChange={(collectionId) => update({ relation: { ...relation, collectionId } })}
          />
          <SelectField<(typeof relationKinds)[number]>
            label="Tipo"
            value={relation.kind}
            options={relationKinds.map((value) => ({ value, label: value }))}
            onChange={(kind) => update({ relation: { ...relation, kind } })}
          />
        </div>
      )}

      <div className="grid gap-3 rounded-lg border border-neutral-800 bg-neutral-950/45 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Validacao</div>
        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          <NumberField
            label="Min"
            value={validation.min ?? 0}
            onChange={(min) => update({ validation: { ...validation, min: numberOrUndefined(min) } })}
          />
          <NumberField
            label="Max"
            value={validation.max ?? 0}
            onChange={(max) => update({ validation: { ...validation, max: numberOrUndefined(max) } })}
          />
          <NumberField
            label="Min chars"
            value={validation.minLength ?? 0}
            onChange={(minLength) => update({ validation: { ...validation, minLength: numberOrUndefined(minLength) } })}
          />
          <NumberField
            label="Max chars"
            value={validation.maxLength ?? 0}
            onChange={(maxLength) => update({ validation: { ...validation, maxLength: numberOrUndefined(maxLength) } })}
          />
        </div>
        <TextField
          label="Regex"
          value={validation.pattern ?? ''}
          mono
          onChange={(pattern) => update({ validation: { ...validation, pattern } })}
        />
        <ToggleRow
          label="Valor unico"
          enabled={Boolean(validation.unique)}
          onChange={() => update({ validation: { ...validation, unique: !validation.unique } })}
        />
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950/45 p-3">
        <Field label="Default">
          <input
            value={field.defaultValue === undefined || field.defaultValue === null ? '' : String(field.defaultValue)}
            onChange={(event) => update({ defaultValue: event.target.value })}
            className="ed-focus h-8 w-full rounded-md border border-neutral-700/80 bg-[#0d0f10] px-2.5 text-xs text-neutral-100 outline-none transition focus:border-emerald-400"
          />
        </Field>
      </div>
    </div>
  );
}
