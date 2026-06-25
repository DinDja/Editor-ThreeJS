import type { EffectDefinition, EffectType, PageEffect } from './types';
import { createId } from '@/store/types';

/**
 * Registry of every available visual effect with its editable prop schema.
 * The schema drives both the runtime component props and the properties panel.
 */
export const EFFECT_REGISTRY: Record<EffectType, EffectDefinition> = {
  particleField: {
    type: 'particleField',
    label: 'Particle Field',
    description: 'Partículas 3D reais com movimento procedural, reação ao mouse e conexões por linhas.',
    renderer: 'webgl',
    cost: 'high',
    category: 'background',
    props: [
      { key: 'count', label: 'Quantidade', type: 'range', min: 80, max: 6000, step: 20, default: 1800, description: 'Número de partículas (reduzido automaticamente em dispositivos fracos).' },
      { key: 'size', label: 'Tamanho', type: 'range', min: 0.01, max: 0.4, step: 0.01, default: 0.08 },
      { key: 'speed', label: 'Velocidade', type: 'range', min: 0, max: 2, step: 0.05, default: 0.4 },
      { key: 'color', label: 'Cor', type: 'color', default: '#34d399' },
      { key: 'colorB', label: 'Cor 2', type: 'color', default: '#22d3ee' },
      { key: 'opacity', label: 'Opacidade', type: 'range', min: 0, max: 1, step: 0.05, default: 0.9 },
      { key: 'connectLines', label: 'Linhas de conexão', type: 'toggle', default: true },
      { key: 'lineDistance', label: 'Distância das linhas', type: 'range', min: 0.2, max: 4, step: 0.1, default: 1.4 },
      { key: 'mouseReact', label: 'Reage ao mouse', type: 'toggle', default: true },
      { key: 'shape', label: 'Formato', type: 'select', default: 'cloud', options: [
        { value: 'cloud', label: 'Nuvem' },
        { value: 'grid', label: 'Grid' },
        { value: 'sphere', label: 'Esfera' },
        { value: 'flow', label: 'Fluxo' },
      ] },
      { key: 'depth', label: 'Profundidade 3D', type: 'range', min: 1, max: 14, step: 0.5, default: 6 },
    ],
  },
  floatingOrbs: {
    type: 'floatingOrbs',
    label: 'Floating Orbs',
    description: 'Esferas translúcidas flutuando com profundidade e blur.',
    renderer: 'webgl',
    cost: 'medium',
    category: 'ambient',
    props: [
      { key: 'count', label: 'Quantidade', type: 'range', min: 1, max: 24, step: 1, default: 8 },
      { key: 'size', label: 'Tamanho', type: 'range', min: 0.2, max: 4, step: 0.1, default: 1.2 },
      { key: 'speed', label: 'Velocidade', type: 'range', min: 0, max: 1.5, step: 0.05, default: 0.25 },
      { key: 'color', label: 'Cor', type: 'color', default: '#7dd3fc' },
      { key: 'colorB', label: 'Cor 2', type: 'color', default: '#a78bfa' },
      { key: 'opacity', label: 'Opacidade', type: 'range', min: 0, max: 1, step: 0.05, default: 0.55 },
    ],
  },
  shaderBackground: {
    type: 'shaderBackground',
    label: 'Shader Background',
    description: 'Plano com shader procedural animado (gradiente orgânico).',
    renderer: 'webgl',
    cost: 'medium',
    category: 'background',
    props: [
      { key: 'color', label: 'Cor A', type: 'color', default: '#0b1020' },
      { key: 'colorB', label: 'Cor B', type: 'color', default: '#22d3ee' },
      { key: 'colorC', label: 'Cor C', type: 'color', default: '#3b82f6' },
      { key: 'speed', label: 'Velocidade', type: 'range', min: 0, max: 2, step: 0.05, default: 0.3 },
      { key: 'scale', label: 'Escala', type: 'range', min: 0.5, max: 6, step: 0.1, default: 2.4 },
      { key: 'opacity', label: 'Opacidade', type: 'range', min: 0, max: 1, step: 0.05, default: 0.85 },
    ],
  },
  gradientMesh: {
    type: 'gradientMesh',
    label: 'Gradient Mesh',
    description: 'Malha de gradientes animada em camadas CSS.',
    renderer: 'css',
    cost: 'low',
    category: 'background',
    props: [
      { key: 'color', label: 'Cor A', type: 'color', default: '#7c3aed' },
      { key: 'colorB', label: 'Cor B', type: 'color', default: '#06b6d4' },
      { key: 'colorC', label: 'Cor C', type: 'color', default: '#ec4899' },
      { key: 'blur', label: 'Blur', type: 'range', min: 0, max: 160, step: 4, default: 80 },
      { key: 'speed', label: 'Velocidade', type: 'range', min: 0, max: 2, step: 0.05, default: 0.4 },
      { key: 'opacity', label: 'Opacidade', type: 'range', min: 0, max: 1, step: 0.05, default: 0.5 },
    ],
  },
  lightBeams: {
    type: 'lightBeams',
    label: 'Light Beams',
    description: 'Feixes de luz diagonais animados sobre o conteúdo.',
    renderer: 'css',
    cost: 'low',
    category: 'overlay',
    props: [
      { key: 'color', label: 'Cor', type: 'color', default: '#fbbf24' },
      { key: 'count', label: 'Feixes', type: 'range', min: 1, max: 6, step: 1, default: 3 },
      { key: 'width', label: 'Largura', type: 'range', min: 40, max: 420, step: 10, default: 180 },
      { key: 'speed', label: 'Velocidade', type: 'range', min: 0, max: 2, step: 0.05, default: 0.3 },
      { key: 'opacity', label: 'Opacidade', type: 'range', min: 0, max: 1, step: 0.05, default: 0.35 },
      { key: 'angle', label: 'Ângulo', type: 'range', min: -45, max: 45, step: 1, default: -12 },
    ],
  },
  noiseOverlay: {
    type: 'noiseOverlay',
    label: 'Noise Overlay',
    description: 'Granulado sutil para textura cinematográfica.',
    renderer: 'css',
    cost: 'low',
    category: 'overlay',
    props: [
      { key: 'opacity', label: 'Opacidade', type: 'range', min: 0, max: 0.5, step: 0.01, default: 0.08 },
      { key: 'grain', label: 'Intensidade', type: 'range', min: 1, max: 10, step: 1, default: 4 },
    ],
  },
  gridFloor3D: {
    type: 'gridFloor3D',
    label: 'Grid Floor 3D',
    description: 'Piso em grid 3D em perspectiva com movimento.',
    renderer: 'webgl',
    cost: 'medium',
    category: 'background',
    props: [
      { key: 'color', label: 'Cor', type: 'color', default: '#22d3ee' },
      { key: 'colorB', label: 'Cor 2', type: 'color', default: '#0b1020' },
      { key: 'size', label: 'Tamanho', type: 'range', min: 10, max: 60, step: 2, default: 28 },
      { key: 'speed', label: 'Velocidade', type: 'range', min: 0, max: 3, step: 0.05, default: 0.6 },
      { key: 'opacity', label: 'Opacidade', type: 'range', min: 0, max: 1, step: 0.05, default: 0.8 },
    ],
  },
  animatedStars: {
    type: 'animatedStars',
    label: 'Animated Stars',
    description: 'Campo de estrelas com twinkle e paralaxe.',
    renderer: 'webgl',
    cost: 'medium',
    category: 'background',
    props: [
      { key: 'count', label: 'Quantidade', type: 'range', min: 100, max: 4000, step: 50, default: 1200 },
      { key: 'size', label: 'Tamanho', type: 'range', min: 0.01, max: 0.2, step: 0.01, default: 0.05 },
      { key: 'speed', label: 'Velocidade', type: 'range', min: 0, max: 1.5, step: 0.05, default: 0.15 },
      { key: 'color', label: 'Cor', type: 'color', default: '#ffffff' },
      { key: 'opacity', label: 'Opacidade', type: 'range', min: 0, max: 1, step: 0.05, default: 0.9 },
      { key: 'twinkle', label: 'Twinkle', type: 'toggle', default: true },
    ],
  },
  cursorGlow: {
    type: 'cursorGlow',
    label: 'Cursor Glow',
    description: 'Luz que segue o cursor com mistura suave.',
    renderer: 'css',
    cost: 'low',
    category: 'interactive',
    props: [
      { key: 'color', label: 'Cor', type: 'color', default: '#34d399' },
      { key: 'size', label: 'Tamanho', type: 'range', min: 80, max: 600, step: 10, default: 320 },
      { key: 'opacity', label: 'Opacidade', type: 'range', min: 0, max: 1, step: 0.05, default: 0.35 },
      { key: 'smooth', label: 'Suavidade', type: 'range', min: 0.04, max: 0.4, step: 0.02, default: 0.14 },
    ],
  },
  customCursor: {
    type: 'customCursor',
    label: 'Cursor Personalizado',
    description: 'Cursor customizado com estilo único por template — inclui ponteiro SVG, ícone ou luz 3D.',
    renderer: 'css',
    cost: 'low',
    category: 'interactive',
    props: [
      { key: 'cursorStyle', label: 'Estilo do Cursor', type: 'select', default: 'default', options: [
        { value: 'default', label: 'Padrao' },
        { value: 'neoGlow', label: 'Neon Glow' },
        { value: 'crosshair', label: 'Crosshair' },
        { value: 'cosmic', label: 'Cosmico' },
        { value: 'nature', label: 'Natureza' },
        { value: 'luxury', label: 'Luxo' },
        { value: 'tech', label: 'Tech' },
        { value: 'game', label: 'Game' },
        { value: 'glass', label: 'Vidro' },
        { value: 'editorial', label: 'Editorial' },
      ] },
      { key: 'cursorColor', label: 'Cor do Cursor', type: 'color', default: '#ffffff' },
      { key: 'cursorSize', label: 'Tamanho (px)', type: 'range', min: 16, max: 64, step: 2, default: 28 },
      { key: 'showTrail', label: 'Rastro', type: 'toggle', default: true },
      { key: 'trailLength', label: 'Tam. Rastro', type: 'range', min: 2, max: 20, step: 1, default: 8 },
      { key: 'showLight', label: 'Luz 3D no Cursor', type: 'toggle', default: false },
      { key: 'lightColor', label: 'Cor da Luz', type: 'color', default: '#00f0ff' },
      { key: 'lightIntensity', label: 'Intensidade', type: 'range', min: 0.5, max: 20, step: 0.5, default: 5 },
      { key: 'lightRadius', label: 'Raio da Luz', type: 'range', min: 1, max: 20, step: 0.5, default: 8 },
    ],
  },
  scrollReveal: {
    type: 'scrollReveal',
    label: 'Scroll Reveal',
    description: 'Revela elementos com fade/translate ao entrar na viewport.',
    renderer: 'css',
    cost: 'low',
    category: 'layout',
    props: [
      { key: 'distance', label: 'Distância (px)', type: 'range', min: 0, max: 160, step: 4, default: 48 },
      { key: 'duration', label: 'Duração (ms)', type: 'range', min: 200, max: 1600, step: 50, default: 700 },
      { key: 'easing', label: 'Easing', type: 'select', default: 'cubic-bezier(0.16,1,0.3,1)', options: [
        { value: 'cubic-bezier(0.16,1,0.3,1)', label: 'Suave' },
        { value: 'ease-out', label: 'Ease out' },
        { value: 'cubic-bezier(0.33,1,0.68,1)', label: 'Leve' },
      ] },
      { key: 'once', label: 'Apenas uma vez', type: 'toggle', default: true },
    ],
  },
  parallaxLayer: {
    type: 'parallaxLayer',
    label: 'Parallax Layer',
    description: 'Camada com paralaxe em resposta ao scroll.',
    renderer: 'css',
    cost: 'low',
    category: 'layout',
    props: [
      { key: 'strength', label: 'Força', type: 'range', min: 0, max: 1, step: 0.02, default: 0.25 },
      { key: 'image', label: 'Imagem (URL)', type: 'text', default: '' },
    ],
  },
  auroraBackground: {
    type: 'auroraBackground',
    label: 'Aurora Background',
    description: 'Aurora animada em camadas com blend.',
    renderer: 'css',
    cost: 'low',
    category: 'background',
    props: [
      { key: 'color', label: 'Cor A', type: 'color', default: '#34d399' },
      { key: 'colorB', label: 'Cor B', type: 'color', default: '#22d3ee' },
      { key: 'colorC', label: 'Cor C', type: 'color', default: '#a78bfa' },
      { key: 'speed', label: 'Velocidade', type: 'range', min: 0, max: 2, step: 0.05, default: 0.4 },
      { key: 'opacity', label: 'Opacidade', type: 'range', min: 0, max: 1, step: 0.05, default: 0.6 },
    ],
  },
  liquidSurface: {
    type: 'liquidSurface',
    label: 'Liquid Surface',
    description: 'Superfície líquida WebGL com ondas/ripples simulados e reflexo PBR.',
    renderer: 'webgl',
    cost: 'high',
    category: 'background',
    props: [
      { key: 'color', label: 'Cor', type: 'color', default: '#2dd4bf' },
      { key: 'metalness', label: 'Metalness', type: 'range', min: 0, max: 1, step: 0.05, default: 0.72 },
      { key: 'roughness', label: 'Roughness', type: 'range', min: 0, max: 1, step: 0.05, default: 0.18 },
      { key: 'displacementScale', label: 'Ondulação', type: 'range', min: 0.1, max: 5, step: 0.1, default: 2.6 },
      { key: 'rainEnabled', label: 'Gotas automáticas', type: 'toggle', default: true },
      { key: 'sizeX', label: 'Largura', type: 'range', min: 4, max: 24, step: 0.5, default: 14 },
      { key: 'sizeY', label: 'Altura', type: 'range', min: 3, max: 18, step: 0.5, default: 8 },
      { key: 'opacity', label: 'Opacidade', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.95 },
    ],
  },
  holographicPanel: {
    type: 'holographicPanel',
    label: 'Holographic Panel',
    description: 'Painel holográfico com borda luminosa e scanlines.',
    renderer: 'css',
    cost: 'low',
    category: 'overlay',
    props: [
      { key: 'color', label: 'Cor', type: 'color', default: '#22d3ee' },
      { key: 'opacity', label: 'Opacidade', type: 'range', min: 0, max: 1, step: 0.05, default: 0.5 },
      { key: 'scanlines', label: 'Scanlines', type: 'toggle', default: true },
    ],
  },
  glassCard: {
    type: 'glassCard',
    label: 'Glass Card',
    description: 'Estilo glassmorphism aplicado aos cards da página.',
    renderer: 'css',
    cost: 'low',
    category: 'layout',
    props: [
      { key: 'blur', label: 'Blur (px)', type: 'range', min: 0, max: 30, step: 1, default: 14 },
      { key: 'opacity', label: 'Opacidade', type: 'range', min: 0, max: 1, step: 0.05, default: 0.6 },
      { key: 'border', label: 'Borda', type: 'color', default: '#ffffff' },
    ],
  },
  magneticButton: {
    type: 'magneticButton',
    label: 'Magnetic Button',
    description: 'Botões com atração magnética ao cursor.',
    renderer: 'css',
    cost: 'low',
    category: 'interactive',
    props: [
      { key: 'strength', label: 'Força', type: 'range', min: 0, max: 1, step: 0.02, default: 0.4 },
      { key: 'radius', label: 'Raio (px)', type: 'range', min: 40, max: 240, step: 10, default: 120 },
    ],
  },
  webglHeroScene: {
    type: 'webglHeroScene',
    label: 'WebGL Hero Scene',
    description: 'Cena hero WebGL com malha 3D interativa (torus knot / icosaedro).',
    renderer: 'webgl',
    cost: 'high',
    category: 'background',
    props: [
      { key: 'shape', label: 'Forma', type: 'select', default: 'torusKnot', options: [
        { value: 'torusKnot', label: 'Torus Knot' },
        { value: 'icosahedron', label: 'Icosaedro' },
        { value: 'sphere', label: 'Esfera' },
        { value: 'box', label: 'Cubo' },
      ] },
      { key: 'color', label: 'Cor', type: 'color', default: '#22d3ee' },
      { key: 'colorB', label: 'Emissive', type: 'color', default: '#0b1020' },
      { key: 'metalness', label: 'Metalness', type: 'range', min: 0, max: 1, step: 0.05, default: 0.6 },
      { key: 'roughness', label: 'Roughness', type: 'range', min: 0, max: 1, step: 0.05, default: 0.2 },
      { key: 'speed', label: 'Velocidade', type: 'range', min: 0, max: 2, step: 0.05, default: 0.4 },
      { key: 'scale', label: 'Escala', type: 'range', min: 0.3, max: 3, step: 0.05, default: 1.1 },
      { key: 'wireframe', label: 'Wireframe', type: 'toggle', default: false },
      { key: 'mouseReact', label: 'Reage ao mouse', type: 'toggle', default: true },
    ],
  },
};

export const EFFECT_LIST = Object.values(EFFECT_REGISTRY);

export const getEffectDefinition = (type: EffectType): EffectDefinition =>
  EFFECT_REGISTRY[type] ?? EFFECT_REGISTRY.particleField;

export const getEffectDefaultProps = (type: EffectType): Record<string, unknown> => {
  const def = getEffectDefinition(type);
  const props: Record<string, unknown> = {};
  for (const schema of def.props) props[schema.key] = schema.default;
  return props;
};

export const createDefaultEffect = (
  type: EffectType,
  scope: 'page' | string = 'page',
  overrides?: Partial<PageEffect>,
): PageEffect => ({
  id: createId(),
  type,
  enabled: true,
  scope,
  props: getEffectDefaultProps(type),
  zIndex: defaultEffectZIndex(type),
  ...overrides,
});

/** Suggested stacking order per effect category. */
export const defaultEffectZIndex = (type: EffectType): number => {
  const def = EFFECT_REGISTRY[type];
  if (def.category === 'background') return 0;
  if (def.category === 'ambient') return 1;
  if (def.category === 'overlay') return 40;
  if (def.category === 'interactive') return 45;
  return 30;
};
