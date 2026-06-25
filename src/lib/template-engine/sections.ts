import { createPageNode, createResponsiveStyles } from '@/lib/page-builder/defaults';
import type { PageDocument, PageNode, PageStyle } from '@/lib/page-builder/types';
import { createDefaultEffect } from '@/lib/effects-system/registry';
import type { PageEffect } from '@/lib/effects-system/types';
import { intensityToScale, type VisualPreset } from './presets';

/**
 * Reusable section builders. Every template composes pages from these
 * builders so visual identity stays consistent and code is not duplicated.
 * Each builder accepts the active preset to theme colors, fonts and spacing.
 */

const spacingValue = (preset: VisualPreset): string =>
  preset.spacing === 'relaxed' ? 'clamp(64px, 9vw, 140px)' : preset.spacing === 'compact' ? 'clamp(40px, 5vw, 80px)' : 'clamp(56px, 8vw, 112px)';

export type HeroVariant = 'split' | 'centered' | 'background' | 'immersive';

export const buildNavbar = (preset: VisualPreset, brand: string, links: string[]): PageNode =>
  createPageNode('navbar', {
    name: 'Navbar',
    props: { brand, links },
    styles: createResponsiveStyles({
      width: '100%',
      minHeight: 72,
      padding: '18px clamp(20px, 4vw, 56px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: `${preset.palette.background}cc`,
      backdropFilter: 'blur(12px)',
      boxShadow: `inset 0 -1px 0 ${preset.palette.border}`,
      color: preset.palette.text,
      fontFamily: preset.typography.headingFont,
      zIndex: 20,
    }),
  });

export const buildHero = (
  preset: VisualPreset,
  opts: { variant: HeroVariant; title: string; subtitle: string; cta: string; ctaHref: string },
): PageNode => {
  const titleNode = createPageNode('text', {
    name: 'Hero Title',
    props: { text: opts.title, as: 'h1' },
    styles: createResponsiveStyles({
      maxWidth: 820,
      fontSize: preset.typography.headingSize,
      fontWeight: preset.typography.headingWeight,
      lineHeight: 1.02,
      letterSpacing: preset.typography.letterSpacing,
      color: preset.palette.text,
      fontFamily: preset.typography.headingFont,
    }, { fontSize: 'clamp(32px, 8vw, 44px)' }),
  });
  const subtitleNode = createPageNode('text', {
    name: 'Hero Subtitle',
    props: { text: opts.subtitle, as: 'p' },
    styles: createResponsiveStyles({
      maxWidth: 620,
      fontSize: preset.typography.bodySize,
      lineHeight: 1.65,
      color: preset.palette.textMuted,
      fontFamily: preset.typography.bodyFont,
    }),
  });
  const ctaNode = createPageNode('button', {
    name: 'Hero CTA',
    props: { label: opts.cta, href: opts.ctaHref },
    styles: createResponsiveStyles({
      width: 'fit-content',
      padding: preset.button.padding,
      borderRadius: preset.button.radius,
      background: preset.button.background,
      color: preset.button.color,
      border: preset.button.border,
      boxShadow: preset.button.boxShadow,
      fontFamily: preset.typography.bodyFont,
      fontWeight: 600,
    }),
  });
  const copyGroup = createPageNode('container', {
    name: 'Hero Copy',
    styles: createResponsiveStyles({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 20,
      maxWidth: 640,
      zIndex: 2,
    }),
    children: [titleNode, subtitleNode, ctaNode],
  });

  const heroBase: PageStyle = {
    width: '100%',
    minHeight: 720,
    padding: `${spacingValue(preset)} clamp(20px, 5vw, 72px)`,
    display: 'flex',
    alignItems: 'center',
    background: preset.background,
    color: preset.palette.text,
    overflow: 'hidden',
    position: 'relative' as const,
  };

  if (opts.variant === 'centered') {
    return createPageNode('section', {
      name: 'Hero Section',
      styles: createResponsiveStyles(heroBase as PageStyle, { minHeight: 640, padding: '48px 20px' }),
      children: [
        createPageNode('container', {
          name: 'Hero Centered',
          styles: createResponsiveStyles({
            maxWidth: 920,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 22,
            zIndex: 2,
          }),
          children: [
            createPageNode('text', { ...titleNode, styles: createResponsiveStyles({ ...titleNode.styles.base, textAlign: 'center' as const, maxWidth: 880 }) }),
            subtitleNode,
            ctaNode,
          ],
        }),
      ],
    });
  }

  if (opts.variant === 'background' || opts.variant === 'immersive') {
    const sceneCanvas = createPageNode('sceneCanvas', {
      name: 'Background Scene',
      props: { placement: 'background', interactive: opts.variant === 'immersive', transparent: true, linkedSceneId: 'current-scene' },
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
      }),
    });
    return createPageNode('section', {
      name: 'Hero Section',
      styles: createResponsiveStyles({ ...heroBase, minHeight: opts.variant === 'immersive' ? 880 : 680 }, { minHeight: 640, padding: '48px 20px' }),
      children: [sceneCanvas, copyGroup],
    });
  }

  // split (default)
  const sceneCanvas = createPageNode('sceneCanvas', {
    name: 'Hero Scene',
    props: { placement: 'side', interactive: true, transparent: true, linkedSceneId: 'current-scene' },
    styles: createResponsiveStyles({
      width: '100%',
      height: 520,
      minHeight: 360,
      borderRadius: 14,
      overflow: 'hidden',
      background: `radial-gradient(circle at 50% 35%, ${preset.palette.primary}22, ${preset.palette.background}55 55%, ${preset.palette.background})`,
    }, { height: 340 }),
  });
  return createPageNode('section', {
    name: 'Hero Section',
    styles: createResponsiveStyles(heroBase, { minHeight: 640, padding: '48px 20px' }),
    children: [
      createPageNode('container', {
        name: 'Hero Layout',
        styles: createResponsiveStyles({
          width: '100%',
          maxWidth: 1220,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          alignItems: 'center',
          gap: 36,
          zIndex: 2,
        }, { display: 'flex', flexDirection: 'column', gap: 28 }),
        children: [copyGroup, sceneCanvas],
      }),
    ],
  });
};

