import { createId } from '@/store/types';
import type { ComponentDefinition, PageDocument, PageNode, PageNodeType, PageStyle, ProjectSettings, ResponsiveStyles } from './types';

const baseNodeStyle: PageStyle = {
  position: 'relative',
  color: '#f5f5f4',
};

export const createResponsiveStyles = (base: PageStyle, mobile?: PageStyle, tablet?: PageStyle): ResponsiveStyles => ({
  base: { ...baseNodeStyle, ...base },
  tablet: tablet ? { ...tablet } : undefined,
  mobile: mobile ? { ...mobile } : undefined,
});

const defaultNodeData: Record<PageNodeType, Omit<PageNode, 'id'>> = {
  navbar: {
    type: 'navbar',
    name: 'Navbar',
    props: { brand: '3D Web', links: ['Produto', 'Experiencia', 'Contato'] },
    styles: createResponsiveStyles({
      width: '100%',
      minHeight: 72,
      padding: '18px clamp(20px, 4vw, 56px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(10, 12, 14, 0.78)',
      zIndex: 10,
    }),
    children: [],
  },
  section: {
    type: 'section',
    name: 'Section',
    props: {},
    styles: createResponsiveStyles({
      width: '100%',
      minHeight: 520,
      padding: 'clamp(56px, 8vw, 120px) clamp(20px, 5vw, 72px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 28,
      background: '#111315',
    }, {
      padding: '48px 20px',
      minHeight: 420,
    }),
    children: [],
  },
  container: {
    type: 'container',
    name: 'Container',
    props: {},
    styles: createResponsiveStyles({
      width: '100%',
      maxWidth: 1160,
      margin: '0 auto',
      display: 'flex',
      gap: 32,
      alignItems: 'center',
    }, {
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 24,
    }),
    children: [],
  },
  text: {
    type: 'text',
    name: 'Text Block',
    props: {
      text: 'Experiencias 3D interativas para sites modernos',
      as: 'h1',
    },
    styles: createResponsiveStyles({
      maxWidth: 620,
      fontSize: 'clamp(40px, 6vw, 56px)',
      fontWeight: 700,
      lineHeight: 1.02,
      color: '#f9fafb',
    }, {
      fontSize: 36,
    }),
  },
  button: {
    type: 'button',
    name: 'CTA Button',
    props: { label: 'Explorar', href: '#features' },
    styles: createResponsiveStyles({
      width: 'fit-content',
      padding: '12px 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      background: '#34d399',
      color: '#06231b',
      fontWeight: 700,
      boxShadow: '0 16px 42px rgba(52, 211, 153, 0.24)',
    }),
  },
  image: {
    type: 'image',
    name: 'Image',
    props: { src: '', alt: 'Imagem' },
    styles: createResponsiveStyles({
      width: '100%',
      minHeight: 260,
      borderRadius: 8,
      objectFit: 'cover',
      background: '#202427',
      overflow: 'hidden',
    }),
  },
  video: {
    type: 'video',
    name: 'Video',
    props: { src: '', poster: '', controls: true, autoplay: false },
    styles: createResponsiveStyles({
      width: '100%',
      minHeight: 280,
      borderRadius: 8,
      objectFit: 'cover',
      background: '#202427',
      overflow: 'hidden',
    }),
  },
  card: {
    type: 'card',
    name: 'Feature Card',
    props: { title: 'Card 3D', body: 'Conteudo conectado a objetos da cena.' },
    styles: createResponsiveStyles({
      padding: 22,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      borderRadius: 8,
      background: '#181b1d',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 18px 48px rgba(0,0,0,0.22)',
    }),
  },
  footer: {
    type: 'footer',
    name: 'Footer',
    props: { text: '© 2026 3D Web Experience' },
    styles: createResponsiveStyles({
      width: '100%',
      padding: '28px clamp(20px, 5vw, 72px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: '#0c0e10',
      color: '#a3a3a3',
    }, {
      flexDirection: 'column',
      gap: 12,
      alignItems: 'flex-start',
    }),
  },
  sceneCanvas: {
    type: 'sceneCanvas',
    name: '3D Scene Canvas',
    props: {
      linkedSceneId: 'current-scene',
      placement: 'inline',
      interactive: true,
      transparent: true,
    },
    styles: createResponsiveStyles({
      width: '100%',
      height: 460,
      minHeight: 360,
      borderRadius: 8,
      overflow: 'hidden',
      background: 'radial-gradient(circle at 50% 35%, rgba(52, 211, 153, 0.12), rgba(12, 14, 16, 0.2) 45%, rgba(12, 14, 16, 0.72))',
    }, {
      height: 340,
      minHeight: 300,
    }),
  },
  form: {
    type: 'form',
    name: 'Form',
    props: { name: 'contact-form', action: '#', method: 'POST' },
    styles: createResponsiveStyles({
      width: '100%',
      maxWidth: 540,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      borderRadius: 8,
      background: '#181b1d',
      border: '1px solid rgba(255,255,255,0.08)',
    }),
    children: [],
  },
  input: {
    type: 'input',
    name: 'Input',
    props: { name: 'field', label: 'Campo', placeholder: 'Digite aqui...', type: 'text', required: false },
    styles: createResponsiveStyles({
      width: '100%',
      padding: '10px 14px',
      borderRadius: 6,
      border: '1px solid rgba(255,255,255,0.12)',
      background: '#0d0f10',
      color: '#f5f5f4',
      fontSize: 14,
    }),
  },
  select: {
    type: 'select',
    name: 'Select',
    props: { name: 'option', label: 'Opcao', options: ['Opcao 1', 'Opcao 2', 'Opcao 3'], placeholder: 'Selecione...' },
    styles: createResponsiveStyles({
      width: '100%',
      padding: '10px 14px',
      borderRadius: 6,
      border: '1px solid rgba(255,255,255,0.12)',
      background: '#0d0f10',
      color: '#f5f5f4',
      fontSize: 14,
    }),
  },
  textarea: {
    type: 'textarea',
    name: 'Textarea',
    props: { name: 'message', label: 'Mensagem', placeholder: 'Digite sua mensagem...', rows: 4 },
    styles: createResponsiveStyles({
      width: '100%',
      minHeight: 100,
      padding: '10px 14px',
      borderRadius: 6,
      border: '1px solid rgba(255,255,255,0.12)',
      background: '#0d0f10',
      color: '#f5f5f4',
      fontSize: 14,
    }),
  },
  label: {
    type: 'label',
    name: 'Label',
    props: { text: 'Nome', htmlFor: 'field-name' },
    styles: createResponsiveStyles({
      fontSize: 13,
      fontWeight: 600,
      color: '#e4e4e7',
      marginBottom: 4,
    }),
  },
  modal: {
    type: 'modal',
    name: 'Modal',
    props: { title: 'Modal', closable: true, open: true },
    styles: createResponsiveStyles({
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(4px)',
    }),
    children: [{
      id: 'modal-content-default',
      type: 'container',
      name: 'Modal Content',
      props: {},
      styles: createResponsiveStyles({
        maxWidth: 480,
        width: '100%',
        padding: 28,
        borderRadius: 12,
        background: '#1c1f22',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }),
      children: [
        {
          id: 'modal-title-default', type: 'text', name: 'Modal Title',
          props: { text: 'Modal Title', as: 'h2' },
          styles: createResponsiveStyles({ fontSize: 20, fontWeight: 700, color: '#f9fafb' }),
        },
        {
          id: 'modal-body-default', type: 'text', name: 'Modal Body',
          props: { text: 'Modal content goes here. You can add any elements inside.', as: 'p' },
          styles: createResponsiveStyles({ fontSize: 14, lineHeight: 1.6, color: '#a1a1aa' }),
        },
        {
          id: 'modal-close-default', type: 'button', name: 'Close Button',
          props: { label: 'Fechar', href: '#' },
          styles: createResponsiveStyles({
            alignSelf: 'flex-end',
            padding: '8px 18px',
            borderRadius: 6,
            background: '#272a2d',
            color: '#e4e4e7',
            fontWeight: 600,
          }),
        },
      ],
    }],
  },
  menu: {
    type: 'menu',
    name: 'Menu',
    props: { orientation: 'vertical' },
    styles: createResponsiveStyles({
      width: 220,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      padding: 8,
      borderRadius: 8,
      background: '#181b1d',
      border: '1px solid rgba(255,255,255,0.08)',
    }),
    children: [],
  },
  menuitem: {
    type: 'menuitem',
    name: 'Menu Item',
    props: { label: 'Item', href: '#', icon: '' },
    styles: createResponsiveStyles({
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 12px',
      borderRadius: 6,
      color: '#d4d4d8',
      fontSize: 13,
      cursor: 'pointer',
      textDecoration: 'none',
    }),
  },
  dataTable: {
    type: 'dataTable',
    name: 'Data Table',
    props: { collectionId: 'leads', queryId: '', columns: [], limit: 8 },
    styles: createResponsiveStyles({
      width: '100%',
      overflow: 'auto',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.08)',
      background: '#151719',
      color: '#f5f5f4',
    }),
  },
  dataForm: {
    type: 'dataForm',
    name: 'Data Form',
    props: {
      collectionId: 'leads',
      submitLabel: 'Salvar',
      successMessage: 'Registro salvo',
    },
    styles: createResponsiveStyles({
      width: '100%',
      maxWidth: 560,
      padding: 22,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.08)',
      background: '#181b1d',
    }),
  },
  dataList: {
    type: 'dataList',
    name: 'Data List',
    props: {
      collectionId: 'leads',
      queryId: '',
      titleField: 'name',
      bodyField: 'message',
      limit: 6,
    },
    styles: createResponsiveStyles({
      width: '100%',
      display: 'grid',
      gap: 12,
    }),
  },
  dataChart: {
    type: 'dataChart',
    name: 'Data Chart',
    props: {
      collectionId: 'leads',
      labelField: 'name',
      valueField: 'id',
      chartType: 'bar',
      limit: 5,
    },
    styles: createResponsiveStyles({
      width: '100%',
      minHeight: 260,
      padding: 18,
      display: 'flex',
      alignItems: 'end',
      gap: 10,
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.08)',
      background: '#151719',
    }),
  },
  dataStat: {
    type: 'dataStat',
    name: 'Data Stat',
    props: {
      collectionId: 'leads',
      label: 'Total',
      aggregate: 'count',
      field: '',
    },
    styles: createResponsiveStyles({
      width: 'fit-content',
      minWidth: 180,
      padding: 18,
      display: 'grid',
      gap: 6,
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.08)',
      background: '#181b1d',
    }),
  },
  pageRoute: {
    type: 'pageRoute',
    name: 'Page Route',
    props: { path: '/pagina', title: 'Pagina', protected: false },
    styles: createResponsiveStyles({
      width: '100%',
      minHeight: 420,
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      padding: 'clamp(48px, 7vw, 96px) clamp(20px, 5vw, 72px)',
      background: '#101214',
    }),
    children: [],
  },
};

