import { createDefaultInteraction } from '@/lib/interaction-engine/defaults';
import type { InteractionDocument } from '@/lib/interaction-engine/types';
import { createDefaultPageDocument } from '@/lib/page-builder/defaults';
import type { ExportTarget, PageDocument, PageNode } from '@/lib/page-builder/types';
import { createDefaultEffect } from '@/lib/effects-system/registry';
import type { EffectPerformanceTier, PageEffect } from '@/lib/effects-system/types';
import { getVisualPreset, intensityToScale, type VisualPresetId } from './presets';
import {
  buildCTA,
  buildDefaultProjectPage,
  buildFeaturesGrid,
  buildFooter,
  buildHero,
  buildNavbar,
  buildShowcase,
  buildStatsRow,
} from './sections';

export type TemplateCategory =
  | 'landing'
  | 'institutional'
  | 'portfolio'
  | 'saas'
  | 'product'
  | 'event'
  | 'education'
  | 'immersive'
  | 'editorial'
  | 'startup'
  | 'game';

export type ExperienceTemplateId =
  | 'futuristic-landing'
  | 'premium-institutional'
  | 'creative-portfolio'
  | 'saas-hero-mesh'
  | 'product-3d-scene'
  | 'event-lights'
  | 'interactive-education'
  | 'immersive-webgl'
  | 'liquid-surface-background'
  | 'editorial-smooth'
  | 'tech-startup-landing'
  | 'glb-showcase'
  | 'particle-showcase'
  | 'indie-game-page';

