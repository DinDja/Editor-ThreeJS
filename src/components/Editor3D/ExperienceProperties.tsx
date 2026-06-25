'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Check,
  Component,
  Copy,
  Database,
  Eye,
  MousePointer2,
  PanelRight,
  Palette,
  Plus,
  Settings,
  SlidersHorizontal,
  Trash2,
  Type,
  Unlink,
} from 'lucide-react';
import {
  INTERACTION_ACTION_LABELS,
  INTERACTION_ACTIONS,
  INTERACTION_TRIGGER_LABELS,
  INTERACTION_TRIGGERS,
  type AnimationSettings,
  type InteractionAction,
  type InteractionTrigger,
} from '@/lib/interaction-engine/types';
import { exportTargetLabel } from '@/lib/export-engine/exportExperience';
import { flattenPageNodes, findPageNode } from '@/lib/page-builder/tree';
import type { ExportTarget, PageNode, PageStyle, PseudoClass } from '@/lib/page-builder/types';
import { computePreviewRuntimeMetrics } from '@/lib/preview-runtime/metrics';
import { useEditorStore } from '@/store/editorStore';
import { useDataModelStore } from '@/store/dataModelStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { useVariableStore } from '@/store/variableStore';
import { EffectsPanel, GlobalStylePanel } from './EffectsPanel';
import {
  EmptyState,
  fieldInputClass,
  fieldLabelClass,
  Section,
  SegmentedControl,
  SelectField,
  TextField,
  ToggleRow,
} from './ui/primitives';

const labelClass = fieldLabelClass;
const inputClass = fieldInputClass;

