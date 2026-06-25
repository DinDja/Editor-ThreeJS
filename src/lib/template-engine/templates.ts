import { createDefaultInteraction } from '@/lib/interaction-engine/defaults';
import type { InteractionDocument } from '@/lib/interaction-engine/types';
import { createDefaultPageDocument, createPageNode, createResponsiveStyles } from '@/lib/page-builder/defaults';
import type { ExportTarget, PageDocument, PageNode } from '@/lib/page-builder/types';

export type ExperienceTemplateId =
  | 'hero-split-3d'
  | 'hero-webgl-background'
  | 'product-landing-3d'
  | 'portfolio-3d'
  | 'tech-institutional'
  | 'interactive-education'
  | 'glb-showcase'
  | 'interactive-card-3d'
  | 'particle-background'
  | 'indie-game-page';

export type ExperienceTemplate = {
  id: ExperienceTemplateId;
  name: string;
  exportTarget: ExportTarget;
  createPage: () => PageDocument;
  createInteractions: (page: PageDocument, sceneTargetId?: string) => InteractionDocument[];
};

const firstNodeByType = (nodes: PageNode[], type: PageNode['type']): PageNode | null => {
  for (const node of nodes) {
    if (node.type === type) return node;
    const child = firstNodeByType(node.children ?? [], type);
    if (child) return child;
  }
  return null;
};

const firstCard = (page: PageDocument) => firstNodeByType(page.children, 'card');
const firstSceneCanvas = (page: PageDocument) => firstNodeByType(page.children, 'sceneCanvas');

const createBasePage = (name: string): PageDocument => ({
  ...createDefaultPageDocument(),
  name,
});

const createHeroBackgroundPage = (): PageDocument => {
  const page = createBasePage('Hero 3D Background');
  const hero = page.children.find((node) => node.name === 'Hero Section');
  const sceneCanvas = firstSceneCanvas(page);
  if (hero && sceneCanvas) {
    hero.children = [
      createPageNode('sceneCanvas', {
        ...sceneCanvas,
        name: 'Background WebGL',
        props: { ...sceneCanvas.props, placement: 'background', transparent: true },
        styles: createResponsiveStyles({
          position: 'absolute',
          width: '100%',
          height: '100%',
          minHeight: '100%',
          top: 0,
          left: 0,
          zIndex: 0,
          borderRadius: 0,
          overflow: 'hidden',
          background: '#0d1113',
        }),
      }),
      createPageNode('container', {
        name: 'Hero Copy Overlay',
        styles: createResponsiveStyles({
          zIndex: 1,
          maxWidth: 820,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          alignItems: 'flex-start',
        }),
        children: [
          createPageNode('text', {
            name: 'Background Hero Title',
            props: { text: 'Um fundo WebGL para uma primeira dobra memoravel', as: 'h1' },
          }),
          createPageNode('button', { props: { label: 'Ver experiencia', href: '#features' } }),
        ],
      }),
    ];
    hero.styles.base.overflow = 'hidden';
  }
  return page;
};

const createShowcasePage = (): PageDocument => {
  const page = createBasePage('Showcase GLB');
  const hero = page.children.find((node) => node.name === 'Hero Section');
  if (hero) {
    hero.children = [
      createPageNode('container', {
        name: 'Showcase Layout',
        styles: createResponsiveStyles({
          maxWidth: 1180,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          alignItems: 'center',
        }),
        children: [
          createPageNode('text', {
            name: 'Showcase Title',
            props: { text: 'Showcase de modelo GLB', as: 'h1' },
            styles: createResponsiveStyles({
              textAlign: 'center',
              maxWidth: 780,
              fontSize: 54,
              fontWeight: 700,
              lineHeight: 1.05,
            }, { fontSize: 36 }),
          }),
          createPageNode('sceneCanvas', {
            name: 'Model Viewer',
            props: { placement: 'center', interactive: true, linkedSceneId: 'current-scene' },
            styles: createResponsiveStyles({
              width: '100%',
              height: 560,
              borderRadius: 8,
              background: '#0f1214',
              overflow: 'hidden',
            }, { height: 360 }),
          }),
        ],
      }),
    ];
  }
  return page;
};

const createCardPage = (): PageDocument => {
  const page = createBasePage('Card 3D Interativo');
  page.children = [
    createPageNode('section', {
      name: 'Interactive Card Section',
      styles: createResponsiveStyles({
        minHeight: 720,
        padding: '72px clamp(20px, 6vw, 88px)',
        display: 'grid',
        placeItems: 'center',
        background: '#111315',
      }),
      children: [
        createPageNode('card', {
          name: 'Interactive 3D Card',
          props: { title: 'Card 3D interativo', body: 'Passe o mouse para reagir com a cena vinculada.' },
          styles: createResponsiveStyles({
            width: 'min(100%, 720px)',
            padding: 24,
            display: 'grid',
            gap: 18,
            borderRadius: 8,
            background: '#181b1d',
            border: '1px solid rgba(255,255,255,0.1)',
          }),
          children: [createPageNode('sceneCanvas', { styles: createResponsiveStyles({ height: 360 }) })],
        }),
      ],
    }),
  ];
  return page;
};

