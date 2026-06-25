'use client';

import {
  createElement,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import ExperienceSceneCanvas from './ExperienceSceneCanvas';
import { EffectsLayer } from '@/components/effects';
import type { InteractionDocument } from '@/lib/interaction-engine/types';
import type { PageDocument, PageNode, PseudoClass } from '@/lib/page-builder/types';
import { EFFECT_REGISTRY } from '@/lib/effects-system/registry';
import { getVisualPreset } from '@/lib/template-engine/presets';
import { applySavedQuery, createPreviewRecords, displayDataValue, findCollection, findQuery, type DataRecord } from '@/lib/data-model/runtime';
import { resolveBindingString } from '@/lib/variables/bindings';
import type { DataSchema } from '@/lib/data-model/types';
import type { VariableDocument } from '@/lib/variables/types';
import { useDataModelStore } from '@/store/dataModelStore';
import { useDataRuntimeStore } from '@/store/dataRuntimeStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useVariableStore } from '@/store/variableStore';

type PageExperienceProps = {
  page: PageDocument;
  interactions: InteractionDocument[];
  selectedNodeId?: string | null;
  activeBreakpoint?: string;
  previewPseudo?: PseudoClass | null;
  mode?: 'edit' | 'preview';
  onSelectNode?: (id: string) => void;
  onSelectParentNode?: () => void;
  onUpdateNodeProps?: (id: string, patch: Record<string, unknown>) => void;
  onDuplicateNode?: (id: string) => void;
  onRemoveNode?: (id: string) => void;
};

const toCssProperties = (node: PageNode, activeBreakpoint: string, pseudoOverride?: PseudoClass | null): CSSProperties => {
  const base = {
    ...(node.styles.base as CSSProperties),
    ...(activeBreakpoint !== 'base' && node.styles[activeBreakpoint]
      ? (node.styles[activeBreakpoint] as CSSProperties)
      : undefined),
  };
  if (!pseudoOverride || !node.pseudo?.[pseudoOverride]) return base;
  const pseudoStyles = node.pseudo[pseudoOverride] as Record<string, unknown> | undefined;
  if (!pseudoStyles) return base;
  const breakpointStyles = pseudoStyles[activeBreakpoint] as CSSProperties | undefined;
  if (breakpointStyles) Object.assign(base, breakpointStyles);
  return base;
};

const dataActionNames = new Set([
  'createRecord',
  'updateRecord',
  'deleteRecord',
  'loadCollection',
  'runQuery',
  'setVariable',
  'incrementVariable',
  'toggleVariable',
  'showToast',
  'setLoading',
  'setError',
]);

const dispatchRuntimeInteraction = (interaction: InteractionDocument, active: boolean) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('experience-interaction', {
    detail: { id: interaction.id, active },
  }));
};

