'use client';

import {
  createElement,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useMemo,
} from 'react';
import ExperienceSceneCanvas from './ExperienceSceneCanvas';
import { EffectsLayer } from '@/components/effects';
import type { InteractionDocument } from '@/lib/interaction-engine/types';
import type { PageDocument, PageNode, PreviewDevice } from '@/lib/page-builder/types';
import { EFFECT_REGISTRY } from '@/lib/effects-system/registry';
import { getVisualPreset } from '@/lib/template-engine/presets';

type PageExperienceProps = {
  page: PageDocument;
  interactions: InteractionDocument[];
  selectedNodeId?: string | null;
  device?: PreviewDevice;
  mode?: 'edit' | 'preview';
  onSelectNode?: (id: string) => void;
  onUpdateNodeProps?: (id: string, patch: Record<string, unknown>) => void;
  onDuplicateNode?: (id: string) => void;
  onRemoveNode?: (id: string) => void;
};

const deviceToBreakpoint: Record<PreviewDevice, 'base' | 'tablet' | 'mobile'> = {
  desktop: 'base',
  tablet: 'tablet',
  mobile: 'mobile',
};

const toCssProperties = (node: PageNode, device: PreviewDevice): CSSProperties => {
  const breakpoint = deviceToBreakpoint[device];
  return {
    ...(node.styles.base as CSSProperties),
    ...((breakpoint !== 'base' ? node.styles[breakpoint] : undefined) as CSSProperties | undefined),
  };
};

const dispatchRuntimeInteraction = (interaction: InteractionDocument, active: boolean) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('experience-interaction', {
    detail: { id: interaction.id, active },
  }));
};

const applyDomAction = (interaction: InteractionDocument, active: boolean) => {
  if (typeof document === 'undefined' || !active) return;
  const target = document.querySelector<HTMLElement>(`[data-experience-node="${interaction.targetId}"]`);
  if (!target) return;

  if (interaction.action === 'showElement') target.style.display = '';
  if (interaction.action === 'hideElement') target.style.display = 'none';
  if (interaction.action === 'changeText') {
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

function hasSceneCanvasChild(node: PageNode): boolean {
  if (!node.children) return false;
  return node.children.some((child) => child.type === 'sceneCanvas');
}

function PageNodeView({
  node,
  interactions,
  selectedNodeId,
  device,
  mode,
  onSelectNode,
  onUpdateNodeProps,
  hasWebglBackground,
  presetBgRgb,
}: {
  node: PageNode;
  interactions: InteractionDocument[];
  selectedNodeId: string | null;
  device: PreviewDevice;
  mode: 'edit' | 'preview';
  onSelectNode?: (id: string) => void;
  onUpdateNodeProps?: (id: string, patch: Record<string, unknown>) => void;
  hasWebglBackground?: boolean;
  presetBgRgb?: string;
}) {
  const style = toCssProperties(node, device);
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
    onSelectNode?.(node.id);
  };

  const handlers = {
    onClick: (event: MouseEvent<HTMLElement>) => {
      handleSelect(event);
      if (mode !== 'preview') return;
      const clickInteractions = nodeInteractions.filter((interaction) => interaction.trigger === 'click');
      triggerInteractions(clickInteractions, true);
      window.setTimeout(() => triggerInteractions(clickInteractions, false), 360);
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
      ? 'outline outline-1 outline-transparent hover:outline-emerald-400/40'
      : undefined;

  const sharedProps = {
    'data-experience-node': node.id,
    'data-node-type': node.type,
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
    return createElement(tag, { ...sharedProps, ...editableTextProps('text', true) }, String(node.props.text ?? ''));
  }

  if (node.type === 'button') {
    return (
      <a {...sharedProps} {...editableTextProps('label')} href={mode === 'preview' ? String(node.props.href ?? '#') : '#'} role="button">
        {String(node.props.label ?? 'Button')}
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

  const tag = node.type === 'navbar' ? 'nav' : node.type === 'footer' ? 'footer' : node.type === 'card' ? 'article' : 'section';
  const children: ReactNode[] = [];

  if (node.type === 'navbar') {
    children.push(
      <strong key="brand" className="text-sm font-semibold text-neutral-50" {...editableTextProps('brand')}>{String(node.props.brand ?? '3D Web')}</strong>,
      <div key="links" className="flex flex-wrap items-center gap-4 text-xs text-neutral-300">
        {Array.isArray(node.props.links)
          ? node.props.links.map((link) => <span key={String(link)}>{String(link)}</span>)
          : null}
      </div>,
    );
  }

  if (node.type === 'card') {
    children.push(
      <div key="card-content" className="grid gap-2">
        <h3 className="text-sm font-semibold text-neutral-50" {...editableTextProps('title')}>{String(node.props.title ?? 'Card')}</h3>
        <p className="text-sm leading-6 text-neutral-400" {...editableTextProps('body', true)}>{String(node.props.body ?? '')}</p>
      </div>,
    );
  }

  if (node.type === 'footer') {
    children.push(<span key="footer-text" className="text-xs text-neutral-500" {...editableTextProps('text')}>{String(node.props.text ?? '')}</span>);
  }

  children.push(
    ...(node.children ?? []).map((child) => (
      <PageNodeView
        key={child.id}
        node={child}
        interactions={interactions}
        selectedNodeId={selectedNodeId}
        device={device}
        mode={mode}
        onSelectNode={onSelectNode}
        onUpdateNodeProps={onUpdateNodeProps}
        hasWebglBackground={hasWebglBackground}
        presetBgRgb={presetBgRgb}
      />
    )),
  );

  return createElement(tag, sharedProps, ...children);
}

export default function PageExperience({
  page,
  interactions,
  selectedNodeId = null,
  device = 'desktop',
  mode = 'preview',
  onSelectNode,
  onUpdateNodeProps,
}: PageExperienceProps) {
  const effects = page.effects?.items ?? [];
  const effectIntensity = page.effects?.intensity ?? 1;

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
      {effects.length > 0 && <EffectsLayer effects={effects} globalIntensity={effectIntensity} mode={mode} />}
      <div className="relative" style={{ zIndex: 10 }}>
        {page.children.map((node) => (
          <PageNodeView
            key={node.id}
            node={node}
            interactions={interactions}
            selectedNodeId={selectedNodeId}
            device={device}
            mode={mode}
            onSelectNode={onSelectNode}
            onUpdateNodeProps={onUpdateNodeProps}
            hasWebglBackground={hasWebglBackground}
            presetBgRgb={presetBgRgb}
          />
        ))}
      </div>
    </main>
  );
}