export const EXPERIENCE_TEMPLATES: ExperienceTemplate[] = [
  {
    id: 'hero-split-3d',
    name: 'Hero 3D texto/modelo',
    exportTarget: 'next',
    createPage: () => createBasePage('Hero 3D Split'),
    createInteractions: (page, sceneTargetId = 'current-scene') => {
      const scene = firstSceneCanvas(page);
      return scene ? [createDefaultInteraction(scene.id, sceneTargetId, 'mouseMove', 'rotateObject3D')] : [];
    },
  },
  {
    id: 'hero-webgl-background',
    name: 'Hero background WebGL',
    exportTarget: 'vite',
    createPage: createHeroBackgroundPage,
    createInteractions: (page, sceneTargetId = 'current-scene') => {
      const scene = firstSceneCanvas(page);
      return scene ? [createDefaultInteraction(scene.id, sceneTargetId, 'scroll', 'moveCamera')] : [];
    },
  },
  {
    id: 'product-landing-3d',
    name: 'Landing produto 3D',
    exportTarget: 'next',
    createPage: () => createBasePage('Landing Produto 3D'),
    createInteractions: (page, sceneTargetId = 'current-scene') => {
      const card = firstCard(page);
      return card ? [createDefaultInteraction(card.id, sceneTargetId, 'hover', 'changeColor')] : [];
    },
  },
  {
    id: 'portfolio-3d',
    name: 'Portfolio 3D',
    exportTarget: 'react',
    createPage: () => createBasePage('Portfolio 3D'),
    createInteractions: (page, sceneTargetId = 'current-scene') => {
      const scene = firstSceneCanvas(page);
      return scene ? [createDefaultInteraction(scene.id, sceneTargetId, 'sectionEnter', 'startAnimation')] : [];
    },
  },
  {
    id: 'tech-institutional',
    name: 'Institucional tech',
    exportTarget: 'next',
    createPage: () => createBasePage('Institucional Tecnologica'),
    createInteractions: (page, sceneTargetId = 'current-scene') => {
      const scene = firstSceneCanvas(page);
      return scene ? [createDefaultInteraction(scene.id, sceneTargetId, 'scroll', 'moveCamera')] : [];
    },
  },
  {
    id: 'interactive-education',
    name: 'Educacional interativa',
    exportTarget: 'vite',
    createPage: () => createBasePage('Educacional Interativa'),
    createInteractions: (page, sceneTargetId = 'current-scene') => {
      const card = firstCard(page);
      return card ? [createDefaultInteraction(card.id, sceneTargetId, 'click', 'changeMaterial')] : [];
    },
  },
  {
    id: 'glb-showcase',
    name: 'Showcase GLB',
    exportTarget: 'react',
    createPage: createShowcasePage,
    createInteractions: (page, sceneTargetId = 'current-scene') => {
      const scene = firstSceneCanvas(page);
      return scene ? [createDefaultInteraction(scene.id, sceneTargetId, 'mouseMove', 'rotateObject3D')] : [];
    },
  },
  {
    id: 'interactive-card-3d',
    name: 'Card 3D interativo',
    exportTarget: 'html',
    createPage: createCardPage,
    createInteractions: (page, sceneTargetId = 'current-scene') => {
      const card = firstCard(page);
      return card ? [createDefaultInteraction(card.id, sceneTargetId, 'hover', 'scaleObject3D')] : [];
    },
  },
  {
    id: 'particle-background',
    name: 'Background particulas',
    exportTarget: 'vite',
    createPage: createHeroBackgroundPage,
    createInteractions: (page, sceneTargetId = 'current-scene') => {
      const scene = firstSceneCanvas(page);
      return scene ? [createDefaultInteraction(scene.id, sceneTargetId, 'mouseMove', 'rotateObject3D')] : [];
    },
  },
  {
    id: 'indie-game-page',
    name: 'Pagina jogo indie',
    exportTarget: 'html',
    createPage: () => createBasePage('Pagina Jogo Indie'),
    createInteractions: (page, sceneTargetId = 'current-scene') => {
      const button = firstNodeByType(page.children, 'button');
      return button ? [createDefaultInteraction(button.id, sceneTargetId, 'click', 'startAnimation')] : [];
    },
  },
];

export const instantiateTemplate = (templateId: ExperienceTemplateId, sceneTargetId?: string) => {
  const template = EXPERIENCE_TEMPLATES.find((item) => item.id === templateId) ?? EXPERIENCE_TEMPLATES[0];
  const page = template.createPage();
  return {
    page,
    interactions: template.createInteractions(page, sceneTargetId),
    exportTarget: template.exportTarget,
  };
};
