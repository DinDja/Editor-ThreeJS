'use client';

import { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  MousePointer2,
  PanelRight,
  Palette,
  Plus,
  Settings,
  Trash2,
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
import type { Breakpoint, ExportTarget, PageStyle } from '@/lib/page-builder/types';
import { computePreviewRuntimeMetrics } from '@/lib/preview-runtime/metrics';
import { useEditorStore } from '@/store/editorStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { EffectsPanel, GlobalStylePanel } from './EffectsPanel';

const labelClass = 'text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500';
const inputClass =
  'h-8 w-full rounded-md border border-neutral-700/80 bg-[#0d0f10] px-2.5 text-xs text-neutral-100 outline-none transition focus:border-emerald-400 focus:bg-[#101414]';

function Section({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = `experience-${title.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="grid">
      <button
        type="button"
        id={id}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-neutral-800/50"
      >
        {icon && <span className="text-neutral-500">{icon}</span>}
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{title}</span>
        <ChevronDown size={12} className={`ml-auto text-neutral-600 transition ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="grid gap-3 px-2 pb-3">{children}</div>}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className={labelClass}>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className={labelClass}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)} className={inputClass}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function ToggleRow({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs transition ${
        enabled
          ? 'border-emerald-400/30 bg-emerald-400/8 text-emerald-100'
          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className={enabled ? 'text-emerald-300' : 'text-neutral-600'}>
        {enabled ? <Eye size={13} /> : <EyeOff size={13} />}
      </span>
    </button>
  );
}

function WebNodeProperties() {
  const [styleBreakpoint, setStyleBreakpoint] = useState<Breakpoint>('base');
  const page = useExperienceStore((state) => state.page);
  const selectedPageNodeId = useExperienceStore((state) => state.selectedPageNodeId);
  const updatePageNode = useExperienceStore((state) => state.updatePageNode);
  const updatePageNodeStyle = useExperienceStore((state) => state.updatePageNodeStyle);
  const updatePageNodeProps = useExperienceStore((state) => state.updatePageNodeProps);
  const removePageNode = useExperienceStore((state) => state.removePageNode);
  const duplicatePageNode = useExperienceStore((state) => state.duplicatePageNode);
  const node = findPageNode(page.children, selectedPageNodeId);

  if (!node) {
    return (
      <div className="min-h-0 flex-1 space-y-1 overflow-auto py-3">
        <GlobalStylePanel />
        <EffectsPanel />
        <div className="grid h-32 place-items-center px-6 text-center text-xs text-neutral-500">
          Selecione um elemento da pagina para editar conteudo, layout e estilo.
        </div>
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
    <div className="min-h-0 flex-1 space-y-1 overflow-auto py-3">
      <GlobalStylePanel />
      <EffectsPanel />
      <Section title="Elemento" icon={<Settings size={11} />}>
        <TextField label="Nome" value={node.name} onChange={(name) => updatePageNode(node.id, { name })} />
        <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2 text-xs text-neutral-400">{node.type}</div>
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
      </Section>

      {(node.type === 'text' || node.type === 'button' || node.type === 'card' || node.type === 'navbar' || node.type === 'footer') && (
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

      <Section title="Layout" icon={<PanelRight size={11} />}>
        <div className="grid grid-cols-3 gap-1 rounded-md bg-neutral-950/70 p-1">
          {(['base', 'tablet', 'mobile'] as Breakpoint[]).map((breakpoint) => (
            <button
              key={breakpoint}
              type="button"
              onClick={() => setStyleBreakpoint(breakpoint)}
              className={`h-7 rounded text-[10px] font-medium uppercase tracking-[0.12em] transition ${
                styleBreakpoint === breakpoint ? 'bg-emerald-400/12 text-emerald-200' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              {breakpoint}
            </button>
          ))}
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

      <Section title="Responsivo" icon={<Eye size={11} />}>
        {(['base', 'tablet', 'mobile'] as const).map((breakpoint) => {
          const visible = node.responsive?.[breakpoint]?.visible !== false;
          return (
            <ToggleRow
              key={breakpoint}
              label={breakpoint}
              enabled={visible}
              onChange={() => updatePageNode(node.id, {
                responsive: {
                  ...(node.responsive ?? {}),
                  [breakpoint]: { visible: !visible },
                },
              })}
            />
          );
        })}
      </Section>
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
    <div className="min-h-0 flex-1 space-y-1 overflow-auto py-3">
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
    <div className="min-h-0 flex-1 space-y-1 overflow-auto py-3">
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
    <div className="min-h-0 flex-1 space-y-1 overflow-auto py-3">
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
