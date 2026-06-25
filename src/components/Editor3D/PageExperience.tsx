'use client';

import { createElement, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import ExperienceSceneCanvas from './ExperienceSceneCanvas';
import type { InteractionDocument } from '@/lib/interaction-engine/types';
import type { PageDocument, PageNode, PreviewDevice } from '@/lib/page-builder/types';

type PageExperienceProps = {
  page: PageDocument;
  interactions: InteractionDocument[];
  selectedNodeId?: string | null;
  device?: PreviewDevice;
  mode?: 'edit' | 'preview';
  onSelectNode?: (id: string) => void;
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

function PageNodeView({
  node,
  interactions,
  selectedNodeId,
  device,
  mode,
  onSelectNode,
}: {
  node: PageNode;
  interactions: InteractionDocument[];
  selectedNodeId: string | null;
  device: PreviewDevice;
  mode: 'edit' | 'preview';
  onSelectNode?: (id: string) => void;
}) {
  const style = toCssProperties(node, device);
  const nodeInteractions = interactions.filter((interaction) => interaction.sourceId === node.id);
  const selected = selectedNodeId === node.id && mode === 'edit';

  const handleSelect = (event: MouseEvent<HTMLElement>) => {
    if (mode !== 'edit') return;
    event.preventDefault();
    event.stopPropagation();
    onSelectNode?.(node.id);
  };

  const handlers = {
    onClick: (event: MouseEvent<HTMLElement>) => {
      handleSelect(event);
      const clickInteractions = nodeInteractions.filter((interaction) => interaction.trigger === 'click');
      triggerInteractions(clickInteractions, true);
      window.setTimeout(() => triggerInteractions(clickInteractions, false), 360);
    },
    onDoubleClick: () => {
      const list = nodeInteractions.filter((interaction) => interaction.trigger === 'doubleClick');
      triggerInteractions(list, true);
      window.setTimeout(() => triggerInteractions(list, false), 360);
    },
    onMouseEnter: () => triggerInteractions(nodeInteractions.filter((interaction) => interaction.trigger === 'hover' || interaction.trigger === 'sectionEnter'), true),
    onMouseLeave: () => triggerInteractions(nodeInteractions.filter((interaction) => interaction.trigger === 'hover' || interaction.trigger === 'sectionLeave'), false),
    onFocus: () => triggerInteractions(nodeInteractions.filter((interaction) => interaction.trigger === 'focus'), true),
    onBlur: () => triggerInteractions(nodeInteractions.filter((interaction) => interaction.trigger === 'blur'), false),
  };

  const className = selected
    ? 'outline outline-2 outline-emerald-300 outline-offset-2'
    : mode === 'edit'
      ? 'outline outline-1 outline-transparent hover:outline-emerald-400/40'
      : undefined;

  const sharedProps = {
    'data-experience-node': node.id,
    style,
    className,
    tabIndex: nodeInteractions.some((interaction) => interaction.trigger === 'focus' || interaction.trigger === 'blur') ? 0 : undefined,
    ...handlers,
  };

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
    return createElement(tag, sharedProps, String(node.props.text ?? ''));
  }

  if (node.type === 'button') {
    return (
      <a {...sharedProps} href={mode === 'preview' ? String(node.props.href ?? '#') : '#'} role="button">
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
      <strong key="brand" className="text-sm font-semibold text-neutral-50">{String(node.props.brand ?? '3D Web')}</strong>,
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
        <h3 className="text-sm font-semibold text-neutral-50">{String(node.props.title ?? 'Card')}</h3>
        <p className="text-sm leading-6 text-neutral-400">{String(node.props.body ?? '')}</p>
      </div>,
    );
  }

  if (node.type === 'footer') {
    children.push(<span key="footer-text" className="text-xs text-neutral-500">{String(node.props.text ?? '')}</span>);
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
}: PageExperienceProps) {
  return (
    <main className="min-h-full w-full bg-[#101214] text-neutral-100">
      {page.children.map((node) => (
        <PageNodeView
          key={node.id}
          node={node}
          interactions={interactions}
          selectedNodeId={selectedNodeId}
          device={device}
          mode={mode}
          onSelectNode={onSelectNode}
        />
      ))}
    </main>
  );
}