export const buildFeaturesGrid = (
  preset: VisualPreset,
  items: Array<{ title: string; body: string }>,
): PageNode =>
  createPageNode('section', {
    name: 'Features Section',
    styles: createResponsiveStyles({
      width: '100%',
      padding: `${spacingValue(preset)} clamp(20px, 5vw, 72px)`,
      background: preset.palette.background,
      color: preset.palette.text,
    }),
    children: [
      createPageNode('container', {
        name: 'Features Grid',
        styles: createResponsiveStyles({
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(items.length, 3)}, minmax(0, 1fr))`,
          gap: 20,
        }, { gridTemplateColumns: '1fr' }),
        children: items.map((item) =>
          createPageNode('card', {
            name: `${item.title} Card`,
            props: { title: item.title, body: item.body },
            styles: createResponsiveStyles({
              padding: preset.card.padding,
              borderRadius: preset.card.radius,
              background: preset.card.background,
              border: preset.card.border,
              boxShadow: preset.card.boxShadow,
              color: preset.palette.text,
              fontFamily: preset.typography.bodyFont,
            }),
          }),
        ),
      }),
    ],
  });

export const buildStatsRow = (
  preset: VisualPreset,
  stats: Array<{ value: string; label: string }>,
): PageNode =>
  createPageNode('section', {
    name: 'Stats Section',
    styles: createResponsiveStyles({
      width: '100%',
      padding: `clamp(40px, 6vw, 80px) clamp(20px, 5vw, 72px)`,
      background: preset.palette.surface,
      color: preset.palette.text,
    }),
    children: [
      createPageNode('container', {
        name: 'Stats Grid',
        styles: createResponsiveStyles({
          maxWidth: 1080,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))`,
          gap: 24,
        }, { gridTemplateColumns: 'repeat(2, 1fr)' }),
        children: stats.map((stat) =>
          createPageNode('container', {
            name: `${stat.label} Stat`,
            styles: createResponsiveStyles({ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', textAlign: 'center' }),
            children: [
              createPageNode('text', {
                name: 'Stat Value',
                props: { text: stat.value, as: 'div' },
                styles: createResponsiveStyles({
                  fontSize: 'clamp(32px, 5vw, 48px)',
                  fontWeight: 700,
                  color: preset.palette.primary,
                  fontFamily: preset.typography.headingFont,
                  lineHeight: 1,
                }),
              }),
              createPageNode('text', {
                name: 'Stat Label',
                props: { text: stat.label, as: 'div' },
                styles: createResponsiveStyles({
                  fontSize: '13px',
                  color: preset.palette.textMuted,
                  fontFamily: preset.typography.bodyFont,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase' as const,
                }),
              }),
            ],
          }),
        ),
      }),
    ],
  });

