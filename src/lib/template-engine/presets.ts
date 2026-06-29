/**
 * Visual presets accelerate page creation by defining a coherent
 * design system: palette, typography, button/card style, background,
 * effect intensity, animations and spacing.
 *
 * Presets are non-destructive: applying one updates colors/fonts/styles
 * of existing nodes and tunes effect intensity, but never removes
 * user content.
 */

export type VisualPresetId =
  | 'cyber-neon'
  | 'dark-premium'
  | 'soft-glass'
  | 'editorial-clean'
  | 'tech-startup'
  | 'nature-3d'
  | 'education-lab'
  | 'luxury-product'
  | 'game-landing'
  | 'institutional-modern'
  | 'power-ai'
  | 'taskly'
  | 'vanguard'
  | 'lithos';

export type EffectIntensity = 'low' | 'medium' | 'high';

export type PresetPalette = {
  background: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
};

export type PresetTypography = {
  headingFont: string;
  bodyFont: string;
  headingWeight: number;
  headingSize: string;
  bodySize: string;
  letterSpacing: string;
};

export type PresetButtonStyle = {
  radius: string;
  background: string;
  color: string;
  border: string;
  boxShadow: string;
  padding: string;
};

export type PresetCardStyle = {
  radius: string;
  background: string;
  border: string;
  boxShadow: string;
  padding: string;
};

export type PresetAnimation = {
  easing: string;
  durationMs: number;
  hoverLift: boolean;
  scrollReveal: boolean;
};

export type PresetSpacing = 'compact' | 'normal' | 'relaxed';

export type CursorConfig = {
  iconIndex: number;
  effect: string;
  color: string;
};

export type VisualPreset = {
  id: VisualPresetId;
  name: string;
  description: string;
  /** Tailwind-independent CSS color token used in the gallery swatch. */
  swatch: string[];
  palette: PresetPalette;
  typography: PresetTypography;
  button: PresetButtonStyle;
  card: PresetCardStyle;
  background: string;
  effectIntensity: EffectIntensity;
  animations: PresetAnimation;
  spacing: PresetSpacing;
  cursor: CursorConfig;
  /** Suggested effects to enable when the preset is applied fresh. */
  suggestedEffects: { type: string; intensity: number }[];
};