export const createPageNode = (type: PageNodeType, overrides?: Partial<PageNode>): PageNode => {
  const base = defaultNodeData[type];
  return {
    ...base,
    ...overrides,
    id: overrides?.id ?? createId(),
    props: { ...base.props, ...(overrides?.props ?? {}) },
    styles: {
      base: { ...base.styles.base, ...(overrides?.styles?.base ?? {}) },
      tablet: { ...(base.styles.tablet ?? {}), ...(overrides?.styles?.tablet ?? {}) },
      mobile: { ...(base.styles.mobile ?? {}), ...(overrides?.styles?.mobile ?? {}) },
    },
    responsive: {
      base: { visible: true },
      tablet: { visible: true },
      mobile: { visible: true },
      ...(overrides?.responsive ?? {}),
    },
    children: overrides?.children ?? base.children?.map((child) => ({ ...child })),
  };
};

export const createEmptyPageDocument = (overrides: Partial<PageDocument> = {}): PageDocument => ({
  id: overrides.id ?? createId(),
  type: 'page',
  name: overrides.name ?? 'Page',
  path: overrides.path ?? '/',
  title: overrides.title ?? overrides.name ?? 'Page',
  description: overrides.description ?? '',
  protected: overrides.protected ?? false,
  children: overrides.children ?? [],
  responsive: overrides.responsive ?? [
    { name: 'desktop', width: 1280 },
    { name: 'tablet', width: 820 },
    { name: 'mobile', width: 390 },
  ],
  effects: overrides.effects,
});