const applyDomAction = (interaction: InteractionDocument, active: boolean) => {
  if (typeof document === 'undefined' || !active) return;
  const target = document.querySelector<HTMLElement>(`[data-experience-node="${interaction.targetId}"]`);
  if (!target && !dataActionNames.has(interaction.action)) return;

  if (interaction.action === 'showElement' && target) target.style.display = '';
  if (interaction.action === 'hideElement' && target) target.style.display = 'none';
  if (interaction.action === 'changeText' && target) {
    const text = typeof interaction.params.text === 'string' ? interaction.params.text : '';
    if (text) target.textContent = text;
  }
  if (interaction.action === 'openModal') {
    const title = typeof interaction.params.title === 'string' ? interaction.params.title : 'Detalhes';
    const body = typeof interaction.params.body === 'string' ? interaction.params.body : '';
    window.alert([title, body].filter(Boolean).join('\n\n'));
  }
  if (interaction.action === 'navigateToLink') {
    const href = typeof interaction.params.href === 'string' ? interaction.params.href : '#';
    window.location.href = href;
  }

  const variableStore = useVariableStore.getState();
  const runtimeStore = useDataRuntimeStore.getState();
  const dataStore = useDataModelStore.getState();
  const collectionId = typeof interaction.params.collectionId === 'string' ? interaction.params.collectionId : 'leads';

  if (interaction.action === 'setVariable') {
    const name = typeof interaction.params.variableName === 'string' ? interaction.params.variableName : 'statusMessage';
    variableStore.setVariableValue(name, interaction.params.value as string | number | boolean);
  }
  if (interaction.action === 'incrementVariable') {
    const name = typeof interaction.params.variableName === 'string' ? interaction.params.variableName : 'counter';
    runtimeStore.ensureSchemaRecords(dataStore.schema);
    variableStore.incrementVariable(name, Number(interaction.params.amount ?? 1));
  }
  if (interaction.action === 'toggleVariable') {
    const name = typeof interaction.params.variableName === 'string' ? interaction.params.variableName : 'isLoading';
    variableStore.toggleVariable(name);
  }
  if (interaction.action === 'setLoading') {
    const name = typeof interaction.params.variableName === 'string' ? interaction.params.variableName : 'isLoading';
    variableStore.setVariableValue(name, Boolean(interaction.params.value ?? true));
  }
  if (interaction.action === 'setError') {
    const name = typeof interaction.params.variableName === 'string' ? interaction.params.variableName : 'statusMessage';
    variableStore.setVariableValue(name, String(interaction.params.value ?? 'Erro'));
  }
  if (interaction.action === 'showToast') {
    window.dispatchEvent(new CustomEvent('experience-toast', {
      detail: {
        message: String(interaction.params.message ?? 'Acao executada'),
        tone: String(interaction.params.tone ?? 'success'),
      },
    }));
  }
  if (interaction.action === 'createRecord') {
    runtimeStore.createRecord(collectionId, (interaction.params.record as Record<string, unknown> | undefined) ?? {});
  }
  if (interaction.action === 'updateRecord') {
    const recordId = String(interaction.params.recordId ?? '');
    runtimeStore.updateRecord(collectionId, recordId, (interaction.params.patch as Record<string, unknown> | undefined) ?? {});
  }
  if (interaction.action === 'deleteRecord') {
    const recordId = String(interaction.params.recordId ?? '');
    runtimeStore.deleteRecord(collectionId, recordId);
  }
  if (interaction.action === 'loadCollection') {
    const collection = findCollection(dataStore.schema, collectionId);
    if (collection) runtimeStore.loadCollection(collection.id, createPreviewRecords(collection));
  }
  if (interaction.action === 'runQuery') {
    const collection = findCollection(dataStore.schema, collectionId);
    if (!collection) return;
    const records = runtimeStore.recordsByCollection[collection.id] ?? createPreviewRecords(collection);
    const query = findQuery(collection, interaction.params.queryId);
    const result = applySavedQuery(collection, query, records);
    const variableName = typeof interaction.params.resultVariable === 'string' ? interaction.params.resultVariable : 'queryResult';
    variableStore.setVariableValue(variableName, result);
  }
};

const triggerInteractions = (interactions: InteractionDocument[], active: boolean) => {
  interactions.forEach((interaction) => {
    if (!interaction.enabled) return;
    dispatchRuntimeInteraction(interaction, active);
    applyDomAction(interaction, active);
  });
};

function PlaceholderMedia({ type }: { type: 'image' | 'video' }) {
  return (
    <div className="grid h-full min-h-[220px] w-full place-items-center bg-neutral-900 text-[10px] uppercase tracking-[0.16em] text-neutral-500">
      {type === 'image' ? 'Image' : 'Video'}
    </div>
  );
}

const resolveText = (
  value: unknown,
  variables: VariableDocument,
  record?: DataRecord | null,
  collections?: Record<string, DataRecord[]>,
) => resolveBindingString(String(value ?? ''), { variables, record, collections });

const getNodeCollectionData = (
  node: PageNode,
  dataSchema: DataSchema,
  recordsByCollection: Record<string, DataRecord[]>,
) => {
  const collection = findCollection(dataSchema, node.props.collectionId);
  if (!collection) return { collection: null, records: [] as DataRecord[] };
  const query = findQuery(collection, node.props.queryId);
  const records = recordsByCollection[collection.id] ?? createPreviewRecords(collection);
  const limit = Number(node.props.limit ?? query?.limit ?? records.length);
  return { collection, records: applySavedQuery(collection, query, records).slice(0, Number.isFinite(limit) ? limit : records.length) };
};

const dataFieldsForNode = (node: PageNode, collection: NonNullable<ReturnType<typeof findCollection>>) => {
  const columns = Array.isArray(node.props.columns) ? node.props.columns.map(String).filter(Boolean) : [];
  const fields = collection.fields.filter((field) => !field.system);
  if (columns.length === 0) return fields.slice(0, 6);
  return columns
    .map((name) => collection.fields.find((field) => field.id === name || field.name === name))
    .filter(Boolean) as typeof collection.fields;
};