export const buildShowcase = (
  preset: VisualPreset,
  opts: { title: string; subtitle: string; height?: number },
): PageNode =>
  createPageNode('section', {
    name: 'Showcase Section',
    styles: createResponsiveStyles({
      width: '100%',
      padding: `${spacingValue(preset)} clamp(20px, 5vw, 72px)`,
      background: preset.palette.background,
      color: preset.palette.text,
    }),
    children: [
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
            props: { text: opts.title, as: 'h2' },
            styles: createResponsiveStyles({
              textAlign: 'center',
              maxWidth: 780,
              fontSize: 'clamp(30px, 4.5vw, 44px)',
              fontWeight: preset.typography.headingWeight,
              lineHeight: 1.05,
              color: preset.palette.text,
              fontFamily: preset.typography.headingFont,
            }),
          }),
          createPageNode('text', {
            name: 'Showcase Subtitle',
            props: { text: opts.subtitle, as: 'p' },
            styles: createResponsiveStyles({
              textAlign: 'center',
              maxWidth: 640,
              fontSize: preset.typography.bodySize,
              lineHeight: 1.6,
              color: preset.palette.textMuted,
              fontFamily: preset.typography.bodyFont,
            }),
          }),
          createPageNode('sceneCanvas', {
            name: 'Model Viewer',
            props: { placement: 'center', interactive: true, linkedSceneId: 'current-scene' },
            styles: createResponsiveStyles({
              width: '100%',
              height: opts.height ?? 520,
              borderRadius: 14,
              background: preset.palette.surface,
              overflow: 'hidden',
              border: `1px solid ${preset.palette.border}`,
            }, { height: 340 }),
          }),
        ],
      }),
    ],
  });

export const buildCTA = (
  preset: VisualPreset,
  opts: { title: string; body: string; cta: string; ctaHref: string },
): PageNode =>
  createPageNode('section', {
    name: 'CTA Section',
    styles: createResponsiveStyles({
      width: '100%',
      padding: `${spacingValue(preset)} clamp(20px, 5vw, 72px)`,
      background: `linear-gradient(135deg, ${preset.palette.primary}18, ${preset.palette.accent}14), ${preset.palette.background}`,
      color: preset.palette.text,
    }),
    children: [
      createPageNode('container', {
        name: 'CTA Layout',
        styles: createResponsiveStyles({
          maxWidth: 880,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 20,
        }),
        children: [
          createPageNode('text', {
            name: 'CTA Title',
            props: { text: opts.title, as: 'h2' },
            styles: createResponsiveStyles({
              maxWidth: 680,
              fontSize: 'clamp(30px, 4.5vw, 44px)',
              fontWeight: preset.typography.headingWeight,
              lineHeight: 1.05,
              color: preset.palette.text,
              fontFamily: preset.typography.headingFont,
            }),
          }),
          createPageNode('text', {
            name: 'CTA Body',
            props: { text: opts.body, as: 'p' },
            styles: createResponsiveStyles({
              maxWidth: 560,
              fontSize: preset.typography.bodySize,
              lineHeight: 1.6,
              color: preset.palette.textMuted,
              fontFamily: preset.typography.bodyFont,
            }),
          }),
          createPageNode('button', {
            name: 'CTA Button',
            props: { label: opts.cta, href: opts.ctaHref },
            styles: createResponsiveStyles({
              width: 'fit-content',
              padding: preset.button.padding,
              borderRadius: preset.button.radius,
              background: preset.button.background,
              color: preset.button.color,
              border: preset.button.border,
              boxShadow: preset.button.boxShadow,
              fontFamily: preset.typography.bodyFont,
              fontWeight: 600,
            }),
          }),
        ],
      }),
    ],
  });

export const buildFooter = (preset: VisualPreset, text: string): PageNode =>
  createPageNode('footer', {
    name: 'Footer',
    props: { text },
    styles: createResponsiveStyles({
      width: '100%',
      padding: '28px clamp(20px, 5vw, 72px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: preset.palette.background,
      borderTop: `1px solid ${preset.palette.border}`,
      color: preset.palette.textMuted,
      fontFamily: preset.typography.bodyFont,
    }, { flexDirection: 'column', gap: 12, alignItems: 'flex-start' }),
  });