function PseudoField({ label, placeholder, node, pseudo, bp, prop, onChange }: {
  label: string;
  placeholder: string;
  node: PageNode;
  pseudo: PseudoClass | null;
  bp: string;
  prop: keyof PageStyle;
  onChange: (value: string) => void;
}) {
  const pseudoStyles = pseudo && node.pseudo?.[pseudo]?.[bp];
  const value = pseudoStyles ? String((pseudoStyles as Record<string, unknown>)?.[prop] ?? '') : '';
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-2">
      <span className="text-[10px] text-neutral-500">{label}</span>
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

function WebNodeProperties() {
  const [styleBreakpoint, setStyleBreakpoint] = useState<string>('base');
  const [editingPseudo, setEditingPseudo] = useState<PseudoClass | null>(null);
  const [designTab, setDesignTab] = useState<'conteudo' | 'design'>('design');
  const page = useExperienceStore((state) => state.page);
  const selectedPageNodeId = useExperienceStore((state) => state.selectedPageNodeId);
  const setPreviewPseudo = useExperienceStore((state) => state.setPreviewPseudo);
  const updatePageNode = useExperienceStore((state) => state.updatePageNode);
  const updatePageNodeStyle = useExperienceStore((state) => state.updatePageNodeStyle);
  const updatePageNodePseudoStyle = useExperienceStore((state) => state.updatePageNodePseudoStyle);
  const updatePageNodeProps = useExperienceStore((state) => state.updatePageNodeProps);
  const removePageNode = useExperienceStore((state) => state.removePageNode);
  const duplicatePageNode = useExperienceStore((state) => state.duplicatePageNode);
  const addPageNode = useExperienceStore((state) => state.addPageNode);
  const syncComponentInstances = useExperienceStore((state) => state.syncComponentInstances);
  const detachComponentInstance = useExperienceStore((state) => state.detachComponentInstance);
  const addBreakpoint = useExperienceStore((state) => state.addBreakpoint);
  const renameBreakpoint = useExperienceStore((state) => state.renameBreakpoint);
  const removeBreakpoint = useExperienceStore((state) => state.removeBreakpoint);
  const updateBreakpointWidth = useExperienceStore((state) => state.updateBreakpointWidth);
  const dataSchema = useDataModelStore((state) => state.schema);
  const breakpointDefs = page.responsive;
  const node = findPageNode(page.children, selectedPageNodeId);

  if (!node) {
    return (
      <div className="ed-scroll min-h-0 flex-1 space-y-1 overflow-auto py-3">
        <GlobalStylePanel />
        <EffectsPanel />
        <EmptyState
          icon={<MousePointer2 size={20} />}
          title="Nenhum elemento selecionado"
          description="Clique em um elemento no canvas ou na árvore para editar conteúdo, layout e estilo."
          action={
            <div className="flex flex-wrap justify-center gap-1.5">
              <button
                type="button"
                onClick={() => addPageNode('section')}
                className="flex h-8 items-center gap-1.5 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 text-[11px] font-medium text-emerald-200 transition hover:border-emerald-300/60"
              >
                <Plus size={12} />
                Section
              </button>
              <button
                type="button"
                onClick={() => addPageNode('text')}
                className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-700/60 px-3 text-[11px] font-medium text-neutral-300 transition hover:border-emerald-400/40 hover:text-emerald-200"
              >
                <Plus size={12} />
                Texto
              </button>
              <button
                type="button"
                onClick={() => addPageNode('button')}
                className="flex h-8 items-center gap-1.5 rounded-md border border-neutral-700/60 px-3 text-[11px] font-medium text-neutral-300 transition hover:border-emerald-400/40 hover:text-emerald-200"
              >
                <Plus size={12} />
                Botão
              </button>
            </div>
          }
        />
      </div>
    );
  }

  const style = node.styles[styleBreakpoint] ?? {};
  const styleValue = (key: keyof PageStyle) =>
    style[key] ?? (styleBreakpoint !== 'base' ? node.styles.base[key] : undefined) ?? '';
  const setStyle = (key: keyof PageStyle, value: string | number) => {
    updatePageNodeStyle(node.id, { [key]: value } as Partial<PageStyle>, styleBreakpoint);
  };
  const setProp = (key: string, value: unknown) => updatePageNodeProps(node.id, { [key]: value });

  return (
    <div className="ed-scroll min-h-0 flex-1 space-y-1 overflow-auto py-3">
      <GlobalStylePanel />
      <EffectsPanel />
      <Section title="Elemento" icon={<Box size={11} />}>
        <TextField label="Nome" value={node.name} onChange={(name) => updatePageNode(node.id, { name })} />
        <div className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950/50 px-2.5 py-1.5 text-xs text-neutral-400">
          <span className="grid h-5 w-5 place-items-center rounded bg-emerald-400/10 text-[9px] font-bold uppercase text-emerald-300">
            {node.type.slice(0, 2)}
          </span>
          <span className="font-mono text-[11px]">{node.type}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => duplicatePageNode(node.id)}
            className="flex h-8 items-center justify-center gap-1 rounded-md border border-neutral-700/60 text-[10px] text-neutral-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
          >
            <Plus size={12} />
            Duplicar
          </button>
          <button
            type="button"
            onClick={() => removePageNode(node.id)}
            className="flex h-8 items-center justify-center gap-1 rounded-md border border-red-400/25 text-[10px] text-red-300 transition hover:border-red-400/60 hover:bg-red-400/8"
          >
            <Trash2 size={12} />
            Remover
          </button>
        </div>
        {node.componentId && (
          <div className="flex items-center gap-2 rounded-md border border-emerald-400/20 bg-emerald-400/5 px-2 py-1.5 text-[10px]">
            <Component size={11} className="shrink-0 text-emerald-300" />
            <span className="flex-1 text-emerald-200">Instancia de componente</span>
            <button
              type="button"
              onClick={() => syncComponentInstances(node.componentId!)}
              className="grid h-6 w-6 place-items-center rounded text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200"
              title="Sincronizar"
            >
              <Copy size={11} />
            </button>
            <button
              type="button"
              onClick={() => detachComponentInstance(node.id)}
              className="grid h-6 w-6 place-items-center rounded text-neutral-500 transition hover:bg-amber-500/15 hover:text-amber-200"
              title="Desvincular"
            >
              <Unlink size={11} />
            </button>
          </div>
        )}
      </Section>

      <div className="sticky top-0 z-10 flex items-center gap-1 border-y border-neutral-800 bg-[#151719]/95 px-2 py-1.5 backdrop-blur">
        <SegmentedControl
          value={designTab}
          onChange={setDesignTab}
          size="sm"
          options={[
            { value: 'design', label: <span className="flex items-center gap-1.5"><SlidersHorizontal size={12} /> Design</span> },
            { value: 'conteudo', label: <span className="flex items-center gap-1.5"><Type size={12} /> Conteúdo</span> },
          ]}
        />
      </div>

      {designTab === 'conteudo' && (
        <>
      {(node.type === 'text' || node.type === 'button' || node.type === 'card' || node.type === 'navbar' || node.type === 'footer' || node.type === 'form' || node.type === 'input' || node.type === 'select' || node.type === 'textarea' || node.type === 'label' || node.type === 'modal' || node.type === 'menu' || node.type === 'menuitem') && (
        <Section title="Conteudo" icon={<Check size={11} />}>
          {node.type === 'text' && (
            <>
              <TextField label="Texto" value={String(node.props.text ?? '')} onChange={(value) => setProp('text', value)} />
              <SelectField
                label="Tag"
                value={String(node.props.as ?? 'p')}
                options={['h1', 'h2', 'h3', 'p', 'span'].map((value) => ({ value, label: value }))}
                onChange={(value) => setProp('as', value)}
              />
            </>
          )}
          {node.type === 'button' && (
            <>
              <TextField label="Label" value={String(node.props.label ?? '')} onChange={(value) => setProp('label', value)} />
              <TextField label="Link" value={String(node.props.href ?? '')} onChange={(value) => setProp('href', value)} />
            </>
          )}
          {node.type === 'card' && (
            <>
              <TextField label="Titulo" value={String(node.props.title ?? '')} onChange={(value) => setProp('title', value)} />
              <TextField label="Texto" value={String(node.props.body ?? '')} onChange={(value) => setProp('body', value)} />
            </>
          )}
          {node.type === 'navbar' && (
            <TextField label="Marca" value={String(node.props.brand ?? '')} onChange={(value) => setProp('brand', value)} />
          )}
          {node.type === 'footer' && (
            <TextField label="Texto" value={String(node.props.text ?? '')} onChange={(value) => setProp('text', value)} />
          )}
          {node.type === 'form' && (
            <>
              <TextField label="Nome" value={String(node.props.name ?? '')} onChange={(value) => setProp('name', value)} />
              <TextField label="Action" value={String(node.props.action ?? '#')} onChange={(value) => setProp('action', value)} />
              <SelectField
                label="Metodo"
                value={String(node.props.method ?? 'POST')}
                options={['POST', 'GET'].map((v) => ({ value: v, label: v }))}
                onChange={(value) => setProp('method', value)}
              />
            </>
          )}
          {node.type === 'input' && (
            <>
              <TextField label="Nome do campo" value={String(node.props.name ?? '')} onChange={(value) => setProp('name', value)} />
              <TextField label="Label" value={String(node.props.label ?? '')} onChange={(value) => setProp('label', value)} />
              <TextField label="Placeholder" value={String(node.props.placeholder ?? '')} onChange={(value) => setProp('placeholder', value)} />
              <SelectField
                label="Tipo"
                value={String(node.props.type ?? 'text')}
                options={['text', 'email', 'password', 'number', 'tel', 'url'].map((v) => ({ value: v, label: v }))}
                onChange={(value) => setProp('type', value)}
              />
              <ToggleRow label="Obrigatorio" enabled={Boolean(node.props.required)} onChange={() => setProp('required', !node.props.required)} />
            </>
          )}
          {node.type === 'select' && (
            <>
              <TextField label="Nome do campo" value={String(node.props.name ?? '')} onChange={(value) => setProp('name', value)} />
              <TextField label="Label" value={String(node.props.label ?? '')} onChange={(value) => setProp('label', value)} />
              <TextField label="Placeholder" value={String(node.props.placeholder ?? '')} onChange={(value) => setProp('placeholder', value)} />
              <TextField label="Opcoes (separadas por virgula)" value={String((node.props.options as string[] | undefined)?.join(', ') ?? '')} onChange={(value) => setProp('options', value.split(',').map((s) => s.trim()).filter(Boolean))} />
            </>
          )}
          {node.type === 'textarea' && (
            <>
              <TextField label="Nome do campo" value={String(node.props.name ?? '')} onChange={(value) => setProp('name', value)} />
              <TextField label="Label" value={String(node.props.label ?? '')} onChange={(value) => setProp('label', value)} />
              <TextField label="Placeholder" value={String(node.props.placeholder ?? '')} onChange={(value) => setProp('placeholder', value)} />
              <TextField label="Linhas" value={String(node.props.rows ?? 4)} onChange={(value) => setProp('rows', Number(value))} />
            </>
          )}
          {node.type === 'label' && (
            <>
              <TextField label="Texto" value={String(node.props.text ?? '')} onChange={(value) => setProp('text', value)} />
              <TextField label="For (id do campo)" value={String(node.props.htmlFor ?? '')} onChange={(value) => setProp('htmlFor', value)} />
            </>
          )}
          {node.type === 'modal' && (
            <>
              <TextField label="Titulo" value={String(node.props.title ?? '')} onChange={(value) => setProp('title', value)} />
              <ToggleRow label="Fechavel" enabled={Boolean(node.props.closable)} onChange={() => setProp('closable', !node.props.closable)} />
              <ToggleRow label="Aberto" enabled={Boolean(node.props.open)} onChange={() => setProp('open', !node.props.open)} />
            </>
          )}
          {node.type === 'menu' && (
            <TextField label="Orientacao" value={String(node.props.orientation ?? 'vertical')} onChange={(value) => setProp('orientation', value)} />
          )}
          {node.type === 'menuitem' && (
            <>
              <TextField label="Label" value={String(node.props.label ?? '')} onChange={(value) => setProp('label', value)} />
              <TextField label="Link" value={String(node.props.href ?? '#')} onChange={(value) => setProp('href', value)} />
              <TextField label="Icone" value={String(node.props.icon ?? '')} onChange={(value) => setProp('icon', value)} />
            </>
          )}
        </Section>
      )}

      {(node.type === 'image' || node.type === 'video') && (
        <Section title="Midia" icon={<Palette size={11} />}>
          <TextField label="Source" value={String(node.props.src ?? '')} onChange={(value) => setProp('src', value)} />
          {node.type === 'image' && (
            <TextField label="Alt" value={String(node.props.alt ?? '')} onChange={(value) => setProp('alt', value)} />
          )}
          {node.type === 'video' && (
            <ToggleRow label="Controles" enabled={node.props.controls !== false} onChange={() => setProp('controls', node.props.controls === false)} />
          )}
        </Section>
      )}

      {node.type === 'sceneCanvas' && (
        <Section title="Cena 3D" icon={<MousePointer2 size={11} />}>
          <SelectField
            label="Uso"
            value={String(node.props.placement ?? 'inline')}
            options={['inline', 'background', 'side', 'center'].map((value) => ({ value, label: value }))}
            onChange={(value) => setProp('placement', value)}
          />
          <ToggleRow label="Interativo" enabled={Boolean(node.props.interactive)} onChange={() => setProp('interactive', !node.props.interactive)} />
          <ToggleRow label="Transparente" enabled={node.props.transparent !== false} onChange={() => setProp('transparent', node.props.transparent === false)} />
        </Section>
      )}

      {(node.type === 'dataTable' || node.type === 'dataForm' || node.type === 'dataList' || node.type === 'dataChart' || node.type === 'dataStat' || node.type === 'pageRoute') && (
        <Section title="Dados" icon={<Database size={11} />}>
          {node.type === 'pageRoute' ? (
            <>
              <TextField label="Path" value={String(node.props.path ?? '/pagina')} onChange={(value) => setProp('path', value)} />
              <TextField label="Titulo" value={String(node.props.title ?? '')} onChange={(value) => setProp('title', value)} />
              <ToggleRow label="Protegida" enabled={Boolean(node.props.protected)} onChange={() => setProp('protected', !node.props.protected)} />
            </>
          ) : (
            <>
              <SelectField
                label="Colecao"
                value={String(node.props.collectionId ?? dataSchema.collections[0]?.id ?? '')}
                options={dataSchema.collections.map((collection) => ({ value: collection.id, label: collection.label }))}
                onChange={(value) => setProp('collectionId', value)}
              />
              {(node.type === 'dataTable' || node.type === 'dataList' || node.type === 'dataChart') && (
                <SelectField
                  label="Query"
                  value={String(node.props.queryId ?? '')}
                  options={[
                    { value: '', label: 'Sem query' },
                    ...(dataSchema.collections.find((collection) => collection.id === node.props.collectionId)?.queries ?? []).map((query) => ({ value: query.id, label: query.name })),
                  ]}
                  onChange={(value) => setProp('queryId', value)}
                />
              )}
              {(node.type === 'dataTable' || node.type === 'dataList' || node.type === 'dataChart') && (
                <TextField label="Limite" value={String(node.props.limit ?? 6)} onChange={(value) => setProp('limit', Number(value) || 1)} />
              )}
              {node.type === 'dataTable' && (
                <TextField
                  label="Colunas"
                  value={String((node.props.columns as string[] | undefined)?.join(', ') ?? '')}
                  onChange={(value) => setProp('columns', value.split(',').map((item) => item.trim()).filter(Boolean))}
                />
              )}
              {node.type === 'dataForm' && (
                <>
                  <TextField label="Botao" value={String(node.props.submitLabel ?? 'Salvar')} onChange={(value) => setProp('submitLabel', value)} />
                  <TextField label="Sucesso" value={String(node.props.successMessage ?? 'Registro salvo')} onChange={(value) => setProp('successMessage', value)} />
                </>
              )}
              {node.type === 'dataList' && (
                <>
                  <TextField label="Campo titulo" value={String(node.props.titleField ?? 'name')} onChange={(value) => setProp('titleField', value)} />
                  <TextField label="Campo texto" value={String(node.props.bodyField ?? 'message')} onChange={(value) => setProp('bodyField', value)} />
                </>
              )}
              {node.type === 'dataChart' && (
                <>
                  <TextField label="Campo label" value={String(node.props.labelField ?? 'name')} onChange={(value) => setProp('labelField', value)} />
                  <TextField label="Campo valor" value={String(node.props.valueField ?? 'id')} onChange={(value) => setProp('valueField', value)} />
                </>
              )}
              {node.type === 'dataStat' && (
                <>
                  <TextField label="Label" value={String(node.props.label ?? 'Total')} onChange={(value) => setProp('label', value)} />
                  <SelectField
                    label="Agregado"
                    value={String(node.props.aggregate ?? 'count')}
                    options={['count', 'sum', 'avg'].map((value) => ({ value, label: value }))}
                    onChange={(value) => setProp('aggregate', value)}
                  />
                  <TextField label="Campo" value={String(node.props.field ?? '')} onChange={(value) => setProp('field', value)} />
                </>
              )}
            </>
          )}
        </Section>
      )}
        </>
      )}

      {designTab === 'design' && (
        <>
      <Section title="Layout" icon={<PanelRight size={11} />}>
        <div className="flex flex-wrap gap-1 rounded-md bg-neutral-950/70 p-1">
          {[{ name: 'base', width: 0 } as const, ...breakpointDefs.filter((bp) => bp.name !== 'base')].map((bp) => (
            <button
              key={bp.name}
              type="button"
              onClick={() => setStyleBreakpoint(bp.name)}
              className={`h-7 rounded px-2 text-[10px] font-medium uppercase tracking-[0.12em] transition ${
                styleBreakpoint === bp.name ? 'bg-emerald-400/12 text-emerald-200' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              {bp.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              const baseName = 'custom';
              let i = 1;
              while (breakpointDefs.some((bp) => bp.name === `${baseName}${i > 1 ? i : ''}`)) i++;
              const name = `${baseName}${i > 1 ? i : ''}`;
              addBreakpoint(name, 600);
              setStyleBreakpoint(name);
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200"
            title="Adicionar breakpoint"
          >
            <Plus size={12} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Largura" value={String(styleValue('width'))} onChange={(value) => setStyle('width', value)} />
          <TextField label="Altura" value={String(styleValue('height'))} onChange={(value) => setStyle('height', value)} />
          <TextField label="Min H" value={String(styleValue('minHeight'))} onChange={(value) => setStyle('minHeight', value)} />
          <TextField label="Max W" value={String(styleValue('maxWidth'))} onChange={(value) => setStyle('maxWidth', value)} />
          <TextField label="Padding" value={String(styleValue('padding'))} onChange={(value) => setStyle('padding', value)} />
          <TextField label="Margin" value={String(styleValue('margin'))} onChange={(value) => setStyle('margin', value)} />
          <TextField label="Gap" value={String(styleValue('gap'))} onChange={(value) => setStyle('gap', value)} />
          <TextField label="Z-index" value={String(styleValue('zIndex'))} onChange={(value) => setStyle('zIndex', Number(value) || 0)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Display"
            value={String(styleValue('display') || 'block')}
            options={['block', 'flex', 'grid', 'none'].map((value) => ({ value, label: value }))}
            onChange={(value) => setStyle('display', value)}
          />
          <SelectField
            label="Position"
            value={String(styleValue('position') || 'relative')}
            options={['static', 'relative', 'absolute', 'sticky', 'fixed'].map((value) => ({ value, label: value }))}
            onChange={(value) => setStyle('position', value)}
          />
          <TextField label="Top" value={String(styleValue('top'))} onChange={(value) => setStyle('top', value)} />
          <TextField label="Left" value={String(styleValue('left'))} onChange={(value) => setStyle('left', value)} />
          <TextField label="Right" value={String(styleValue('right'))} onChange={(value) => setStyle('right', value)} />
          <TextField label="Bottom" value={String(styleValue('bottom'))} onChange={(value) => setStyle('bottom', value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Flex dir"
            value={String(styleValue('flexDirection') || 'row')}
            options={['row', 'column'].map((value) => ({ value, label: value }))}
            onChange={(value) => setStyle('flexDirection', value)}
          />
          <TextField label="Place" value={String(styleValue('placeItems'))} onChange={(value) => setStyle('placeItems', value)} />
          <TextField label="Align" value={String(styleValue('alignItems'))} onChange={(value) => setStyle('alignItems', value)} />
          <TextField label="Justify" value={String(styleValue('justifyContent'))} onChange={(value) => setStyle('justifyContent', value)} />
        </div>
        <TextField label="Grid" value={String(styleValue('gridTemplateColumns'))} onChange={(value) => setStyle('gridTemplateColumns', value)} />
        <TextField label="Transform" value={String(styleValue('transform'))} onChange={(value) => setStyle('transform', value)} />
      </Section>

      <Section title="Visual" icon={<Palette size={11} />}>
        <TextField label="Background" value={String(styleValue('background'))} onChange={(value) => setStyle('background', value)} />
        <TextField label="Bg image" value={String(styleValue('backgroundImage'))} onChange={(value) => setStyle('backgroundImage', value)} />
        <TextField label="Cor" value={String(styleValue('color'))} onChange={(value) => setStyle('color', value)} />
        <TextField label="Borda" value={String(styleValue('border'))} onChange={(value) => setStyle('border', value)} />
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Fonte" value={String(styleValue('fontSize'))} onChange={(value) => setStyle('fontSize', value)} />
          <TextField label="Peso" value={String(styleValue('fontWeight'))} onChange={(value) => setStyle('fontWeight', value)} />
          <TextField label="Radius" value={String(styleValue('borderRadius'))} onChange={(value) => setStyle('borderRadius', value)} />
          <TextField label="Line" value={String(styleValue('lineHeight'))} onChange={(value) => setStyle('lineHeight', value)} />
          <SelectField
            label="Texto"
            value={String(styleValue('textAlign') || 'left')}
            options={['left', 'center', 'right'].map((value) => ({ value, label: value }))}
            onChange={(value) => setStyle('textAlign', value)}
          />
          <TextField label="Opacity" value={String(styleValue('opacity'))} onChange={(value) => setStyle('opacity', value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Overflow"
            value={String(styleValue('overflow') || 'visible')}
            options={['visible', 'hidden', 'auto', 'clip'].map((value) => ({ value, label: value }))}
            onChange={(value) => setStyle('overflow', value)}
          />
          <SelectField
            label="Object fit"
            value={String(styleValue('objectFit') || 'cover')}
            options={['cover', 'contain', 'fill'].map((value) => ({ value, label: value }))}
            onChange={(value) => setStyle('objectFit', value)}
          />
        </div>
        <TextField label="Sombra" value={String(styleValue('boxShadow'))} onChange={(value) => setStyle('boxShadow', value)} />
        <TextField label="Transition" value={String(styleValue('transition'))} onChange={(value) => setStyle('transition', value)} />
      </Section>

      <Section title="Estados" icon={<MousePointer2 size={11} />}>
        <div className="flex gap-1 rounded-md bg-neutral-950/70 p-1">
          {([null, 'hover', 'active', 'focus'] as const).map((pseudo) => (
            <button
              key={pseudo ?? 'none'}
              type="button"
              onClick={() => {
                setEditingPseudo(pseudo);
                setPreviewPseudo(pseudo);
              }}
              className={`h-7 flex-1 rounded text-[10px] font-medium uppercase tracking-[0.12em] transition ${
                editingPseudo === pseudo
                  ? 'bg-emerald-400/12 text-emerald-200'
                  : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              {pseudo ? ':' + pseudo : 'Normal'}
            </button>
          ))}
        </div>
        {editingPseudo && node.pseudo?.[editingPseudo] && (
          <div className="rounded-md border border-neutral-800 bg-neutral-950/30 p-2 text-[10px] text-neutral-400">
            Estilos de {editingPseudo ? ':' + editingPseudo : ''} definidos
          </div>
        )}
        <PseudoField
          label="Fundo"
          placeholder="Ex: #34d399"
          node={node}
          pseudo={editingPseudo}
          bp={styleBreakpoint}
          prop="background"
          onChange={(v) => {
            if (editingPseudo) updatePageNodePseudoStyle(node.id, editingPseudo, { background: v } as Partial<PageStyle>, styleBreakpoint);
          }}
        />
        <PseudoField
          label="Cor"
          placeholder="Ex: #f5f5f4"
          node={node}
          pseudo={editingPseudo}
          bp={styleBreakpoint}
          prop="color"
          onChange={(v) => {
            if (editingPseudo) updatePageNodePseudoStyle(node.id, editingPseudo, { color: v } as Partial<PageStyle>, styleBreakpoint);
          }}
        />
        <PseudoField
          label="Sombra"
          placeholder="box-shadow"
          node={node}
          pseudo={editingPseudo}
          bp={styleBreakpoint}
          prop="boxShadow"
          onChange={(v) => {
            if (editingPseudo) updatePageNodePseudoStyle(node.id, editingPseudo, { boxShadow: v } as Partial<PageStyle>, styleBreakpoint);
          }}
        />
        <PseudoField
          label="Transform"
          placeholder="transform"
          node={node}
          pseudo={editingPseudo}
          bp={styleBreakpoint}
          prop="transform"
          onChange={(v) => {
            if (editingPseudo) updatePageNodePseudoStyle(node.id, editingPseudo, { transform: v } as Partial<PageStyle>, styleBreakpoint);
          }}
        />
      </Section>

      <Section title="Responsivo" icon={<Eye size={11} />}>
        {[{ name: 'base', width: 0 } as const, ...breakpointDefs.filter((bp) => bp.name !== 'base')].map((bp) => {
          const visible = node.responsive?.[bp.name]?.visible !== false;
          return (
            <ToggleRow
              key={bp.name}
              label={bp.name}
              enabled={visible}
              onChange={() => updatePageNode(node.id, {
                responsive: {
                  ...(node.responsive ?? {}),
                  [bp.name]: { visible: !visible },
                },
              })}
            />
          );
        })}
      </Section>

      <Section title="Breakpoints" icon={<Settings size={11} />}>
        <div className="grid gap-2">
          {breakpointDefs.filter((bp) => bp.name !== 'base').map((bp) => (
            <div key={bp.name} className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950/40 p-2">
              <input
                value={bp.name}
                onChange={(e) => renameBreakpoint(bp.name, e.target.value)}
                className="h-7 min-w-0 flex-1 rounded border border-neutral-700/60 bg-[#0d0f10] px-2 text-[11px] text-neutral-200 outline-none transition focus:border-emerald-400"
              />
              <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                <span>{bp.width}px</span>
                <input
                  type="range"
                  min={320}
                  max={1920}
                  step={10}
                  value={bp.width}
                  onChange={(e) => updateBreakpointWidth(bp.name, Number(e.target.value))}
                  className="h-4 w-16 accent-emerald-400"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Remover breakpoint "${bp.name}"?`)) {
                    if (styleBreakpoint === bp.name) setStyleBreakpoint('base');
                    removeBreakpoint(bp.name);
                  }
                }}
                className="grid h-7 w-7 place-items-center rounded text-neutral-600 transition hover:bg-red-500/15 hover:text-red-200"
                title="Remover breakpoint"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {breakpointDefs.filter((bp) => bp.name !== 'base').length === 0 && (
            <div className="text-[11px] text-neutral-500">Nenhum breakpoint customizado. Clique em + na aba Layout para adicionar.</div>
          )}
        </div>
      </Section>
        </>
      )}
    </div>
  );
}

function InteractionProperties() {
  const page = useExperienceStore((state) => state.page);
  const interactions = useExperienceStore((state) => state.interactions);
  const selectedInteractionId = useExperienceStore((state) => state.selectedInteractionId);
  const addInteraction = useExperienceStore((state) => state.addInteraction);
  const updateInteraction = useExperienceStore((state) => state.updateInteraction);
  const setInteractionAction = useExperienceStore((state) => state.setInteractionAction);
  const removeInteraction = useExperienceStore((state) => state.removeInteraction);
  const sceneObjects = useSceneStore((state) => state.objects);
  const dataSchema = useDataModelStore((state) => state.schema);
  const variables = useVariableStore((state) => state.document.variables);
  const pageNodes = useMemo(() => flattenPageNodes(page), [page]);
  const interaction = interactions.find((item) => item.id === selectedInteractionId) ?? interactions[0] ?? null;

  if (!interaction) {
    return (
      <div className="grid gap-3 px-4 py-5">
        <button
          type="button"
          onClick={() => addInteraction()}
          className="flex h-9 items-center justify-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 text-xs font-medium text-emerald-200 transition hover:border-emerald-300/60"
        >
          <Plus size={14} />
          Nova interacao
        </button>
      </div>
    );
  }

  const updateParam = (key: string, value: unknown) => {
    updateInteraction(interaction.id, {
      params: { ...interaction.params, [key]: value },
    });
  };

  return (
    <div className="ed-scroll min-h-0 flex-1 space-y-1 overflow-auto py-3">
      <Section title="Interacao" icon={<MousePointer2 size={11} />}>
        <TextField label="Nome" value={interaction.name} onChange={(name) => updateInteraction(interaction.id, { name })} />
        <ToggleRow label="Ativa" enabled={interaction.enabled} onChange={() => updateInteraction(interaction.id, { enabled: !interaction.enabled })} />
        <SelectField
          label="Evento"
          value={interaction.trigger}
          options={INTERACTION_TRIGGERS.map((value) => ({ value, label: INTERACTION_TRIGGER_LABELS[value] }))}
          onChange={(trigger: InteractionTrigger) => updateInteraction(interaction.id, { trigger })}
        />
        <SelectField
          label="Acao"
          value={interaction.action}
          options={INTERACTION_ACTIONS.map((value) => ({ value, label: INTERACTION_ACTION_LABELS[value] }))}
          onChange={(action: InteractionAction) => setInteractionAction(interaction.id, action)}
        />
      </Section>

      <Section title="Origem e alvo" icon={<PanelRight size={11} />}>
        <SelectField
          label="Source"
          value={interaction.sourceId}
          options={pageNodes.map(({ node }) => ({ value: node.id, label: node.name }))}
          onChange={(sourceId) => updateInteraction(interaction.id, { sourceId })}
        />
        <SelectField
          label="Target"
          value={interaction.targetId}
          options={[
            { value: 'current-scene', label: 'Scene atual' },
            ...sceneObjects.map((object) => ({ value: object.uuid, label: object.name })),
            ...pageNodes.map(({ node }) => ({ value: node.id, label: node.name })),
          ]}
          onChange={(targetId) => updateInteraction(interaction.id, { targetId })}
        />
      </Section>

      <Section title="Parametros" icon={<Settings size={11} />}>
        {(interaction.action === 'changeColor' || interaction.action === 'changeMaterial') && (
          <TextField label="Cor" value={String(interaction.params.color ?? '#00ffcc')} onChange={(value) => updateParam('color', value)} />
        )}
        {interaction.action === 'changeOpacity' && (
          <TextField label="Opacidade" value={String(interaction.params.opacity ?? 0.65)} onChange={(value) => updateParam('opacity', Number(value))} />
        )}
        {interaction.action === 'changeText' && (
          <TextField label="Texto" value={String(interaction.params.text ?? '')} onChange={(value) => updateParam('text', value)} />
        )}
        {interaction.action === 'navigateToLink' && (
          <TextField label="Link" value={String(interaction.params.href ?? '#')} onChange={(value) => updateParam('href', value)} />
        )}
        {['createRecord', 'updateRecord', 'deleteRecord', 'loadCollection', 'runQuery'].includes(interaction.action) && (
          <SelectField
            label="Colecao"
            value={String(interaction.params.collectionId ?? dataSchema.collections[0]?.id ?? '')}
            options={dataSchema.collections.map((collection) => ({ value: collection.id, label: collection.label }))}
            onChange={(value) => updateParam('collectionId', value)}
          />
        )}
        {interaction.action === 'runQuery' && (
          <>
            <SelectField
              label="Query"
              value={String(interaction.params.queryId ?? '')}
              options={[
                { value: '', label: 'Sem query' },
                ...(dataSchema.collections.find((collection) => collection.id === interaction.params.collectionId)?.queries ?? []).map((query) => ({ value: query.id, label: query.name })),
              ]}
              onChange={(value) => updateParam('queryId', value)}
            />
            <TextField label="Salvar em var" value={String(interaction.params.resultVariable ?? 'queryResult')} onChange={(value) => updateParam('resultVariable', value)} />
          </>
        )}
        {(interaction.action === 'updateRecord' || interaction.action === 'deleteRecord') && (
          <TextField label="Record ID" value={String(interaction.params.recordId ?? '{{record.id}}')} onChange={(value) => updateParam('recordId', value)} />
        )}
        {interaction.action === 'createRecord' && (
          <TextField label="Record JSON" value={JSON.stringify(interaction.params.record ?? {})} onChange={(value) => {
            try { updateParam('record', JSON.parse(value)); } catch { updateParam('record', {}); }
          }} />
        )}
        {interaction.action === 'updateRecord' && (
          <TextField label="Patch JSON" value={JSON.stringify(interaction.params.patch ?? {})} onChange={(value) => {
            try { updateParam('patch', JSON.parse(value)); } catch { updateParam('patch', {}); }
          }} />
        )}
        {['setVariable', 'incrementVariable', 'toggleVariable', 'setLoading', 'setError'].includes(interaction.action) && (
          <SelectField
            label="Variavel"
            value={String(interaction.params.variableName ?? variables[0]?.name ?? '')}
            options={variables.map((variable) => ({ value: variable.name, label: variable.label }))}
            onChange={(value) => updateParam('variableName', value)}
          />
        )}
        {(interaction.action === 'setVariable' || interaction.action === 'setLoading' || interaction.action === 'setError') && (
          <TextField label="Valor" value={String(interaction.params.value ?? '')} onChange={(value) => updateParam('value', value)} />
        )}
        {interaction.action === 'incrementVariable' && (
          <TextField label="Incremento" value={String(interaction.params.amount ?? 1)} onChange={(value) => updateParam('amount', Number(value) || 1)} />
        )}
        {interaction.action === 'showToast' && (
          <>
            <TextField label="Mensagem" value={String(interaction.params.message ?? 'Acao executada')} onChange={(value) => updateParam('message', value)} />
            <SelectField
              label="Tom"
              value={String(interaction.params.tone ?? 'success')}
              options={['success', 'info', 'error'].map((value) => ({ value, label: value }))}
              onChange={(value) => updateParam('tone', value)}
            />
          </>
        )}
        {['moveObject3D', 'rotateObject3D', 'scaleObject3D', 'moveCamera', 'animateCamera'].includes(interaction.action) && (
          <TextField
            label="Vetor"
            value={String(interaction.params.position ?? interaction.params.rotation ?? interaction.params.scale ?? '[0,0,0]')}
            onChange={(value) => {
              const parsed = value.split(',').map((item) => Number(item.replace(/[\[\]]/g, '').trim()));
              const vector = parsed.length >= 3 && parsed.every(Number.isFinite) ? [parsed[0], parsed[1], parsed[2]] : [0, 0, 0];
              if (interaction.action === 'rotateObject3D') updateParam('rotation', vector);
              else if (interaction.action === 'scaleObject3D') updateParam('scale', vector);
              else updateParam('position', vector);
            }}
          />
        )}
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Duracao" value={String(interaction.duration ?? 0.4)} onChange={(value) => updateInteraction(interaction.id, { duration: Number(value) })} />
          <SelectField
            label="Easing"
            value={interaction.easing ?? 'easeOut'}
            options={['linear', 'ease', 'easeIn', 'easeOut', 'easeInOut', 'spring'].map((value) => ({ value, label: value }))}
            onChange={(easing) => updateInteraction(interaction.id, { easing: easing as AnimationSettings['easing'] })}
          />
        </div>
        <button
          type="button"
          onClick={() => removeInteraction(interaction.id)}
          className="flex h-8 items-center justify-center gap-1 rounded-md border border-red-400/25 text-[10px] text-red-300 transition hover:border-red-400/60 hover:bg-red-400/8"
        >
          <Trash2 size={12} />
          Remover
        </button>
      </Section>
    </div>
  );
}

function PreviewProperties() {
  const page = useExperienceStore((state) => state.page);
  const objects = useSceneStore((state) => state.objects);
  const materials = useMaterialStore((state) => state.materials);
  const settings = useExperienceStore((state) => state.settings);
  const metrics = useMemo(
    () => computePreviewRuntimeMetrics({ page, objects, materials, settings }),
    [page, objects, materials, settings],
  );
  const formatCount = (value: number) => value.toLocaleString('pt-BR');

  return (
    <div className="ed-scroll min-h-0 flex-1 space-y-1 overflow-auto py-3">
      <Section title="Runtime" icon={<Settings size={11} />}>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
            <span className={labelClass}>Objetos</span>
            <div className="mt-1 text-lg font-semibold text-neutral-100">{formatCount(metrics.objectCount)}</div>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
            <span className={labelClass}>FPS alvo</span>
            <div className="mt-1 text-lg font-semibold text-neutral-100">{settings.performanceBudget.targetFps}</div>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
            <span className={labelClass}>Modelos</span>
            <div className="mt-1 text-lg font-semibold text-neutral-100">{formatCount(metrics.modelCount)}</div>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
            <span className={labelClass}>Assets URL</span>
            <div className="mt-1 text-lg font-semibold text-neutral-100">{formatCount(metrics.assetUrlCount)}</div>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
            <span className={labelClass}>Triangulos</span>
            <div className="mt-1 text-lg font-semibold text-neutral-100">{formatCount(metrics.knownTriangleCount)}</div>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
            <span className={labelClass}>Texturas</span>
            <div className="mt-1 text-lg font-semibold text-neutral-100">{formatCount(metrics.textureCount)}</div>
          </div>
        </div>
        <div className="grid gap-1 rounded-md border border-neutral-800 bg-neutral-950/40 p-2 text-xs text-neutral-400">
          <div className="flex justify-between gap-3">
            <span>Vertices conhecidos</span>
            <strong className="text-neutral-200">{formatCount(metrics.knownVertexCount)}</strong>
          </div>
          <div className="flex justify-between gap-3">
            <span>Geometrias sem estatistica</span>
            <strong className="text-neutral-200">{formatCount(metrics.unknownGeometryCount)}</strong>
          </div>
          <div className="flex justify-between gap-3">
            <span>Luzes / Cameras</span>
            <strong className="text-neutral-200">{metrics.lightCount} / {metrics.cameraCount}</strong>
          </div>
        </div>
        {metrics.warnings.length > 0 && (
          <div className="grid gap-1.5">
            {metrics.warnings.map((warning) => (
              <div key={warning} className="rounded-md border border-amber-400/25 bg-amber-400/8 px-2 py-1.5 text-xs text-amber-100">
                {warning}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function ExportSettingsProperties() {
  const settings = useExperienceStore((state) => state.settings);
  const exportTarget = useExperienceStore((state) => state.exportTarget);
  const setExportTarget = useExperienceStore((state) => state.setExportTarget);
  const updateSettings = useExperienceStore((state) => state.updateSettings);

  return (
    <div className="ed-scroll min-h-0 flex-1 space-y-1 overflow-auto py-3">
      <Section title="Projeto" icon={<Settings size={11} />}>
        <TextField label="Nome" value={settings.name} onChange={(name) => updateSettings({ name })} />
        <SelectField
          label="Formato"
          value={exportTarget}
          options={(Object.keys(exportTargetLabel) as ExportTarget[]).map((value) => ({ value, label: exportTargetLabel[value] }))}
          onChange={setExportTarget}
        />
        <ToggleRow label="Tailwind" enabled={settings.tailwind} onChange={() => updateSettings({ tailwind: !settings.tailwind })} />
      </Section>
      <Section title="Budget" icon={<Palette size={11} />}>
        <TextField
          label="Model MB"
          value={String(settings.performanceBudget.maxModelMb)}
          onChange={(value) => updateSettings({ performanceBudget: { ...settings.performanceBudget, maxModelMb: Number(value) || 1 } })}
        />
        <TextField
          label="Texture"
          value={String(settings.performanceBudget.maxTextureSize)}
          onChange={(value) => updateSettings({ performanceBudget: { ...settings.performanceBudget, maxTextureSize: Number(value) || 1024 } })}
        />
        <TextField
          label="FPS"
          value={String(settings.performanceBudget.targetFps)}
          onChange={(value) => updateSettings({ performanceBudget: { ...settings.performanceBudget, targetFps: Number(value) || 30 } })}
        />
      </Section>
    </div>
  );
}

export default function ExperienceProperties() {
  const activeMode = useExperienceStore((state) => state.activeMode);
  const rightPanelCollapsed = useEditorStore((state) => state.rightPanelCollapsed);
  const setRightPanelCollapsed = useEditorStore((state) => state.setRightPanelCollapsed);
  const title =
    activeMode === 'interactions'
      ? 'Interactions'
      : activeMode === 'preview'
        ? 'Preview'
        : activeMode === 'export'
          ? 'Export'
          : 'Properties';

  if (rightPanelCollapsed) {
    return (
      <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-[#151719]">
        <div className="flex items-center justify-center border-b border-neutral-800 py-3">
          <button
            type="button"
            onClick={() => setRightPanelCollapsed(false)}
            className="grid min-h-9 min-w-9 place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
            title="Expandir"
          >
            <PanelRight size={15} className="rotate-180" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-[#151719]">
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-2">
          <PanelRight size={14} className="text-emerald-300" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{title}</h2>
        </div>
        <button
          type="button"
          onClick={() => setRightPanelCollapsed(true)}
          className="grid min-h-8 min-w-8 place-items-center rounded text-neutral-500 transition hover:bg-neutral-700/80 hover:text-neutral-100"
          title="Recolher"
        >
          <PanelRight size={14} />
        </button>
      </div>
      {activeMode === 'interactions' ? (
        <InteractionProperties />
      ) : activeMode === 'preview' ? (
        <PreviewProperties />
      ) : activeMode === 'export' ? (
        <ExportSettingsProperties />
      ) : (
        <WebNodeProperties />
      )}
    </aside>
  );
}
