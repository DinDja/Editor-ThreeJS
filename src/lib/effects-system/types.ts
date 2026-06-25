import type { VisualPresetId } from '@/lib/template-engine/presets';

/**
 * Reusable visual effect types that can be attached to a page.
 * WebGL effects render inside a single shared R3F canvas (performant).
 * CSS/DOM effects render as overlay layers.
 */
export type EffectType =
  | 'particleField'
  | 'floatingOrbs'
  | 'shaderBackground'
  | 'gradientMesh'
  | 'lightBeams'
  | 'noiseOverlay'
  | 'gridFloor3D'
  | 'animatedStars'
  | 'cursorGlow'
  | 'scrollReveal'
  | 'parallaxLayer'
  | 'auroraBackground'
  | 'liquidSurface'
  | 'holographicPanel'
  | 'glassCard'
  | 'magneticButton'
  | 'webglHeroScene'
  | 'customCursor';

export type EffectRenderer = 'webgl' | 'css';

export type EffectPerformanceTier = 'low' | 'medium' | 'high';

export type EffectPropType = 'number' | 'range' | 'color' | 'select' | 'toggle' | 'text';

export type EffectPropOption = { value: string | number; label: string };

export type EffectPropSchema = {
  key: string;
  label: string;
  type: EffectPropType;
  min?: number;
  max?: number;
  step?: number;
  options?: EffectPropOption[];
  default: unknown;
  description?: string;
};

export type EffectDefinition = {
  type: EffectType;
  label: string;
  description: string;
  renderer: EffectRenderer;
  /** Base GPU cost heuristic used to estimate performance impact. */
  cost: EffectPerformanceTier;
  /** Category used for grouping in the effects panel / gallery. */
  category: 'background' | 'ambient' | 'interactive' | 'overlay' | 'layout';
  props: EffectPropSchema[];
};

/**
 * A configured effect instance attached to a page.
 * `scope: 'page'` renders as a page-wide layer.
 * A section node id scopes the effect to that section (CSS effects only in v1).
 */
export type PageEffect = {
  id: string;
  type: EffectType;
  enabled: boolean;
  scope: 'page' | string;
  props: Record<string, unknown>;
  zIndex: number;
};

/**
 * Optional page-level effects document. Kept on `PageDocument.effects`
 * so existing project files without effects remain valid.
 */
export type PageEffectsConfig = {
  version?: number;
  items: PageEffect[];
  /** Linked visual preset id (if any). */
  presetId?: VisualPresetId;
  /** Global effect intensity multiplier (0..1). */
  intensity?: number;
};