export const VISUAL_PRESETS: VisualPreset[] = [
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    description: 'Futurista com glow neon, partículas e profundidade.',
    swatch: ['#05060a', '#00f0ff', '#ff00e5', '#7a00ff'],
    palette: {
      background: '#05060a',
      surface: '#0b0e16',
      surfaceAlt: '#11141f',
      primary: '#00f0ff',
      accent: '#ff00e5',
      text: '#e8f7ff',
      textMuted: '#6b7a99',
      border: 'rgba(0,240,255,0.18)',
    },
    typography: {
      headingFont: "'Space Grotesk', 'Segoe UI', sans-serif",
      bodyFont: "'Inter', 'Segoe UI', sans-serif",
      headingWeight: 700,
      headingSize: 'clamp(40px, 6vw, 64px)',
      bodySize: '16px',
      letterSpacing: '0.02em',
    },
    button: {
      radius: '999px',
      background: 'linear-gradient(135deg, #00f0ff, #7a00ff)',
      color: '#04060a',
      border: '1px solid rgba(0,240,255,0.6)',
      boxShadow: '0 0 28px rgba(0,240,255,0.45)',
      padding: '14px 22px',
    },
    card: {
      radius: '14px',
      background: 'rgba(11,14,22,0.7)',
      border: '1px solid rgba(0,240,255,0.18)',
      boxShadow: '0 18px 50px rgba(0,240,255,0.12)',
      padding: '24px',
    },
    background: 'radial-gradient(circle at 20% 10%, rgba(0,240,255,0.12), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,0,229,0.1), transparent 50%), #05060a',
    effectIntensity: 'high',
    animations: { easing: 'cubic-bezier(0.16,1,0.3,1)', durationMs: 600, hoverLift: true, scrollReveal: true },
    spacing: 'normal',
    cursor: { iconIndex: 0, effect: 'neonGlow', color: '#00f0ff' },
    suggestedEffects: [
      { type: 'particleField', intensity: 0.9 },
      { type: 'gridFloor3D', intensity: 0.7 },
      { type: 'cursorGlow', intensity: 0.6 },
    ],
  },
  {
    id: 'dark-premium',
    name: 'Dark Premium',
    description: 'Institucional premium com fundo 3D sofisticado.',
    swatch: ['#0a0a0c', '#c9a227', '#f5f5f4', '#1a1a1f'],
    palette: {
      background: '#0a0a0c',
      surface: '#121215',
      surfaceAlt: '#17181c',
      primary: '#c9a227',
      accent: '#e8d58a',
      text: '#f5f5f4',
      textMuted: '#8b8b92',
      border: 'rgba(201,162,39,0.18)',
    },
    typography: {
      headingFont: "'Playfair Display', Georgia, serif",
      bodyFont: "'Inter', 'Segoe UI', sans-serif",
      headingWeight: 600,
      headingSize: 'clamp(38px, 5.5vw, 58px)',
      bodySize: '17px',
      letterSpacing: '0.01em',
    },
    button: {
      radius: '6px',
      background: '#c9a227',
      color: '#0a0a0c',
      border: '1px solid rgba(201,162,39,0.5)',
      boxShadow: '0 12px 40px rgba(201,162,39,0.25)',
      padding: '13px 20px',
    },
    card: {
      radius: '10px',
      background: 'rgba(18,18,21,0.85)',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 22px 60px rgba(0,0,0,0.45)',
      padding: '26px',
    },
    background: 'radial-gradient(circle at 50% 0%, rgba(201,162,39,0.1), transparent 55%), #0a0a0c',
    effectIntensity: 'medium',
    animations: { easing: 'cubic-bezier(0.22,1,0.36,1)', durationMs: 700, hoverLift: true, scrollReveal: true },
    spacing: 'relaxed',
    cursor: { iconIndex: 0, effect: 'sparkle', color: '#c9a227' },
    suggestedEffects: [
      { type: 'floatingOrbs', intensity: 0.6 },
      { type: 'noiseOverlay', intensity: 0.3 },
    ],
  },
  {
    id: 'soft-glass',
    name: 'Soft Glass',
    description: 'Glassmorphism suave com aurora e profundidade.',
    swatch: ['#0f1419', '#7dd3fc', '#a78bfa', '#e0f2fe'],
    palette: {
      background: '#0f1419',
      surface: 'rgba(30,41,59,0.55)',
      surfaceAlt: 'rgba(51,65,85,0.45)',
      primary: '#7dd3fc',
      accent: '#a78bfa',
      text: '#e0f2fe',
      textMuted: '#94a3b8',
      border: 'rgba(255,255,255,0.14)',
    },
    typography: {
      headingFont: "'Inter', 'Segoe UI', sans-serif",
      bodyFont: "'Inter', 'Segoe UI', sans-serif",
      headingWeight: 600,
      headingSize: 'clamp(36px, 5vw, 54px)',
      bodySize: '16px',
      letterSpacing: '0em',
    },
    button: {
      radius: '14px',
      background: 'rgba(125,211,252,0.18)',
      color: '#e0f2fe',
      border: '1px solid rgba(255,255,255,0.22)',
      boxShadow: '0 12px 40px rgba(125,211,252,0.2)',
      padding: '13px 20px',
    },
    card: {
      radius: '18px',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.14)',
      boxShadow: '0 18px 50px rgba(0,0,0,0.25)',
      padding: '24px',
    },
    background: 'radial-gradient(circle at 30% 20%, rgba(125,211,252,0.14), transparent 50%), radial-gradient(circle at 70% 70%, rgba(167,139,250,0.12), transparent 55%), #0f1419',
    effectIntensity: 'medium',
    animations: { easing: 'cubic-bezier(0.33,1,0.68,1)', durationMs: 650, hoverLift: true, scrollReveal: true },
    spacing: 'normal',
    cursor: { iconIndex: 0, effect: 'aura', color: '#7dd3fc' },
    suggestedEffects: [
      { type: 'auroraBackground', intensity: 0.8 },
      { type: 'glassCard', intensity: 0.7 },
      { type: 'floatingOrbs', intensity: 0.5 },
    ],
  },
  {
    id: 'editorial-clean',
    name: 'Editorial Clean',
    description: 'Editorial elegante com animações suaves.',
    swatch: ['#f8f7f4', '#111111', '#c2410c', '#e7e5e4'],
    palette: {
      background: '#f8f7f4',
      surface: '#ffffff',
      surfaceAlt: '#f1efea',
      primary: '#111111',
      accent: '#c2410c',
      text: '#1c1917',
      textMuted: '#78716c',
      border: 'rgba(0,0,0,0.08)',
    },
    typography: {
      headingFont: "'Playfair Display', Georgia, serif",
      bodyFont: "'Inter', 'Segoe UI', sans-serif",
      headingWeight: 700,
      headingSize: 'clamp(40px, 6vw, 60px)',
      bodySize: '18px',
      letterSpacing: '-0.01em',
    },
    button: {
      radius: '2px',
      background: '#111111',
      color: '#f8f7f4',
      border: '1px solid #111111',
      boxShadow: 'none',
      padding: '12px 22px',
    },
    card: {
      radius: '4px',
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.07)',
      boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
      padding: '28px',
    },
    background: '#f8f7f4',
    effectIntensity: 'low',
    animations: { easing: 'cubic-bezier(0.22,1,0.36,1)', durationMs: 800, hoverLift: false, scrollReveal: true },
    spacing: 'relaxed',
    cursor: { iconIndex: 0, effect: 'none', color: '#111111' },
    suggestedEffects: [
      { type: 'scrollReveal', intensity: 0.7 },
      { type: 'parallaxLayer', intensity: 0.4 },
    ],
  },
  {
    id: 'tech-startup',
    name: 'Tech Startup',
    description: 'Startup tecnológica com malha 3D interativa.',
    swatch: ['#0b1020', '#22d3ee', '#3b82f6', '#e2e8f0'],
    palette: {
      background: '#0b1020',
      surface: '#111a33',
      surfaceAlt: '#162244',
      primary: '#22d3ee',
      accent: '#3b82f6',
      text: '#e2e8f0',
      textMuted: '#7d8aa8',
      border: 'rgba(34,211,238,0.16)',
    },
    typography: {
      headingFont: "'Space Grotesk', 'Segoe UI', sans-serif",
      bodyFont: "'Inter', 'Segoe UI', sans-serif",
      headingWeight: 700,
      headingSize: 'clamp(38px, 5.5vw, 56px)',
      bodySize: '16px',
      letterSpacing: '0em',
    },
    button: {
      radius: '8px',
      background: '#22d3ee',
      color: '#0b1020',
      border: '1px solid rgba(34,211,238,0.5)',
      boxShadow: '0 14px 44px rgba(34,211,238,0.3)',
      padding: '13px 20px',
    },
    card: {
      radius: '12px',
      background: 'rgba(17,26,51,0.8)',
      border: '1px solid rgba(34,211,238,0.14)',
      boxShadow: '0 18px 48px rgba(0,0,0,0.35)',
      padding: '24px',
    },
    background: 'radial-gradient(circle at 60% 30%, rgba(34,211,238,0.12), transparent 55%), radial-gradient(circle at 20% 80%, rgba(59,130,246,0.12), transparent 55%), #0b1020',
    effectIntensity: 'medium',
    animations: { easing: 'cubic-bezier(0.16,1,0.3,1)', durationMs: 600, hoverLift: true, scrollReveal: true },
    spacing: 'normal',
    cursor: { iconIndex: 0, effect: 'trail', color: '#22d3ee' },
    suggestedEffects: [
      { type: 'webglHeroScene', intensity: 0.8 },
      { type: 'gridFloor3D', intensity: 0.6 },
      { type: 'scrollReveal', intensity: 0.6 },
    ],
  },
  {
    id: 'nature-3d',
    name: 'Nature 3D',
    description: 'Orgânico com luz suave e partículas leves.',
    swatch: ['#0c1410', '#34d399', '#a3e635', '#ecfdf5'],
    palette: {
      background: '#0c1410',
      surface: '#101d16',
      surfaceAlt: '#14241b',
      primary: '#34d399',
      accent: '#a3e635',
      text: '#ecfdf5',
      textMuted: '#6b8a78',
      border: 'rgba(52,211,153,0.18)',
    },
    typography: {
      headingFont: "'Inter', 'Segoe UI', sans-serif",
      bodyFont: "'Inter', 'Segoe UI', sans-serif",
      headingWeight: 600,
      headingSize: 'clamp(38px, 5.5vw, 56px)',
      bodySize: '16px',
      letterSpacing: '0em',
    },
    button: {
      radius: '999px',
      background: '#34d399',
      color: '#06231b',
      border: '1px solid rgba(52,211,153,0.5)',
      boxShadow: '0 14px 44px rgba(52,211,153,0.28)',
      padding: '13px 22px',
    },
    card: {
      radius: '14px',
      background: 'rgba(16,29,22,0.8)',
      border: '1px solid rgba(52,211,153,0.16)',
      boxShadow: '0 18px 48px rgba(0,0,0,0.3)',
      padding: '24px',
    },
    background: 'radial-gradient(circle at 50% 0%, rgba(52,211,153,0.12), transparent 55%), #0c1410',
    effectIntensity: 'medium',
    animations: { easing: 'cubic-bezier(0.33,1,0.68,1)', durationMs: 700, hoverLift: true, scrollReveal: true },
    spacing: 'normal',
    cursor: { iconIndex: 0, effect: 'snowfall', color: '#34d399' },
    suggestedEffects: [
      { type: 'floatingOrbs', intensity: 0.7 },
      { type: 'particleField', intensity: 0.4 },
    ],
  },
  {
    id: 'education-lab',
    name: 'Education Lab',
    description: 'Educacional interativo com grid e clareza.',
    swatch: ['#0a0f1c', '#38bdf8', '#facc15', '#f1f5f9'],
    palette: {
      background: '#0a0f1c',
      surface: '#0f172a',
      surfaceAlt: '#172033',
      primary: '#38bdf8',
      accent: '#facc15',
      text: '#f1f5f9',
      textMuted: '#8595b3',
      border: 'rgba(56,189,248,0.18)',
    },
    typography: {
      headingFont: "'Space Grotesk', 'Segoe UI', sans-serif",
      bodyFont: "'Inter', 'Segoe UI', sans-serif",
      headingWeight: 700,
      headingSize: 'clamp(36px, 5vw, 52px)',
      bodySize: '16px',
      letterSpacing: '0em',
    },
    button: {
      radius: '8px',
      background: '#38bdf8',
      color: '#0a0f1c',
      border: '1px solid rgba(56,189,248,0.5)',
      boxShadow: '0 12px 36px rgba(56,189,248,0.25)',
      padding: '12px 20px',
    },
    card: {
      radius: '12px',
      background: 'rgba(15,23,42,0.85)',
      border: '1px solid rgba(56,189,248,0.14)',
      boxShadow: '0 16px 44px rgba(0,0,0,0.32)',
      padding: '22px',
    },
    background: 'radial-gradient(circle at 30% 20%, rgba(56,189,248,0.12), transparent 55%), #0a0f1c',
    effectIntensity: 'medium',
    animations: { easing: 'cubic-bezier(0.16,1,0.3,1)', durationMs: 550, hoverLift: true, scrollReveal: true },
    spacing: 'normal',
    cursor: { iconIndex: 0, effect: 'trail', color: '#38bdf8' },
    suggestedEffects: [
      { type: 'gridFloor3D', intensity: 0.5 },
      { type: 'animatedStars', intensity: 0.5 },
    ],
  },
  {
    id: 'luxury-product',
    name: 'Luxury Product',
    description: 'Produto premium com cena 3D integrada.',
    swatch: ['#08070a', '#d4af37', '#e5e4e2', '#1a181f'],
    palette: {
      background: '#08070a',
      surface: '#100e14',
      surfaceAlt: '#16131c',
      primary: '#d4af37',
      accent: '#e5e4e2',
      text: '#f4f3f0',
      textMuted: '#8a8794',
      border: 'rgba(212,175,55,0.2)',
    },
    typography: {
      headingFont: "'Playfair Display', Georgia, serif",
      bodyFont: "'Inter', 'Segoe UI', sans-serif",
      headingWeight: 600,
      headingSize: 'clamp(40px, 6vw, 62px)',
      bodySize: '17px',
      letterSpacing: '0.01em',
    },
    button: {
      radius: '4px',
      background: '#d4af37',
      color: '#08070a',
      border: '1px solid rgba(212,175,55,0.5)',
      boxShadow: '0 14px 44px rgba(212,175,55,0.3)',
      padding: '13px 22px',
    },
    card: {
      radius: '10px',
      background: 'rgba(16,14,20,0.85)',
      border: '1px solid rgba(212,175,55,0.16)',
      boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      padding: '28px',
    },
    background: 'radial-gradient(circle at 50% 0%, rgba(212,175,55,0.12), transparent 55%), #08070a',
    effectIntensity: 'medium',
    animations: { easing: 'cubic-bezier(0.22,1,0.36,1)', durationMs: 750, hoverLift: true, scrollReveal: true },
    spacing: 'relaxed',
    cursor: { iconIndex: 0, effect: 'sparkle', color: '#d4af37' },
    suggestedEffects: [
      { type: 'webglHeroScene', intensity: 0.9 },
      { type: 'lightBeams', intensity: 0.5 },
    ],
  },
  {
    id: 'game-landing',
    name: 'Game Landing',
    description: 'Evento/game com luz, movimento e energia.',
    swatch: ['#0a0612', '#f43f5e', '#8b5cf6', '#fb7185'],
    palette: {
      background: '#0a0612',
      surface: '#150c20',
      surfaceAlt: '#1d122c',
      primary: '#f43f5e',
      accent: '#8b5cf6',
      text: '#fff1f2',
      textMuted: '#9d8aa3',
      border: 'rgba(244,63,94,0.22)',
    },
    typography: {
      headingFont: "'Space Grotesk', 'Segoe UI', sans-serif",
      bodyFont: "'Inter', 'Segoe UI', sans-serif",
      headingWeight: 800,
      headingSize: 'clamp(42px, 6.5vw, 68px)',
      bodySize: '16px',
      letterSpacing: '0.02em',
    },
    button: {
      radius: '6px',
      background: 'linear-gradient(135deg, #f43f5e, #8b5cf6)',
      color: '#0a0612',
      border: '1px solid rgba(244,63,94,0.5)',
      boxShadow: '0 14px 44px rgba(244,63,94,0.4)',
      padding: '14px 24px',
    },
    card: {
      radius: '12px',
      background: 'rgba(21,12,32,0.85)',
      border: '1px solid rgba(244,63,94,0.18)',
      boxShadow: '0 20px 54px rgba(0,0,0,0.4)',
      padding: '24px',
    },
    background: 'radial-gradient(circle at 20% 80%, rgba(244,63,94,0.16), transparent 50%), radial-gradient(circle at 80% 20%, rgba(139,92,246,0.16), transparent 50%), #0a0612',
    effectIntensity: 'high',
    animations: { easing: 'cubic-bezier(0.16,1,0.3,1)', durationMs: 550, hoverLift: true, scrollReveal: true },
    spacing: 'normal',
    cursor: { iconIndex: 0, effect: 'fireworks', color: '#f43f5e' },
    suggestedEffects: [
      { type: 'particleField', intensity: 1 },
      { type: 'lightBeams', intensity: 0.7 },
      { type: 'animatedStars', intensity: 0.7 },
    ],
  },
  {
    id: 'power-ai',
    name: 'Power AI',
    description: 'AI futurista com gradiente, glass navbar e vídeo de fundo.',
    swatch: ['#05060a', '#f472b6', '#a855f7', '#e0e7ff'],
    palette: {
      background: '#05060a',
      surface: '#0e0e14',
      surfaceAlt: '#16161f',
      primary: '#f472b6',
      accent: '#a855f7',
      text: '#f1f5f9',
      textMuted: '#8b8fa3',
      border: 'rgba(244,114,182,0.2)',
    },
    typography: {
      headingFont: "'General Sans', 'Space Grotesk', sans-serif",
      bodyFont: "'Geist Sans', 'Inter', sans-serif",
      headingWeight: 700,
      headingSize: 'clamp(42px, 7vw, 80px)',
      bodySize: '17px',
      letterSpacing: '-0.015em',
    },
    button: {
      radius: '12px',
      background: 'linear-gradient(135deg, #f472b6, #a855f7)',
      color: '#ffffff',
      border: '1px solid rgba(244,114,182,0.4)',
      boxShadow: '0 14px 44px rgba(244,114,182,0.35)',
      padding: '14px 24px',
    },
    card: {
      radius: '16px',
      background: 'rgba(14,14,20,0.7)',
      border: '1px solid rgba(244,114,182,0.14)',
      boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
      padding: '26px',
    },
    background: 'radial-gradient(circle at 30% 10%, rgba(244,114,182,0.12), transparent 50%), radial-gradient(circle at 70% 80%, rgba(168,85,247,0.1), transparent 50%), #05060a',
    effectIntensity: 'high',
    animations: { easing: 'cubic-bezier(0.16,1,0.3,1)', durationMs: 600, hoverLift: true, scrollReveal: true },
    spacing: 'normal',
    cursor: { iconIndex: 0, effect: 'neonGlow', color: '#f472b6' },
    suggestedEffects: [
      { type: 'shaderBackground', intensity: 0.9 },
      { type: 'particleField', intensity: 0.7 },
      { type: 'customCursor', intensity: 0.5 },
    ],
  },
  {
    id: 'taskly',
    name: 'Taskly',
    description: 'Landing de produtividade limpa com glass UI e gradientes azuis.',
    swatch: ['#ffffff', '#3b82f6', '#e0f2fe', '#1e293b'],
    palette: {
      background: '#ffffff',
      surface: '#f8fafc',
      surfaceAlt: '#f1f5f9',
      primary: '#3b82f6',
      accent: '#6366f1',
      text: '#0f172a',
      textMuted: '#64748b',
      border: 'rgba(59,130,246,0.14)',
    },
    typography: {
      headingFont: "'Fustat', 'Inter', sans-serif",
      bodyFont: "'Inter', 'Segoe UI', sans-serif",
      headingWeight: 700,
      headingSize: 'clamp(38px, 6vw, 60px)',
      bodySize: '16px',
      letterSpacing: '-0.01em',
    },
    button: {
      radius: '999px',
      background: '#3b82f6',
      color: '#ffffff',
      border: '1px solid rgba(59,130,246,0.5)',
      boxShadow: '0 12px 40px rgba(59,130,246,0.3)',
      padding: '14px 26px',
    },
    card: {
      radius: '20px',
      background: 'rgba(255,255,255,0.7)',
      border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 18px 50px rgba(0,0,0,0.06)',
      padding: '24px',
    },
    background: 'radial-gradient(circle at 80% 20%, rgba(59,130,246,0.08), transparent 50%), radial-gradient(circle at 20% 80%, rgba(99,102,241,0.06), transparent 50%), #ffffff',
    effectIntensity: 'low',
    animations: { easing: 'cubic-bezier(0.22,1,0.36,1)', durationMs: 700, hoverLift: true, scrollReveal: true },
    spacing: 'normal',
    cursor: { iconIndex: 0, effect: 'trail', color: '#3b82f6' },
    suggestedEffects: [
      { type: 'gradientMesh', intensity: 0.4 },
      { type: 'scrollReveal', intensity: 0.7 },
    ],
  },
  {
    id: 'vanguard',
    name: 'Vanguard',
    description: 'Luxo escuro com tipografia bold e vídeo hero.',
    swatch: ['#000000', '#ffffff', '#e2e8f0', '#1a1a2e'],
    palette: {
      background: '#000000',
      surface: '#0d0d0d',
      surfaceAlt: '#141416',
      primary: '#ffffff',
      accent: '#64748b',
      text: '#ffffff',
      textMuted: '#9ca3af',
      border: 'rgba(255,255,255,0.08)',
    },
    typography: {
      headingFont: "'PODIUM Sharp', 'Space Grotesk', sans-serif",
      bodyFont: "'Inter', 'Segoe UI', sans-serif",
      headingWeight: 800,
      headingSize: 'clamp(44px, 7vw, 88px)',
      bodySize: '17px',
      letterSpacing: '0.04em',
    },
    button: {
      radius: '999px',
      background: '#ffffff',
      color: '#000000',
      border: '1px solid #ffffff',
      boxShadow: '0 0 40px rgba(255,255,255,0.12)',
      padding: '14px 28px',
    },
    card: {
      radius: '12px',
      background: 'rgba(13,13,13,0.85)',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      padding: '26px',
    },
    background: '#000000',
    effectIntensity: 'medium',
    animations: { easing: 'cubic-bezier(0.22,1,0.36,1)', durationMs: 700, hoverLift: true, scrollReveal: true },
    spacing: 'normal',
    cursor: { iconIndex: 0, effect: 'none', color: '#ffffff' },
    suggestedEffects: [
      { type: 'shaderBackground', intensity: 0.6 },
      { type: 'scrollReveal', intensity: 0.5 },
    ],
  },
  {
    id: 'lithos',
    name: 'Lithos',
    description: 'Temática geológica com spotlight revelador e serifa itálica.',
    swatch: ['#0c0806', '#d97706', '#fef3c7', '#1c1917'],
    palette: {
      background: '#0c0806',
      surface: '#14100e',
      surfaceAlt: '#1c1814',
      primary: '#d97706',
      accent: '#fef3c7',
      text: '#faf5f0',
      textMuted: '#a39382',
      border: 'rgba(217,119,6,0.2)',
    },
    typography: {
      headingFont: "'Playfair Display', Georgia, serif",
      bodyFont: "'Inter', 'Segoe UI', sans-serif",
      headingWeight: 600,
      headingSize: 'clamp(40px, 6vw, 64px)',
      bodySize: '17px',
      letterSpacing: '0.02em',
    },
    button: {
      radius: '6px',
      background: '#d97706',
      color: '#0c0806',
      border: '1px solid rgba(217,119,6,0.5)',
      boxShadow: '0 14px 44px rgba(217,119,6,0.3)',
      padding: '13px 24px',
    },
    card: {
      radius: '10px',
      background: 'rgba(20,16,14,0.85)',
      border: '1px solid rgba(217,119,6,0.14)',
      boxShadow: '0 22px 60px rgba(0,0,0,0.45)',
      padding: '24px',
    },
    background: 'radial-gradient(circle at 50% 30%, rgba(217,119,6,0.08), transparent 55%), #0c0806',
    effectIntensity: 'medium',
    animations: { easing: 'cubic-bezier(0.33,1,0.68,1)', durationMs: 800, hoverLift: true, scrollReveal: true },
    spacing: 'relaxed',
    cursor: { iconIndex: 0, effect: 'sparkle', color: '#d97706' },
    suggestedEffects: [
      { type: 'parallaxLayer', intensity: 0.6 },
      { type: 'scrollReveal', intensity: 0.7 },
      { type: 'customCursor', intensity: 0.5 },
    ],
  },
  {
    id: 'institutional-modern',
    name: 'Institutional Modern',
    description: 'Institucional moderno e confiável.',
    swatch: ['#0f1115', '#2563eb', '#10b981', '#f1f5f9'],
    palette: {
      background: '#0f1115',
      surface: '#161a21',
      surfaceAlt: '#1c212b',
      primary: '#2563eb',
      accent: '#10b981',
      text: '#f1f5f9',
      textMuted: '#7d8a9d',
      border: 'rgba(37,99,235,0.16)',
    },
    typography: {
      headingFont: "'Inter', 'Segoe UI', sans-serif",
      bodyFont: "'Inter', 'Segoe UI', sans-serif",
      headingWeight: 700,
      headingSize: 'clamp(36px, 5vw, 52px)',
      bodySize: '16px',
      letterSpacing: '0em',
    },
    button: {
      radius: '8px',
      background: '#2563eb',
      color: '#ffffff',
      border: '1px solid rgba(37,99,235,0.5)',
      boxShadow: '0 12px 36px rgba(37,99,235,0.28)',
      padding: '13px 20px',
    },
    card: {
      radius: '12px',
      background: 'rgba(22,26,33,0.85)',
      border: '1px solid rgba(255,255,255,0.07)',
      boxShadow: '0 16px 44px rgba(0,0,0,0.3)',
      padding: '24px',
    },
    background: 'radial-gradient(circle at 60% 20%, rgba(37,99,235,0.12), transparent 55%), #0f1115',
    effectIntensity: 'low',
    animations: { easing: 'cubic-bezier(0.22,1,0.36,1)', durationMs: 600, hoverLift: true, scrollReveal: true },
    spacing: 'normal',
    cursor: { iconIndex: 0, effect: 'trail', color: '#2563eb' },
    suggestedEffects: [
      { type: 'shaderBackground', intensity: 0.4 },
      { type: 'scrollReveal', intensity: 0.6 },
    ],
  },
];

export const getVisualPreset = (id: VisualPresetId): VisualPreset =>
  VISUAL_PRESETS.find((preset) => preset.id === id) ?? VISUAL_PRESETS[0];

export const intensityToScale = (intensity: EffectIntensity): number =>
  intensity === 'high' ? 1 : intensity === 'medium' ? 0.6 : 0.32;