export const buildDefaultProjectPage = (preset: VisualPreset, brand: string): PageNode[] => [
  buildNavbar(preset, brand, ['Produto', 'Experiencia', 'Contato']),
  buildHero(preset, {
    variant: 'split',
    title: 'Crie sites 3D que respondem ao usuario',
    subtitle: 'Monte a cena, posicione ela na pagina e conecte HTML com WebGL usando interacoes visuais.',
    cta: 'Explorar',
    ctaHref: '#features',
  }),
  buildFeaturesGrid(preset, [
    { title: 'Performance', body: 'Efeitos reais com controle de FPS, degradacao automatica e fallback sem WebGL.' },
    { title: 'Interacao', body: 'Conecte elementos HTML a objetos, luzes e camera da cena 3D.' },
    { title: 'Exportacao', body: 'Exporte para Next, React, Vite ou HTML/CSS/JS com assets organizados.' },
  ]),
  buildCTA(preset, {
    title: 'Pronto para publicar?',
    body: 'Teste no Preview, ajuste a responsividade e exporte o projeto completo.',
    cta: 'Comecar agora',
    ctaHref: '#export',
  }),
  buildFooter(preset, `© 2026 ${brand}`),
];

/**
 * Re-skins an existing page tree with a preset's design tokens
 * (palette, typography, button/card/section styles) WITHOUT removing
 * user content. Returns a new children array.
 */
const mergeStyle = (base: PageStyle, patch: PageStyle): PageStyle => ({ ...base, ...patch });

const reSkinNode = (node: PageNode, preset: VisualPreset): PageNode => {
  const base = node.styles.base;
  let nextBase: PageStyle = base;
  const headingFont = preset.typography.headingFont;
  const bodyFont = preset.typography.bodyFont;

  if (node.type === 'navbar') {
    nextBase = mergeStyle(base, {
      background: `${preset.palette.background}cc`,
      color: preset.palette.text,
      fontFamily: headingFont,
      boxShadow: `inset 0 -1px 0 ${preset.palette.border}`,
    });
  } else if (node.type === 'section') {
    nextBase = mergeStyle(base, { background: preset.palette.background, color: preset.palette.text });
  } else if (node.type === 'footer') {
    nextBase = mergeStyle(base, {
      background: preset.palette.background,
      color: preset.palette.textMuted,
      fontFamily: bodyFont,
      borderTop: `1px solid ${preset.palette.border}`,
    });
  } else if (node.type === 'button') {
    nextBase = mergeStyle(base, {
      background: preset.button.background,
      color: preset.button.color,
      border: preset.button.border,
      borderRadius: preset.button.radius,
      boxShadow: preset.button.boxShadow,
      padding: preset.button.padding,
      fontFamily: bodyFont,
    });
  } else if (node.type === 'card') {
    nextBase = mergeStyle(base, {
      background: preset.card.background,
      border: preset.card.border,
      borderRadius: preset.card.radius,
      boxShadow: preset.card.boxShadow,
      color: preset.palette.text,
      fontFamily: bodyFont,
    });
  } else if (node.type === 'text') {
    const isHeading = node.props.as === 'h1' || node.props.as === 'h2' || node.props.as === 'h3';
    nextBase = mergeStyle(base, {
      color: isHeading ? preset.palette.text : preset.palette.textMuted,
      fontFamily: isHeading ? headingFont : bodyFont,
    });
  }

  const nextChildren = node.children?.map((child) => reSkinNode(child, preset));
  return { ...node, styles: { ...node.styles, base: nextBase }, children: nextChildren };
};

export const applyPresetToPage = (page: PageDocument, preset: VisualPreset): PageDocument => {
  const children = page.children.map((node) => reSkinNode(node, preset));
  const effects = page.effects
    ? { ...page.effects, presetId: preset.id, intensity: intensityToScale(preset.effectIntensity) }
    : {
        version: 1,
        items: preset.suggestedEffects.map((s, i) =>
          createDefaultEffect(s.type as PageEffect['type'], 'page', { zIndex: i }),
        ),
        presetId: preset.id,
        intensity: intensityToScale(preset.effectIntensity),
      };
  return { ...page, children, effects };
};