export type ExperienceTemplate = {
  id: ExperienceTemplateId;
  name: string;
  description: string;
  category: TemplateCategory;
  exportTarget: ExportTarget;
  presetId: VisualPresetId;
  /** Estimated GPU/perf cost shown in the gallery. */
  performance: EffectPerformanceTier;
  /** Accent used for the gallery card swatch. */
  accent: string;
  createPage: () => PageDocument;
  createEffects: () => PageEffect[];
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

const firstSceneCanvas = (page: PageDocument) => firstNodeByType(page.children, 'sceneCanvas');
const firstCard = (page: PageDocument) => firstNodeByType(page.children, 'card');
const firstButton = (page: PageDocument) => firstNodeByType(page.children, 'button');

const basePage = (name: string): PageDocument => ({
  ...createDefaultPageDocument(),
  name,
});

/** Builds a fully themed page from a preset using the reusable section builders. */
const themedPage = (
  presetId: VisualPresetId,
  name: string,
  build: (preset: ReturnType<typeof getVisualPreset>) => PageNode[],
): PageDocument => {
  const preset = getVisualPreset(presetId);
  const doc = basePage(name);
  doc.children = build(preset);
  return doc;
};

/** Converts a preset's suggested effects into PageEffect instances. */
const effectsFromPreset = (presetId: VisualPresetId): PageEffect[] => {
  const preset = getVisualPreset(presetId);
  return preset.suggestedEffects.map((suggested, index) =>
    createDefaultEffect(suggested.type as PageEffect['type'], 'page', {
      zIndex: index,
    }),
  );
};

const effect = (type: PageEffect['type'], zIndex: number, props?: Record<string, unknown>): PageEffect =>
  createDefaultEffect(type, 'page', { zIndex, ...(props ? { props: { ...createDefaultEffect(type).props, ...props } } : {}) });

/* --------------------------------- Templates --------------------------------- */

const futuristicLanding = (): ExperienceTemplate => ({
  id: 'futuristic-landing',
  name: 'Landing Futurista',
  description: 'Partículas reais, glow neon e grid 3D em profundidade.',
  category: 'landing',
  exportTarget: 'next',
  presetId: 'cyber-neon',
  performance: 'high',
  accent: '#00f0ff',
  createPage: () =>
    themedPage('cyber-neon', 'Landing Futurista', (p) => [
      buildNavbar(p, 'NOVA', ['Recursos', 'Demo', 'Contato']),
      buildHero(p, {
        variant: 'background',
        title: 'Construa o futuro da web em 3D',
        subtitle: 'Partículas reais, shaders e interação que respondem ao cursor — sem escrever WebGL.',
        cta: 'Ver demonstração',
        ctaHref: '#demo',
      }),
      buildFeaturesGrid(p, [
        { title: 'Partículas reais', body: 'Sistema Three.js com linhas, profundidade e reação ao mouse.' },
        { title: 'Shaders vivos', body: 'Background procedural animado com noise orgânico.' },
        { title: 'Performance', body: 'Degradacao automática no mobile e fallback sem WebGL.' },
      ]),
      buildCTA(p, {
        title: 'Lance sua experiência',
        body: 'Exporte para Next, React, Vite ou HTML standalone.',
        cta: 'Começar grátis',
        ctaHref: '#start',
      }),
      buildFooter(p, '© 2026 NOVA'),
    ]),
  createEffects: () => [
    effect('particleField', 0, { count: 2200, color: '#00f0ff', colorB: '#ff00e5', connectLines: true, mouseReact: true }),
    effect('gridFloor3D', 0, { color: '#00f0ff', speed: 0.7 }),
    effect('customCursor', 46, { cursorStyle: 'neoGlow', cursorColor: '#00f0ff', showTrail: true, trailLength: 8, showLight: true, lightColor: '#00f0ff', lightIntensity: 6 }),
    effect('noiseOverlay', 42, { opacity: 0.06 }),
  ],
  createInteractions: (page, sceneTargetId = 'current-scene') => {
    const scene = firstSceneCanvas(page);
    return scene ? [createDefaultInteraction(scene.id, sceneTargetId, 'mouseMove', 'rotateObject3D')] : [];
  },
});

const premiumInstitutional = (): ExperienceTemplate => ({
  id: 'premium-institutional',
  name: 'Institucional Premium',
  description: 'Background 3D sofisticado com orbs flutuantes e noise sutil.',
  category: 'institutional',
  exportTarget: 'next',
  presetId: 'dark-premium',
  performance: 'medium',
  accent: '#c9a227',
  createPage: () =>
    themedPage('dark-premium', 'Institucional Premium', (p) => [
      buildNavbar(p, 'AURUM', ['Sobre', 'Serviços', 'Contato']),
      buildHero(p, {
        variant: 'split',
        title: 'Excelência que se sente em cada detalhe',
        subtitle: 'Uma identidade institucional premium com profundidade 3D e tipografia editorial.',
        cta: 'Conheça a marca',
        ctaHref: '#sobre',
      }),
      buildStatsRow(p, [
        { value: '24+', label: 'Anos de mercado' },
        { value: '180', label: 'Projetos premiados' },
        { value: '98%', label: 'Clientela fiel' },
      ]),
      buildFeaturesGrid(p, [
        { title: 'Heritage', body: 'Tradição construída com técnica apurada e materiais nobres.' },
        { title: 'Atelier 3D', body: 'Visualização imersiva de cada projeto antes da execução.' },
        { title: 'Exclusivo', body: 'Peças únicas com curadoria editorial e apresentação premium.' },
      ]),
      buildCTA(p, {
        title: 'Agende uma apresentação privada',
        body: 'Conversamos sobre seu próximo projeto com exclusividade.',
        cta: 'Falar com atelier',
        ctaHref: '#contato',
      }),
      buildFooter(p, '© 2026 AURUM'),
    ]),
  createEffects: () => [
    effect('floatingOrbs', 0, { count: 7, color: '#c9a227', colorB: '#e8d58a', opacity: 0.45 }),
    effect('customCursor', 46, { cursorStyle: 'luxury', cursorColor: '#c9a227', showTrail: true, trailLength: 6, showLight: true, lightColor: '#c9a227', lightIntensity: 4 }),
    effect('noiseOverlay', 42, { opacity: 0.05 }),
    effect('scrollReveal', 30, { once: true }),
  ],
  createInteractions: (page, sceneTargetId = 'current-scene') => {
    const scene = firstSceneCanvas(page);
    return scene ? [createDefaultInteraction(scene.id, sceneTargetId, 'scroll', 'moveCamera')] : [];
  },
});

const creativePortfolio = (): ExperienceTemplate => ({
  id: 'creative-portfolio',
  name: 'Portfólio Criativo',
  description: 'Cards animados com glassmorphism e aurora suave.',
  category: 'portfolio',
  exportTarget: 'react',
  presetId: 'soft-glass',
  performance: 'medium',
  accent: '#a78bfa',
  createPage: () =>
    themedPage('soft-glass', 'Portfólio Criativo', (p) => [
      buildNavbar(p, 'Studio Lumen', ['Trabalhos', 'Sobre', 'Contato']),
      buildHero(p, {
        variant: 'centered',
        title: 'Design que respira profundidade',
        subtitle: 'Portfólio criativo com glassmorphism, aurora e cards que reagem ao cursor.',
        cta: 'Ver trabalhos',
        ctaHref: '#trabalhos',
      }),
      buildFeaturesGrid(p, [
        { title: 'Identidade', body: 'Sistemas visuais com movimento e camadas translúcidas.' },
        { title: 'WebGL', body: 'Cenas 3D leves integradas à narrativa da marca.' },
        { title: 'Motion', body: 'Animações suaves guiadas por scroll e interação.' },
      ]),
      buildShowcase(p, { title: 'Trabalho em destaque', subtitle: 'Cena 3D interativa conectada ao portfólio.', height: 480 }),
      buildFooter(p, '© 2026 Studio Lumen'),
    ]),
  createEffects: () => [
    effect('auroraBackground', 0, { color: '#7dd3fc', colorB: '#a78bfa', colorC: '#34d399', opacity: 0.55 }),
    effect('glassCard', 30, { blur: 16, opacity: 0.6 }),
    effect('floatingOrbs', 1, { count: 6, color: '#7dd3fc', colorB: '#a78bfa', opacity: 0.4 }),
    effect('scrollReveal', 30, { once: true }),
    effect('magneticButton', 45, { strength: 0.35 }),
    effect('customCursor', 46, { cursorStyle: 'glass', cursorColor: '#7dd3fc', showTrail: true, trailLength: 5, showLight: false }),
  ],
  createInteractions: (page, sceneTargetId = 'current-scene') => {
    const card = firstCard(page);
    return card ? [createDefaultInteraction(card.id, sceneTargetId, 'hover', 'scaleObject3D')] : [];
  },
});

const saasHeroMesh = (): ExperienceTemplate => ({
  id: 'saas-hero-mesh',
  name: 'SaaS Hero 3D',
  description: 'Malha 3D interativa no hero com grid futurista.',
  category: 'saas',
  exportTarget: 'next',
  presetId: 'tech-startup',
  performance: 'high',
  accent: '#22d3ee',
  createPage: () =>
    themedPage('tech-startup', 'SaaS Hero 3D', (p) => [
      buildNavbar(p, 'Meshly', 'Recursos,Preços,Docs'.split(',')),
      buildHero(p, {
        variant: 'split',
        title: 'Plataforma com alma 3D',
        subtitle: 'Hero com malha interativa que reage ao mouse e grid 3D em perspectiva.',
        cta: 'Iniciar trial',
        ctaHref: '#start',
      }),
      buildStatsRow(p, [
        { value: '60fps', label: 'Render alvo' },
        { value: '12k', label: 'Desenvolvedores' },
        { value: '99.9%', label: 'Uptime' },
      ]),
      buildFeaturesGrid(p, [
        { title: 'API simples', body: 'Conecte dados a cenas 3D com poucas linhas.' },
        { title: 'Edge ready', body: 'Runtime leve que roda em qualquer deploy.' },
        { title: 'Insights', body: 'Métricas reais de FPS, draw calls e assets.' },
      ]),
      buildCTA(p, {
        title: 'Suba seu primeiro MVP hoje',
        body: 'Trial gratuito, sem cartão.',
        cta: 'Criar conta',
        ctaHref: '#signup',
      }),
      buildFooter(p, '© 2026 Meshly'),
    ]),
  createEffects: () => [
    effect('webglHeroScene', 0, { shape: 'torusKnot', color: '#22d3ee', colorB: '#3b82f6', mouseReact: true }),
    effect('gridFloor3D', 0, { color: '#22d3ee', speed: 0.6 }),
    effect('scrollReveal', 30, { once: true }),
    effect('customCursor', 46, { cursorStyle: 'tech', cursorColor: '#22d3ee', showTrail: true, trailLength: 8, showLight: true, lightColor: '#22d3ee', lightIntensity: 5 }),
  ],
  createInteractions: (page, sceneTargetId = 'current-scene') => {
    const scene = firstSceneCanvas(page);
    return scene ? [createDefaultInteraction(scene.id, sceneTargetId, 'mouseMove', 'rotateObject3D')] : [];
  },
});

const product3dScene = (): ExperienceTemplate => ({
  id: 'product-3d-scene',
  name: 'Produto com Cena 3D',
  description: 'Showcase de produto com cena 3D integrada e feixes de luz.',
  category: 'product',
  exportTarget: 'react',
  presetId: 'luxury-product',
  performance: 'high',
  accent: '#d4af37',
  createPage: () =>
    themedPage('luxury-product', 'Produto 3D', (p) => [
      buildNavbar(p, 'MAISON', 'Coleção,História,Contato'.split(',')),
      buildShowcase(p, {
        title: 'A peça em cada ângulo',
        subtitle: 'Gire, aproxime e sinta o acabamento da cena 3D integrada.',
        height: 560,
      }),
      buildFeaturesGrid(p, [
        { title: 'Acabamento', body: 'Metalness e roughness PBR fiéis ao material real.' },
        { title: 'Iluminação', body: 'Feixes de luz e luzes pontuais destacam o produto.' },
        { title: 'Exportação', body: 'Leve a vitrine 3D para qualquer site.' },
      ]),
      buildCTA(p, {
        title: 'Encomende a edição limitada',
        body: 'Produção numerada com certificado de autenticidade.',
        cta: 'Reservar',
        ctaHref: '#reservar',
      }),
      buildFooter(p, '© 2026 MAISON'),
    ]),
  createEffects: () => [
    effect('webglHeroScene', 0, { shape: 'icosahedron', color: '#d4af37', colorB: '#e5e4e2', metalness: 0.9, roughness: 0.15, mouseReact: true }),
    effect('lightBeams', 40, { color: '#d4af37', count: 2, opacity: 0.3 }),
    effect('noiseOverlay', 42, { opacity: 0.04 }),
    effect('customCursor', 46, { cursorStyle: 'luxury', cursorColor: '#d4af37', showTrail: true, trailLength: 6, showLight: true, lightColor: '#d4af37', lightIntensity: 4 }),
  ],
  createInteractions: (page, sceneTargetId = 'current-scene') => {
    const scene = firstSceneCanvas(page);
    return scene ? [createDefaultInteraction(scene.id, sceneTargetId, 'mouseMove', 'rotateObject3D')] : [];
  },
});

const eventLights = (): ExperienceTemplate => ({
  id: 'event-lights',
  name: 'Evento com Luz e Movimento',
  description: 'Partículas, estrelas e feixes de luz para impacto energético.',
  category: 'event',
  exportTarget: 'vite',
  presetId: 'game-landing',
  performance: 'high',
  accent: '#f43f5e',
  createPage: () =>
    themedPage('game-landing', 'Evento Lumen', (p) => [
      buildNavbar(p, 'LUMEN FEST', 'Lineup,Ingressos,Info'.split(',')),
      buildHero(p, {
        variant: 'centered',
        title: 'Uma noite de luz e movimento',
        subtitle: 'Festival imersivo com arte generativa, partículas e shows 3D ao vivo.',
        cta: 'Garantir ingresso',
        ctaHref: '#ingressos',
      }),
      buildStatsRow(p, [
        { value: '32', label: 'Artistas' },
        { value: '4', label: 'Palcos' },
        { value: '18h', label: 'Programação' },
      ]),
      buildFeaturesGrid(p, [
        { title: 'Palco principal', body: 'Cena 3D reativa à música com partículas em tempo real.' },
        { title: 'Imersão', body: 'Estrelas e feixes de luz envolvem o público.' },
        { title: 'Experiência', body: 'Site do evento já é parte do show.' },
      ]),
      buildCTA(p, {
        title: 'O line-up completo está aqui',
        body: 'Confirme presença antes que esgote.',
        cta: 'Ver line-up',
        ctaHref: '#lineup',
      }),
      buildFooter(p, '© 2026 LUMEN FEST'),
    ]),
  createEffects: () => [
    effect('particleField', 0, { count: 2600, color: '#f43f5e', colorB: '#8b5cf6', speed: 0.6, connectLines: true }),
    effect('animatedStars', 0, { count: 1500, color: '#fb7185', twinkle: true }),
    effect('lightBeams', 40, { color: '#f43f5e', count: 4, opacity: 0.4 }),
    effect('customCursor', 46, { cursorStyle: 'game', cursorColor: '#f43f5e', showTrail: true, trailLength: 10, showLight: true, lightColor: '#f43f5e', lightIntensity: 7 }),
  ],
  createInteractions: (page, sceneTargetId = 'current-scene') => {
    const button = firstButton(page);
    return button ? [createDefaultInteraction(button.id, sceneTargetId, 'click', 'startAnimation')] : [];
  },
});

const interactiveEducation = (): ExperienceTemplate => ({
  id: 'interactive-education',
  name: 'Educacional Interativo',
  description: 'Grid 3D e estrelas com clareza e interação didática.',
  category: 'education',
  exportTarget: 'vite',
  presetId: 'education-lab',
  performance: 'medium',
  accent: '#38bdf8',
  createPage: () =>
    themedPage('education-lab', 'Edu Lab', (p) => [
      buildNavbar(p, 'Edu Lab', 'Módulos,Labs,Contato'.split(',')),
      buildHero(p, {
        variant: 'split',
        title: 'Aprenda fazendo, em 3D',
        subtitle: 'Plataforma educacional interativa com visualizações que fixam o conteúdo.',
        cta: 'Explorar módulos',
        ctaHref: '#modulos',
      }),
      buildStatsRow(p, [
        { value: '120+', label: 'Módulos' },
        { value: '40k', label: 'Alunos' },
        { value: '4.9', label: 'Avaliação' },
      ]),
      buildFeaturesGrid(p, [
        { title: 'Labs 3D', body: 'Manipule objetos para entender conceitos na prática.' },
        { title: 'Trilhas', body: 'Caminhos guiados com revelação por scroll.' },
        { title: 'Quizzes', body: 'Interações de click conectadas à cena.' },
      ]),
      buildCTA(p, {
        title: 'Comece sua primeira trilha',
        body: 'Acesso gratuito aos módulos iniciais.',
        cta: 'Entrar agora',
        ctaHref: '#entrar',
      }),
      buildFooter(p, '© 2026 Edu Lab'),
    ]),
  createEffects: () => [
    effect('gridFloor3D', 0, { color: '#38bdf8', speed: 0.5 }),
    effect('animatedStars', 0, { count: 900, color: '#facc15', twinkle: true, opacity: 0.7 }),
    effect('scrollReveal', 30, { once: true }),
  ],
  createInteractions: (page, sceneTargetId = 'current-scene') => {
    const card = firstCard(page);
    return card ? [createDefaultInteraction(card.id, sceneTargetId, 'click', 'changeMaterial')] : [];
  },
});

const immersiveWebgl = (): ExperienceTemplate => ({
  id: 'immersive-webgl',
  name: 'Imersiva WebGL',
  description: 'Página imersiva estilo WebGL com partículas e shader.',
  category: 'immersive',
  exportTarget: 'vite',
  presetId: 'cyber-neon',
  performance: 'high',
  accent: '#7a00ff',
  createPage: () =>
    themedPage('cyber-neon', 'Imersiva WebGL', (p) => [
      buildNavbar(p, 'VOID', 'Enter,About'.split(',')),
      buildHero(p, {
        variant: 'immersive',
        title: 'Entre na experiência',
        subtitle: 'Página imersiva onde o fundo é uma cena viva em WebGL.',
        cta: 'Iniciar jornada',
        ctaHref: '#enter',
      }),
      buildShowcase(p, { title: 'O interior do vazio', subtitle: 'Cena 3D navegável com partículas conectadas.', height: 600 }),
      buildFooter(p, '© 2026 VOID'),
    ]),
  createEffects: () => [
    effect('shaderBackground', 0, { color: '#05060a', colorB: '#00f0ff', colorC: '#7a00ff', scale: 2.6 }),
    effect('particleField', 1, { count: 2400, color: '#00f0ff', colorB: '#ff00e5', shape: 'sphere', depth: 7, connectLines: true }),
    effect('customCursor', 46, { cursorStyle: 'cosmic', cursorColor: '#7a00ff', showTrail: true, trailLength: 12, showLight: true, lightColor: '#7a00ff', lightIntensity: 8 }),
  ],
  createInteractions: (page, sceneTargetId = 'current-scene') => {
    const scene = firstSceneCanvas(page);
    return scene ? [createDefaultInteraction(scene.id, sceneTargetId, 'scroll', 'moveCamera')] : [];
  },
});

const liquidSurfaceBackground = (): ExperienceTemplate => ({
  id: 'liquid-surface-background',
  name: 'Background Superficie Liquida',
  description: 'Hero imersivo com superficie liquida WebGL, ondas e ripples como plano de fundo.',
  category: 'immersive',
  exportTarget: 'next',
  presetId: 'nature-3d',
  performance: 'high',
  accent: '#2dd4bf',
  createPage: () =>
    themedPage('nature-3d', 'Superficie Liquida', (p) => [
      buildNavbar(p, 'AQUA', ['Experiencia', 'Tecnologia', 'Contato']),
      buildHero(p, {
        variant: 'background',
        title: 'Uma superfície viva para sua narrativa',
        subtitle: 'Use ondas, reflexos e ripples WebGL como background interativo para marcas, eventos e produtos sensoriais.',
        cta: 'Explorar fluxo',
        ctaHref: '#fluxo',
      }),
      buildFeaturesGrid(p, [
        { title: 'Ondas reais', body: 'Simulação de ripples em render target com normal map dinâmico.' },
        { title: 'Visual premium', body: 'Material PBR com metalness, roughness e reflexo suave.' },
        { title: 'Pronto para site', body: 'Template editável no Page Builder com efeitos e conteúdo web.' },
      ]),
      buildCTA(p, {
        title: 'Transforme água em interface',
        body: 'Aplique o template e edite textos, cores, layout e intensidade do efeito.',
        cta: 'Começar agora',
        ctaHref: '#start',
      }),
      buildFooter(p, '© 2026 AQUA'),
    ]),
  createEffects: () => [
    effect('liquidSurface', 0, {
      color: '#2dd4bf',
      metalness: 0.72,
      roughness: 0.18,
      displacementScale: 2.8,
      rainEnabled: true,
      sizeX: 15,
      sizeY: 9,
      opacity: 0.96,
    }),
    effect('customCursor', 46, { cursorStyle: 'nature', cursorColor: '#2dd4bf', showTrail: true, trailLength: 7, showLight: true, lightColor: '#2dd4bf', lightIntensity: 5 }),
    effect('noiseOverlay', 42, { opacity: 0.045 }),
    effect('scrollReveal', 30, { once: true }),
  ],
  createInteractions: (page, sceneTargetId = 'current-scene') => {
    const button = firstButton(page);
    return button ? [createDefaultInteraction(button.id, sceneTargetId, 'hover', 'moveCamera')] : [];
  },
});

const editorialSmooth = (): ExperienceTemplate => ({
  id: 'editorial-smooth',
  name: 'Editorial Suave',
  description: 'Editorial limpo com animações suaves e paralaxe.',
  category: 'editorial',
  exportTarget: 'next',
  presetId: 'editorial-clean',
  performance: 'low',
  accent: '#c2410c',
  createPage: () =>
    themedPage('editorial-clean', 'Editorial Suave', (p) => [
      buildNavbar(p, 'The Review', 'Essays,Archive,About'.split(',')),
      buildHero(p, {
        variant: 'centered',
        title: 'Escrita que se revela com calma',
        subtitle: 'Um editorial limpo com revelação por scroll e paralaxe discreto.',
        cta: 'Ler ensaios',
        ctaHref: '#essays',
      }),
      buildFeaturesGrid(p, [
        { title: 'Ensaios', body: 'Textos curados com tipografia editorial e ritmo de leitura.' },
        { title: 'Arquivo', body: 'Navegação limpa por temas e anos.' },
        { title: 'Sobre', body: 'Uma casa para ideias que merecem espaço.' },
      ]),
      buildCTA(p, {
        title: 'Receba o novo ensaio toda semana',
        body: 'Newsletter sem ruído, só escrita.',
        cta: 'Assinar',
        ctaHref: '#assinar',
      }),
      buildFooter(p, '© 2026 The Review'),
    ]),
  createEffects: () => [
    effect('scrollReveal', 30, { distance: 56, duration: 800, once: true }),
    effect('parallaxLayer', 30, { strength: 0.18 }),
  ],
  createInteractions: () => [],
});

const techStartupLanding = (): ExperienceTemplate => ({
  id: 'tech-startup-landing',
  name: 'Startup Tecnológica',
  description: 'Visual tecnológico com shader sutil e reveal por scroll.',
  category: 'startup',
  exportTarget: 'next',
  presetId: 'institutional-modern',
  performance: 'low',
  accent: '#2563eb',
  createPage: () =>
    themedPage('institutional-modern', 'Startup Tech', (p) => [
      buildNavbar(p, 'Nimbus', 'Produto,Preços,Docs'.split(',')),
      buildHero(p, {
        variant: 'split',
        title: 'Infraestrutura confiável para escalar',
        subtitle: 'Startup com visual tecnológico, shader discreto e revelação suave.',
        cta: 'Solicitar demo',
        ctaHref: '#demo',
      }),
      buildStatsRow(p, [
        { value: '50ms', label: 'Latência média' },
        { value: '30+', label: 'Regiões' },
        { value: 'SOC2', label: 'Certificado' },
      ]),
      buildFeaturesGrid(p, [
        { title: 'Confiável', body: 'SLA de 99.99% com observabilidade nativa.' },
        { title: 'Rápido', body: 'Edge network global com cache inteligente.' },
        { title: 'Seguro', body: 'Criptografia em trânsito e repouso.' },
      ]),
      buildCTA(p, {
        title: 'Suba para produção com confiança',
        body: 'Comece com créditos grátis.',
        cta: 'Criar conta',
        ctaHref: '#start',
      }),
      buildFooter(p, '© 2026 Nimbus'),
    ]),
  createEffects: () => [
    effect('shaderBackground', 0, { color: '#0f1115', colorB: '#2563eb', colorC: '#10b981', opacity: 0.6, speed: 0.2 }),
    effect('scrollReveal', 30, { once: true }),
  ],
  createInteractions: (page, sceneTargetId = 'current-scene') => {
    const scene = firstSceneCanvas(page);
    return scene ? [createDefaultInteraction(scene.id, sceneTargetId, 'scroll', 'moveCamera')] : [];
  },
});

const glbShowcase = (): ExperienceTemplate => ({
  id: 'glb-showcase',
  name: 'Showcase GLB',
  description: 'Vitrine de modelo GLB com cena 3D interativa.',
  category: 'product',
  exportTarget: 'react',
  presetId: 'dark-premium',
  performance: 'medium',
  accent: '#e8d58a',
  createPage: () =>
    themedPage('dark-premium', 'Showcase GLB', (p) => [
      buildNavbar(p, 'GLB Studio', 'Modelos,Docs'.split(',')),
      buildShowcase(p, { title: 'Showcase de modelo GLB', subtitle: 'Importe um modelo e apresente em cena 3D interativa.', height: 560 }),
      buildFeaturesGrid(p, [
        { title: 'Importação', body: 'Carregue .glb/.gltf e mostre com materiais PBR.' },
        { title: 'Interação', body: 'Gire e aproxime com controles suaves.' },
        { title: 'Exportação', body: 'Publique a vitrine em qualquer stack.' },
      ]),
      buildFooter(p, '© 2026 GLB Studio'),
    ]),
  createEffects: () => [
    effect('floatingOrbs', 0, { count: 5, color: '#c9a227', colorB: '#e8d58a', opacity: 0.3 }),
    effect('scrollReveal', 30, { once: true }),
  ],
  createInteractions: (page, sceneTargetId = 'current-scene') => {
    const scene = firstSceneCanvas(page);
    return scene ? [createDefaultInteraction(scene.id, sceneTargetId, 'mouseMove', 'rotateObject3D')] : [];
  },
});

const particleShowcase = (): ExperienceTemplate => ({
  id: 'particle-showcase',
  name: 'Background Partículas',
  description: 'Página focada em partículas reais como protagonista.',
  category: 'immersive',
  exportTarget: 'vite',
  presetId: 'nature-3d',
  performance: 'high',
  accent: '#34d399',
  createPage: () =>
    themedPage('nature-3d', 'Partículas', (p) => [
      buildNavbar(p, 'PULSAR', 'Demo,Docs'.split(',')),
      buildHero(p, {
        variant: 'background',
        title: 'Partículas como experiência',
        subtitle: 'Sistema real de partículas em Three.js — nuvem, grid, esfera ou fluxo.',
        cta: 'Ver ao vivo',
        ctaHref: '#demo',
      }),
      buildFeaturesGrid(p, [
        { title: 'Formas', body: 'Cloud, grid, sphere e flow configuráveis por props.' },
        { title: 'Conexões', body: 'Linhas dinâmicas entre partículas próximas.' },
        { title: 'Mouse', body: 'As partículas reagem ao cursor com profundidade 3D.' },
      ]),
      buildFooter(p, '© 2026 PULSAR'),
    ]),
  createEffects: () => [
    effect('particleField', 0, { count: 2000, color: '#34d399', colorB: '#a3e635', shape: 'cloud', depth: 7, connectLines: true, mouseReact: true }),
    effect('customCursor', 46, { cursorStyle: 'nature', cursorColor: '#34d399', showTrail: true, trailLength: 8, showLight: true, lightColor: '#34d399', lightIntensity: 5 }),
  ],
  createInteractions: (page, sceneTargetId = 'current-scene') => {
    const scene = firstSceneCanvas(page);
    return scene ? [createDefaultInteraction(scene.id, sceneTargetId, 'mouseMove', 'rotateObject3D')] : [];
  },
});

const indieGamePage = (): ExperienceTemplate => ({
  id: 'indie-game-page',
  name: 'Landing de Game Indie',
  description: 'Game landing com partículas, luz e energia.',
  category: 'game',
  exportTarget: 'html',
  presetId: 'game-landing',
  performance: 'high',
  accent: '#8b5cf6',
  createPage: () =>
    themedPage('game-landing', 'Game Indie', (p) => [
      buildNavbar(p, 'NEON DRIFT', 'Trailer,Wishlist,Discord'.split(',')),
      buildHero(p, {
        variant: 'centered',
        title: 'NEON DRIFT',
        subtitle: 'Corrida futurista com partículas, luz neon e física arcade.',
        cta: 'Wishlist agora',
        ctaHref: '#wishlist',
      }),
      buildShowcase(p, { title: 'Veja o trailer', subtitle: 'Cena 3D do carro principal.', height: 520 }),
      buildFeaturesGrid(p, [
        { title: 'Arcade', body: 'Drift satisfatório com física acessível.' },
        { title: 'Trilhas', body: '12 pistas com ilumização neon única.' },
        { title: 'Online', body: 'Multiplayer local e remoto.' },
      ]),
      buildCTA(p, {
        title: 'Coloque no wishlist',
        body: 'Lançamento em breve com demo aberta.',
        cta: 'Ir para Steam',
        ctaHref: '#steam',
      }),
      buildFooter(p, '© 2026 NEON DRIFT'),
    ]),
  createEffects: () => [
    effect('particleField', 0, { count: 2400, color: '#f43f5e', colorB: '#8b5cf6', speed: 0.5, connectLines: true }),
    effect('animatedStars', 0, { count: 1200, color: '#fb7185' }),
    effect('lightBeams', 40, { color: '#8b5cf6', count: 3, opacity: 0.35 }),
  ],
  createInteractions: (page, sceneTargetId = 'current-scene') => {
    const button = firstButton(page);
    return button ? [createDefaultInteraction(button.id, sceneTargetId, 'click', 'startAnimation')] : [];
  },
});

export const EXPERIENCE_TEMPLATES: ExperienceTemplate[] = [
  futuristicLanding(),
  premiumInstitutional(),
  creativePortfolio(),
  saasHeroMesh(),
  product3dScene(),
  eventLights(),
  interactiveEducation(),
  immersiveWebgl(),
  liquidSurfaceBackground(),
  editorialSmooth(),
  techStartupLanding(),
  glbShowcase(),
  particleShowcase(),
  indieGamePage(),
];

export const getTemplate = (id: ExperienceTemplateId): ExperienceTemplate =>
  EXPERIENCE_TEMPLATES.find((item) => item.id === id) ?? EXPERIENCE_TEMPLATES[0];

export const instantiateTemplate = (templateId: ExperienceTemplateId, sceneTargetId?: string) => {
  const template = getTemplate(templateId);
  const page = template.createPage();
  const effects = template.createEffects();
  const preset = getVisualPreset(template.presetId);
  page.effects = {
    version: 1,
    items: effects,
    presetId: template.presetId,
    intensity: intensityToScale(preset.effectIntensity),
  };
  return {
    page,
    interactions: template.createInteractions(page, sceneTargetId),
    effects,
    exportTarget: template.exportTarget,
    presetId: template.presetId,
  };
};

/** Default page builder using the default project preset (kept for parity). */
export const createDefaultProjectPage = (): PageDocument => {
  const preset = getVisualPreset('tech-startup');
  const doc = basePage('Page');
  doc.children = buildDefaultProjectPage(preset, '3D Web');
  return doc;
};