export const createDefaultPageDocument = (overrides: Partial<PageDocument> = {}): PageDocument => {
  const navbar = createPageNode('navbar');
  const title = createPageNode('text', {
    name: 'Hero Title',
    props: { text: 'Crie sites 3D que respondem ao usuario', as: 'h1' },
  });
  const subtitle = createPageNode('text', {
    name: 'Hero Subtitle',
    props: {
      text: 'Monte a cena, posicione ela na página e conecte HTML com WebGL usando interações visuais.',
      as: 'p',
    },
    styles: createResponsiveStyles({
      maxWidth: 560,
      fontSize: 18,
      lineHeight: 1.65,
      color: '#cbd5e1',
    }, {
      fontSize: 17,
      lineHeight: 1.55,
    }),
  });
  const button = createPageNode('button');
  const copyGroup = createPageNode('container', {
    name: 'Text Group',
    styles: createResponsiveStyles({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 18,
      maxWidth: 620,
    }),
    children: [title, subtitle, button],
  });
  const sceneCanvas = createPageNode('sceneCanvas');
  const heroContainer = createPageNode('container', {
    name: 'Hero Layout',
    styles: createResponsiveStyles({
      width: '100%',
      maxWidth: 1220,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
      alignItems: 'center',
      gap: 32,
    }, {
      display: 'flex',
      flexDirection: 'column',
      gap: 30,
    }),
    children: [copyGroup, sceneCanvas],
  });
  const hero = createPageNode('section', {
    name: 'Hero Section',
    styles: createResponsiveStyles({
      width: '100%',
      minHeight: 680,
      padding: 'clamp(56px, 8vw, 104px) clamp(20px, 5vw, 72px)',
      display: 'flex',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #101214 0%, #17201d 48%, #101419 100%)',
    }, {
      minHeight: 640,
      padding: '48px 20px',
    }),
    children: [heroContainer],
  });

  const featureCards = ['Performance', 'Interacao', 'Exportacao'].map((title) =>
    createPageNode('card', {
      name: `${title} Card`,
      props: { title, body: 'Conecte conteudo web e objetos 3D com uma estrutura pronta para exportar.' },
    }),
  );
  const features = createPageNode('section', {
    name: 'Features Section',
    styles: createResponsiveStyles({
      padding: '72px clamp(20px, 5vw, 72px)',
      background: '#111315',
    }),
    children: [
      createPageNode('container', {
        name: 'Features Grid',
        styles: createResponsiveStyles({
          maxWidth: 1120,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 18,
        }, {
          gridTemplateColumns: '1fr',
        }),
        children: featureCards,
      }),
    ],
  });

  return {
    id: overrides.id ?? createId(),
    type: 'page',
    name: overrides.name ?? 'Page',
    path: overrides.path ?? '/',
    title: overrides.title ?? overrides.name ?? 'Page',
    description: overrides.description ?? 'Experiencia web 3D interativa',
    protected: overrides.protected ?? false,
    children: overrides.children ?? [navbar, hero, features, createPageNode('footer')],
    responsive: overrides.responsive ?? [
      { name: 'desktop', width: 1280 },
      { name: 'tablet', width: 820 },
      { name: 'mobile', width: 390 },
    ],
    effects: overrides.effects,
  };
};