function hasSceneCanvasChild(node: PageNode): boolean {
  if (!node.children) return false;
  return node.children.some((child) => child.type === 'sceneCanvas');
}

function PageNodeView({
  node,
  interactions,
  selectedNodeId,
  activeBreakpoint = 'base',
  previewPseudo,
  mode,
  onSelectNode,
  onSelectParentNode,
  onUpdateNodeProps,
  hasWebglBackground,
  presetBgRgb,
  parentId,
  dataSchema,
  variables,
  recordsByCollection,
  onNavigateHref,
}: {
  node: PageNode;
  interactions: InteractionDocument[];
  selectedNodeId: string | null;
  activeBreakpoint?: string;
  previewPseudo?: PseudoClass | null;
  mode: 'edit' | 'preview';
  onSelectNode?: (id: string) => void;
  onSelectParentNode?: () => void;
  onUpdateNodeProps?: (id: string, patch: Record<string, unknown>) => void;
  hasWebglBackground?: boolean;
  presetBgRgb?: string;
  parentId?: string | null;
  dataSchema: DataSchema;
  variables: VariableDocument;
  recordsByCollection: Record<string, DataRecord[]>;
  onNavigateHref?: (href: string, event: MouseEvent<HTMLElement>) => boolean;
}) {
  const showPseudoOverride = selectedNodeId === node.id && mode === 'edit';
  const style = toCssProperties(node, activeBreakpoint, showPseudoOverride ? previewPseudo : null);
  const nodeInteractions = interactions.filter((interaction) => interaction.sourceId === node.id);

  // When page-level WebGL background effects exist, make sections
  // semi-transparent so particles/3D scenes show through.
  // Sections with their own sceneCanvas child are skipped.
  if (hasWebglBackground && presetBgRgb && !hasSceneCanvasChild(node)) {
    const sectionTypes = new Set<string>(['section', 'navbar', 'footer']);
    if (sectionTypes.has(node.type)) {
      const opacity = node.type === 'navbar' ? 0.7 : 0.55;
      style.background = `rgba(${presetBgRgb}, ${opacity})`;
      if (node.type !== 'navbar') {
        style.backdropFilter = 'blur(4px)';
      }
    }
    if (node.type === 'card') {
      style.background = `rgba(${presetBgRgb}, 0.6)`;
      style.backdropFilter = 'blur(6px)';
    }
  }
  const selected = selectedNodeId === node.id && mode === 'edit';
  const editable = mode === 'edit' && Boolean(onUpdateNodeProps);

  const handleSelect = (event: MouseEvent<HTMLElement>) => {
    if (mode !== 'edit') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.altKey && parentId && onSelectParentNode) {
      onSelectParentNode();
      return;
    }
    onSelectNode?.(node.id);
  };

  const handlers = {
    onClick: (event: MouseEvent<HTMLElement>) => {
      handleSelect(event);
      if (mode !== 'preview') return;
      const clickInteractions = nodeInteractions.filter((interaction) => interaction.trigger === 'click');
      triggerInteractions(clickInteractions, true);
      window.setTimeout(() => triggerInteractions(clickInteractions, false), 360);
      if ((node.type === 'button' || node.type === 'menuitem') && typeof node.props.href === 'string') {
        onNavigateHref?.(node.props.href, event);
      }
    },
    onDoubleClick: () => {
      if (mode !== 'preview') return;
      const list = nodeInteractions.filter((interaction) => interaction.trigger === 'doubleClick');
      triggerInteractions(list, true);
      window.setTimeout(() => triggerInteractions(list, false), 360);
    },
    onMouseEnter: () => {
      if (mode === 'preview') triggerInteractions(nodeInteractions.filter((interaction) => interaction.trigger === 'hover' || interaction.trigger === 'sectionEnter'), true);
    },
    onMouseLeave: () => {
      if (mode === 'preview') triggerInteractions(nodeInteractions.filter((interaction) => interaction.trigger === 'hover' || interaction.trigger === 'sectionLeave'), false);
    },
    onFocus: () => {
      if (mode === 'preview') triggerInteractions(nodeInteractions.filter((interaction) => interaction.trigger === 'focus'), true);
    },
    onBlur: () => {
      if (mode === 'preview') triggerInteractions(nodeInteractions.filter((interaction) => interaction.trigger === 'blur'), false);
    },
  };

  const className = selected
    ? 'outline outline-2 outline-emerald-300 outline-offset-2'
    : mode === 'edit'
      ? 'outline outline-1 outline-transparent hover:outline-emerald-400/45 hover:bg-emerald-400/[0.02]'
      : undefined;

  const sharedProps = {
    'data-experience-node': node.id,
    'data-node-type': node.type,
    'data-parent-id': parentId ?? '',
    style,
    className,
    tabIndex: nodeInteractions.some((interaction) => interaction.trigger === 'focus' || interaction.trigger === 'blur') ? 0 : undefined,
    ...handlers,
  };

  const editableTextProps = (field: string, multiline = false) =>
    editable
      ? {
          contentEditable: true,
          suppressContentEditableWarning: true,
          spellCheck: false,
          onBlur: (event: FocusEvent<HTMLElement>) => {
            onUpdateNodeProps?.(node.id, { [field]: event.currentTarget.textContent ?? '' });
          },
          onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === 'Enter' && !multiline) {
              event.preventDefault();
              event.currentTarget.blur();
            }
          },
        }
      : {};

  if (node.type === 'sceneCanvas') {
    return (
      <div {...sharedProps}>
        <ExperienceSceneCanvas
          interactive={Boolean(node.props.interactive)}
          transparent={node.props.transparent !== false}
        />
      </div>
    );
  }

  if (node.type === 'text') {
    const tag = typeof node.props.as === 'string' ? node.props.as : 'p';
    const textStyle = mode === 'edit' ? { display: 'block', minHeight: '1.2em', minWidth: '40px' as const } : {};
    return createElement(tag, { ...sharedProps, style: { ...style, ...textStyle }, ...editableTextProps('text', true) }, resolveText(node.props.text, variables, null, recordsByCollection));
  }

  if (node.type === 'button') {
    const btnStyle = mode === 'edit' ? { display: 'inline-block', minWidth: '60px' as const, minHeight: '32px' as const } : {};
    return (
      <a {...sharedProps} style={{ ...style, ...btnStyle }} {...editableTextProps('label')} href={mode === 'preview' ? String(node.props.href ?? '#') : '#'} role="button">
        {resolveText(node.props.label ?? 'Button', variables, null, recordsByCollection)}
      </a>
    );
  }

  if (node.type === 'image') {
    const src = typeof node.props.src === 'string' ? node.props.src : '';
    return (
      <div {...sharedProps}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- page builder supports arbitrary exported image URLs.
          <img src={src} alt={String(node.props.alt ?? '')} className="h-full w-full object-cover" />
        ) : (
          <PlaceholderMedia type="image" />
        )}
      </div>
    );
  }

  if (node.type === 'video') {
    const src = typeof node.props.src === 'string' ? node.props.src : '';
    return (
      <div {...sharedProps}>
        {src ? (
          <video
            src={src}
            poster={typeof node.props.poster === 'string' ? node.props.poster : undefined}
            controls={node.props.controls !== false}
            autoPlay={Boolean(node.props.autoplay)}
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <PlaceholderMedia type="video" />
        )}
      </div>
    );
  }

  if (node.type === 'dataTable') {
    const { collection, records } = getNodeCollectionData(node, dataSchema, recordsByCollection);
    if (!collection) return <div {...sharedProps}>Colecao nao encontrada</div>;
    const fields = dataFieldsForNode(node, collection);
    return (
      <div {...sharedProps}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {fields.map((field) => (
                <th key={field.id} style={{ padding: '10px 12px', textAlign: 'left', color: '#a3e635', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((record, rowIndex) => (
              <tr key={String(record.id ?? rowIndex)}>
                {fields.map((field) => (
                  <td key={field.id} style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#d4d4d8' }}>
                    {displayDataValue(record[field.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (node.type === 'dataForm') {
    const { collection } = getNodeCollectionData(node, dataSchema, recordsByCollection);
    if (!collection) return <div {...sharedProps}>Colecao nao encontrada</div>;
    const fields = collection.fields.filter((field) => !field.system && field.type !== 'relation');
    return (
      <form
        {...sharedProps}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const record = Object.fromEntries(fields.map((field) => [field.name, form.get(field.name) ?? '']));
          useDataRuntimeStore.getState().createRecord(collection.id, record);
          useVariableStore.getState().setVariableValue('statusMessage', String(node.props.successMessage ?? 'Registro salvo'));
          window.dispatchEvent(new CustomEvent('experience-toast', { detail: { message: String(node.props.successMessage ?? 'Registro salvo'), tone: 'success' } }));
          event.currentTarget.reset();
        }}
      >
        {fields.map((field) => (
          <label key={field.id} style={{ display: 'grid', gap: 6, fontSize: 12, color: '#d4d4d8' }}>
            <span>{field.label}</span>
            {field.type === 'text' ? (
              <textarea name={field.name} required={field.required} rows={3} style={{ border: '1px solid rgba(255,255,255,0.12)', background: '#0d0f10', color: '#f5f5f4', borderRadius: 6, padding: '10px 12px' }} />
            ) : field.type === 'enum' ? (
              <select name={field.name} required={field.required} style={{ border: '1px solid rgba(255,255,255,0.12)', background: '#0d0f10', color: '#f5f5f4', borderRadius: 6, padding: '10px 12px' }}>
                {(field.enumValues ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            ) : (
              <input
                name={field.name}
                type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : 'text'}
                required={field.required}
                style={{ border: '1px solid rgba(255,255,255,0.12)', background: '#0d0f10', color: '#f5f5f4', borderRadius: 6, padding: '10px 12px' }}
              />
            )}
          </label>
        ))}
        <button type="submit" style={{ height: 38, border: 0, borderRadius: 8, background: '#34d399', color: '#06231b', fontWeight: 700 }}>
          {String(node.props.submitLabel ?? 'Salvar')}
        </button>
      </form>
    );
  }

  if (node.type === 'dataList') {
    const { collection, records } = getNodeCollectionData(node, dataSchema, recordsByCollection);
    if (!collection) return <div {...sharedProps}>Colecao nao encontrada</div>;
    const titleField = String(node.props.titleField ?? collection.fields.find((field) => !field.system)?.name ?? 'id');
    const bodyField = String(node.props.bodyField ?? collection.fields.find((field) => field.name !== titleField && !field.system)?.name ?? titleField);
    return (
      <div {...sharedProps}>
        {records.map((record, index) => (
          <article key={String(record.id ?? index)} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 14, background: '#181b1d' }}>
            <h3 style={{ margin: 0, color: '#f5f5f4', fontSize: 15 }}>{displayDataValue(record[titleField])}</h3>
            <p style={{ margin: '6px 0 0', color: '#a3a3a3', fontSize: 13, lineHeight: 1.5 }}>{displayDataValue(record[bodyField])}</p>
          </article>
        ))}
      </div>
    );
  }

  if (node.type === 'dataChart') {
    const { collection, records } = getNodeCollectionData(node, dataSchema, recordsByCollection);
    if (!collection) return <div {...sharedProps}>Colecao nao encontrada</div>;
    const labelField = String(node.props.labelField ?? collection.fields.find((field) => !field.system)?.name ?? 'id');
    const valueField = String(node.props.valueField ?? collection.fields.find((field) => field.type === 'number')?.name ?? 'id');
    const values = records.map((record, index) => Number(record[valueField]) || index + 1);
    const max = Math.max(1, ...values);
    return (
      <div {...sharedProps}>
        {records.map((record, index) => {
          const height = Math.max(12, (values[index] / max) * 100);
          return (
            <div key={String(record.id ?? index)} style={{ flex: 1, display: 'grid', alignItems: 'end', gap: 6 }}>
              <div title={displayDataValue(record[labelField])} style={{ height: `${height}%`, minHeight: 18, borderRadius: 6, background: 'linear-gradient(180deg, #34d399, #38bdf8)' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10, color: '#a3a3a3' }}>{displayDataValue(record[labelField])}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (node.type === 'dataStat') {
    const { collection, records } = getNodeCollectionData(node, dataSchema, recordsByCollection);
    if (!collection) return <div {...sharedProps}>Colecao nao encontrada</div>;
    const field = String(node.props.field ?? '');
    const aggregate = String(node.props.aggregate ?? 'count');
    const value = aggregate === 'sum'
      ? records.reduce((total, record) => total + Number(record[field] ?? 0), 0)
      : aggregate === 'avg'
        ? records.reduce((total, record) => total + Number(record[field] ?? 0), 0) / Math.max(records.length, 1)
        : records.length;
    return (
      <div {...sharedProps}>
        <span style={{ fontSize: 11, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{String(node.props.label ?? collection.label)}</span>
        <strong style={{ fontSize: 32, color: '#f5f5f4', lineHeight: 1 }}>{Number.isFinite(value) ? value.toLocaleString('pt-BR') : '0'}</strong>
      </div>
    );
  }

  if (node.type === 'form') {
    const formStyle = mode === 'edit' ? { minHeight: '80px' as const } : {};
    return (
      <form {...sharedProps} style={{ ...style, ...formStyle }} onSubmit={(e) => e.preventDefault()}>
        {(node.children ?? []).map((child) => (
          <PageNodeView
            key={child.id} node={child} interactions={interactions}
            selectedNodeId={selectedNodeId} activeBreakpoint={activeBreakpoint}
            previewPseudo={previewPseudo} mode={mode}
            onSelectNode={onSelectNode} onSelectParentNode={onSelectParentNode}
            onUpdateNodeProps={onUpdateNodeProps}
            hasWebglBackground={hasWebglBackground} presetBgRgb={presetBgRgb} parentId={node.id}
            dataSchema={dataSchema} variables={variables} recordsByCollection={recordsByCollection}
            onNavigateHref={onNavigateHref}
          />
        ))}
      </form>
    );
  }

  if (node.type === 'input') {
    const inputStyle = mode === 'edit' ? { minWidth: '120px' as const, minHeight: '36px' as const } : {};
    return (
      <div {...sharedProps} style={{ ...style, ...inputStyle }}>
        {node.props.label ? (
          <label className="mb-1 block text-[11px] font-medium text-neutral-400">{resolveText(node.props.label, variables, null, recordsByCollection)}</label>
        ) : null}
        <input
          type={String(node.props.type ?? 'text')}
          name={String(node.props.name ?? '')}
          placeholder={resolveText(node.props.placeholder, variables, null, recordsByCollection)}
          required={Boolean(node.props.required)}
          readOnly={mode === 'edit'}
          className="h-full w-full rounded border border-neutral-700/60 bg-[#0d0f10] px-3 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-600"
          style={{ border: '1px solid rgba(255,255,255,0.12)', background: '#0d0f10', color: '#f5f5f4', borderRadius: 6, padding: '10px 14px', fontSize: 14 }}
        />
      </div>
    );
  }

  if (node.type === 'select') {
    return (
      <div {...sharedProps} style={style}>
        {node.props.label ? (
          <label className="mb-1 block text-[11px] font-medium text-neutral-400">{resolveText(node.props.label, variables, null, recordsByCollection)}</label>
        ) : null}
        <select
          name={String(node.props.name ?? '')}
          disabled={mode === 'edit'}
          className="w-full rounded border border-neutral-700/60 bg-[#0d0f10] px-3 py-2 text-sm text-neutral-200 outline-none"
          style={{ border: '1px solid rgba(255,255,255,0.12)', background: '#0d0f10', color: '#f5f5f4', borderRadius: 6, padding: '10px 14px', fontSize: 14 }}
        >
          {Array.isArray(node.props.options) && (node.props.options as string[]).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (node.type === 'textarea') {
    return (
      <div {...sharedProps} style={style}>
        {node.props.label ? (
          <label className="mb-1 block text-[11px] font-medium text-neutral-400">{resolveText(node.props.label, variables, null, recordsByCollection)}</label>
        ) : null}
        <textarea
          name={String(node.props.name ?? '')}
          placeholder={resolveText(node.props.placeholder, variables, null, recordsByCollection)}
          rows={Number(node.props.rows ?? 4)}
          readOnly={mode === 'edit'}
          className="w-full resize-y rounded border border-neutral-700/60 bg-[#0d0f10] px-3 py-2 text-sm text-neutral-200 outline-none placeholder:text-neutral-600"
          style={{ border: '1px solid rgba(255,255,255,0.12)', background: '#0d0f10', color: '#f5f5f4', borderRadius: 6, padding: '10px 14px', fontSize: 14, minHeight: 100 }}
        />
      </div>
    );
  }

  if (node.type === 'label') {
    return (
      <label {...sharedProps} htmlFor={String(node.props.htmlFor ?? '')} style={style}>
        {resolveText(node.props.text ?? 'Label', variables, null, recordsByCollection)}
      </label>
    );
  }

  if (node.type === 'menuitem') {
    const itemStyle = mode === 'edit' ? { minWidth: '60px' as const, minHeight: '28px' as const } : {};
    return (
      <a {...sharedProps} style={{ ...style, ...itemStyle }} href={mode === 'preview' ? String(node.props.href ?? '#') : '#'}>
        {String(node.props.icon ?? '') && <span style={{ fontSize: 14 }}>{String(node.props.icon)}</span>}
        {resolveText(node.props.label ?? 'Item', variables, null, recordsByCollection)}
      </a>
    );
  }

  const tag = node.type === 'navbar' ? 'nav' : node.type === 'footer' ? 'footer' : node.type === 'card' ? 'article' : node.type === 'menu' ? 'nav' : 'section';
  const children: ReactNode[] = [];

  if (node.type === 'navbar') {
    children.push(
      <strong key="brand" className="text-sm font-semibold text-neutral-50" {...editableTextProps('brand')}>{resolveText(node.props.brand ?? '3D Web', variables, null, recordsByCollection)}</strong>,
      <div key="links" className="flex flex-wrap items-center gap-4 text-xs text-neutral-300">
        {Array.isArray(node.props.links)
          ? node.props.links.map((link) => <span key={String(link)}>{resolveText(link, variables, null, recordsByCollection)}</span>)
          : null}
      </div>,
    );
  }

  if (node.type === 'card') {
    children.push(
      <div key="card-content" className="grid gap-2">
        <h3 className="text-sm font-semibold text-neutral-50" {...editableTextProps('title')}>{resolveText(node.props.title ?? 'Card', variables, null, recordsByCollection)}</h3>
        <p className="text-sm leading-6 text-neutral-400" {...editableTextProps('body', true)}>{resolveText(node.props.body ?? '', variables, null, recordsByCollection)}</p>
      </div>,
    );
  }

  if (node.type === 'footer') {
    children.push(<span key="footer-text" className="text-xs text-neutral-500" {...editableTextProps('text')}>{resolveText(node.props.text ?? '', variables, null, recordsByCollection)}</span>);
  }

  if (node.type === 'menu') {
    const emptyLabel = mode === 'edit' && !node.children?.length ? 'Menu vazio — adicione Menu Items' : '';
    if (emptyLabel) children.push(<span key="menu-empty" className="px-2 py-1 text-[10px] text-neutral-500">{emptyLabel}</span>);
  }

  children.push(
    ...(node.children ?? []).map((child) => (
      <PageNodeView
        key={child.id}
        node={child}
        interactions={interactions}
        selectedNodeId={selectedNodeId}
        activeBreakpoint={activeBreakpoint}
        previewPseudo={previewPseudo}
        mode={mode}
        onSelectNode={onSelectNode}
        onSelectParentNode={onSelectParentNode}
        onUpdateNodeProps={onUpdateNodeProps}
        hasWebglBackground={hasWebglBackground}
        presetBgRgb={presetBgRgb}
        parentId={node.id}
        dataSchema={dataSchema}
        variables={variables}
        recordsByCollection={recordsByCollection}
        onNavigateHref={onNavigateHref}
      />
    )),
  );

  return createElement(tag, sharedProps, ...children);
}

export default function PageExperience({
  page,
  interactions,
  selectedNodeId = null,
  activeBreakpoint = 'base',
  previewPseudo = null,
  mode = 'preview',
  onSelectNode,
  onSelectParentNode,
  onUpdateNodeProps,
}: PageExperienceProps) {
  const effects = useMemo(() => page.effects?.items ?? [], [page.effects?.items]);
  const effectIntensity = page.effects?.intensity ?? 1;
  const dataSchema = useDataModelStore((state) => state.schema);
  const variables = useVariableStore((state) => state.document);
  const pages = useExperienceStore((state) => state.pages);
  const setActivePage = useExperienceStore((state) => state.setActivePage);
  const recordsByCollection = useDataRuntimeStore((state) => state.recordsByCollection);
  const ensureSchemaRecords = useDataRuntimeStore((state) => state.ensureSchemaRecords);
  const [toast, setToast] = useState<{ message: string; tone: string } | null>(null);
  const pageRoutes = useMemo(() => new Map(pages.map((pageDoc) => [pageDoc.path ?? '/', pageDoc.id])), [pages]);

  const navigateHref = (href: string, event: MouseEvent<HTMLElement>) => {
    const cleanHref = href.trim();
    if (!cleanHref || cleanHref === '#' || cleanHref.startsWith('#') || cleanHref.startsWith('http') || cleanHref.startsWith('mailto:') || cleanHref.startsWith('tel:')) {
      return false;
    }
    const routeId = pageRoutes.get(cleanHref);
    if (!routeId) return false;
    event.preventDefault();
    setActivePage(routeId);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', cleanHref);
    return true;
  };

  useEffect(() => {
    ensureSchemaRecords(dataSchema);
  }, [dataSchema, ensureSchemaRecords]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; tone?: string }>).detail;
      setToast({ message: detail?.message ?? 'Acao executada', tone: detail?.tone ?? 'success' });
      window.setTimeout(() => setToast(null), 2600);
    };
    window.addEventListener('experience-toast', onToast);
    return () => window.removeEventListener('experience-toast', onToast);
  }, []);

  const pseudoCss = useMemo(() => {
    if (mode !== 'edit') return '';
    const rules: string[] = [];
    const toInline = (styles: Record<string, unknown>): string =>
      Object.entries(styles)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()})}`)}: ${v}`)
        .join(';');

    const processNode = (node: PageNode) => {
      if (!node.pseudo) return;
      for (const [pseudoClass, bpStyles] of Object.entries(node.pseudo)) {
        if (!bpStyles) continue;
        const bpRecord = bpStyles as Record<string, unknown>;
        for (const styles of Object.values(bpRecord)) {
          if (!styles || typeof styles !== 'object') continue;
          const inline = toInline(styles as Record<string, unknown>);
          if (!inline) continue;
          rules.push(`[data-experience-node="${node.id}"]:${pseudoClass} { ${inline} }`);
        }
      }
      for (const child of node.children ?? []) processNode(child);
    };
    for (const child of page.children) processNode(child);
    return rules.join('\n');
  }, [page.children, mode]);

  // Detect WebGL background effects that should show through sections
  const hasWebglBackground = useMemo(() =>
    effects.some((e) => e.enabled && EFFECT_REGISTRY[e.type]?.renderer === 'webgl' && EFFECT_REGISTRY[e.type]?.category === 'background'),
    [effects],
  );

  // Extract preset background RGB for consistent section tinting per template
  const presetBgRgb = useMemo(() => {
    if (!hasWebglBackground) return;
    const presetId = page.effects?.presetId;
    const preset = presetId ? getVisualPreset(presetId) : null;
    const bg = preset?.palette.background ?? '#0d0f10';
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }, [hasWebglBackground, page.effects?.presetId]);

  return (
    <main
      className="relative min-h-full w-full text-neutral-100"
      style={{ background: hasWebglBackground ? 'transparent' : '#101214' }}
    >
      {pseudoCss && <style>{pseudoCss}</style>}
      {effects.length > 0 && <EffectsLayer effects={effects} globalIntensity={effectIntensity} mode={mode} />}
      <div className="relative" style={{ zIndex: 10 }}>
        {page.children.map((node) => (
          <PageNodeView
            key={node.id}
            node={node}
            interactions={interactions}
            selectedNodeId={selectedNodeId}
            activeBreakpoint={activeBreakpoint}
            previewPseudo={previewPseudo}
            mode={mode}
            onSelectNode={onSelectNode}
            onSelectParentNode={onSelectParentNode}
            onUpdateNodeProps={onUpdateNodeProps}
            hasWebglBackground={hasWebglBackground}
            presetBgRgb={presetBgRgb}
            dataSchema={dataSchema}
            variables={variables}
            recordsByCollection={recordsByCollection}
            onNavigateHref={navigateHref}
          />
        ))}
      </div>
      {toast && (
        <div
          className="fixed bottom-5 right-5 z-[999] rounded-md border px-4 py-3 text-sm shadow-2xl"
          style={{
            borderColor: toast.tone === 'error' ? 'rgba(248,113,113,0.45)' : 'rgba(52,211,153,0.45)',
            background: toast.tone === 'error' ? 'rgba(69,10,10,0.92)' : 'rgba(6,35,27,0.92)',
            color: '#f5f5f4',
          }}
        >
          {toast.message}
        </div>
      )}
    </main>
  );
}