export const createDefaultProjectSettings = (): ProjectSettings => ({
  id: createId(),
  name: '3D Web Experience',
  exportTarget: 'next',
  tailwind: true,
  performanceBudget: {
    maxModelMb: 8,
    maxTextureSize: 2048,
    targetFps: 55,
  },
});

export const createComponentDefinition = (name: string, nodes: PageNode[], description?: string): ComponentDefinition => ({
  id: createId(),
  name,
  description,
  nodes: nodes.map((n) => duplicatePageNodeForComponent(n)),
  createdAt: new Date().toISOString(),
});

const duplicatePageNodeForComponent = (node: PageNode, makeId = createId): PageNode => ({
  ...node,
  id: makeId(),
  props: { ...node.props },
  styles: Object.fromEntries(
    Object.entries(node.styles).map(([key, value]) => [key, value ? { ...value } : undefined]),
  ) as PageNode['styles'],
  pseudo: node.pseudo
    ? Object.fromEntries(
        Object.entries(node.pseudo).map(([pseudoClass, bpStyles]) => [
          pseudoClass,
          bpStyles
            ? Object.fromEntries(
                Object.entries(bpStyles).map(([bp, style]) => [bp, style ? { ...style } : undefined]),
              )
            : undefined,
        ]),
      )
    : undefined,
  children: node.children?.map((child) => duplicatePageNodeForComponent(child, makeId)),
});
