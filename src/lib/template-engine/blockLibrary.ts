/**
 * Block Library — ready-to-insert page blocks (sections) and styled atomic
 * components. Every block is themed by the project's current visual preset so
 * inserted content stays visually consistent with the rest of the page.
 *
 * Blocks are inserted into the current page (NOT replacing it, unlike
 * templates). Each builder returns a fresh PageNode tree with new IDs.
 */
import { createPageNode, createResponsiveStyles } from '@/lib/page-builder/defaults';
import type { PageNode } from '@/lib/page-builder/types';
import { createId } from '@/store/types';
import {
  buildCTA,
  buildFeaturesGrid,
  buildFooter,
  buildHero,
  buildNavbar,
  buildShowcase,
  buildStatsRow,
  type HeroVariant,
} from './sections';
import { getVisualPreset, type VisualPreset, type VisualPresetId } from './presets';

export type BlockCategory = 'hero' | 'sections' | 'content' | 'forms' | 'atomic';

export type BlockDefinition = {
  id: string;
  name: string;
  description: string;
  category: BlockCategory;
  /** Tags used by the search box. */
  keywords: string[];
  /** Swatch colors used by the gallery preview (palette-derived). */
  swatch?: string[];
  /** Builds a fresh node tree themed by the given preset. */
  build: (preset: VisualPreset) => PageNode;
};

/* ----------------------------------------------------------------- New builders */

const buildTestimonials = (preset: VisualPreset): PageNode => {
  const items = [
    { quote: 'A experiência 3D transformou nossa apresentação de produto.', author: 'Ana Souza', role: 'Head de Produto' },
    { quote: 'Conseguimos contar nossa história de forma imersiva e rápida.', author: 'Carlos Lima', role: 'Diretor Criativo' },
    { quote: 'O build exportou limpo e performou bem no mobile.', author: 'Júlia Reis', role: 'Frontend Lead' },
  ];
  return createPageNode('section', {
    name: 'Testimonials Section',
    styles: createResponsiveStyles({
      width: '100%',
      padding: 'clamp(56px, 8vw, 112px) clamp(20px, 5vw, 72px)',
      background: preset.palette.surface,
      color: preset.palette.text,
    }),
    children: [
      createPageNode('text', {
        name: 'Testimonials Heading',
        props: { text: 'O que dizem sobre nós', as: 'h2' },
        styles: createResponsiveStyles({
          maxWidth: 640,
          margin: '0 auto 40px',
          textAlign: 'center',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: preset.typography.headingWeight,
          color: preset.palette.text,
          fontFamily: preset.typography.headingFont,
        }),
      }),
      createPageNode('container', {
        name: 'Testimonials Grid',
        styles: createResponsiveStyles({
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: 20,
        }, { gridTemplateColumns: '1fr' }),
        children: items.map((item) =>
          createPageNode('card', {
            name: `${item.author} Testimonial`,
            props: { title: item.quote, body: `${item.author} · ${item.role}` },
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
};

const buildPricing = (preset: VisualPreset): PageNode => {
  const plans = [
    { name: 'Starter', price: 'R$ 0', period: '/mês', body: '1 projeto, cena 3D básica, export HTML.' },
    { name: 'Pro', price: 'R$ 49', period: '/mês', body: 'Projetos ilimitados, interações, export Next/Vite.', featured: true },
    { name: 'Studio', price: 'R$ 149', period: '/mês', body: 'Colaboração, assets premium, white-label.' },
  ];
  return createPageNode('section', {
    name: 'Pricing Section',
    styles: createResponsiveStyles({
      width: '100%',
      padding: 'clamp(56px, 8vw, 112px) clamp(20px, 5vw, 72px)',
      background: preset.palette.background,
      color: preset.palette.text,
    }),
    children: [
      createPageNode('text', {
        name: 'Pricing Heading',
        props: { text: 'Planos simples e diretos', as: 'h2' },
        styles: createResponsiveStyles({
          maxWidth: 640,
          margin: '0 auto 40px',
          textAlign: 'center',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: preset.typography.headingWeight,
          color: preset.palette.text,
          fontFamily: preset.typography.headingFont,
        }),
      }),
      createPageNode('container', {
        name: 'Pricing Grid',
        styles: createResponsiveStyles({
          maxWidth: 1080,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
          gap: 20,
          alignItems: 'stretch',
        }, { gridTemplateColumns: '1fr' }),
        children: plans.map((plan) =>
          createPageNode('card', {
            name: `${plan.name} Plan`,
            props: { title: plan.name, body: plan.body },
            styles: createResponsiveStyles({
              padding: 26,
              borderRadius: preset.card.radius,
              background: plan.featured ? `${preset.palette.primary}14` : preset.card.background,
              border: plan.featured ? `1px solid ${preset.palette.primary}80` : preset.card.border,
              boxShadow: plan.featured ? `0 24px 60px ${preset.palette.primary}30` : preset.card.boxShadow,
              color: preset.palette.text,
              fontFamily: preset.typography.bodyFont,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }),
            children: [
              createPageNode('text', {
                name: `${plan.name} Price`,
                props: { text: plan.price, as: 'div' },
                styles: createResponsiveStyles({
                  fontSize: 34,
                  fontWeight: 700,
                  color: preset.palette.primary,
                  fontFamily: preset.typography.headingFont,
                }),
              }),
              createPageNode('text', {
                name: `${plan.name} Period`,
                props: { text: plan.period, as: 'span' },
                styles: createResponsiveStyles({ fontSize: 13, color: preset.palette.textMuted }),
              }),
              createPageNode('button', {
                name: `${plan.name} CTA`,
                props: { label: plan.featured ? 'Começar' : 'Saiba mais', href: '#' },
                styles: createResponsiveStyles({
                  width: '100%',
                  padding: preset.button.padding,
                  borderRadius: preset.button.radius,
                  background: plan.featured ? preset.button.background : 'transparent',
                  color: plan.featured ? preset.button.color : preset.palette.text,
                  border: plan.featured ? preset.button.border : `1px solid ${preset.palette.border}`,
                  fontFamily: preset.typography.bodyFont,
                  fontWeight: 600,
                }),
              }),
            ],
          }),
        ),
      }),
    ],
  });
};

const buildFAQ = (preset: VisualPreset): PageNode => {
  const faqs = [
    { q: 'Preciso saber Three.js?', a: 'Não. O editor monta a cena visualmente e exporta o runtime pronto.' },
    { q: 'Funciona no mobile?', a: 'Sim. Use os breakpoints e o Preview para validar em cada dispositivo.' },
    { q: 'Posso exportar para Next.js?', a: 'Sim, além de React, Vite e HTML/CSS/JS puro com assets organizados.' },
    { q: 'Como funcionam as interações?', a: 'Conecte elementos HTML a objetos, luzes e câmera via o modo Interações.' },
  ];
  return createPageNode('section', {
    name: 'FAQ Section',
    styles: createResponsiveStyles({
      width: '100%',
      padding: 'clamp(56px, 8vw, 112px) clamp(20px, 5vw, 72px)',
      background: preset.palette.surface,
      color: preset.palette.text,
    }),
    children: [
      createPageNode('text', {
        name: 'FAQ Heading',
        props: { text: 'Perguntas frequentes', as: 'h2' },
        styles: createResponsiveStyles({
          maxWidth: 640,
          margin: '0 auto 40px',
          textAlign: 'center',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: preset.typography.headingWeight,
          color: preset.palette.text,
          fontFamily: preset.typography.headingFont,
        }),
      }),
      createPageNode('container', {
        name: 'FAQ List',
        styles: createResponsiveStyles({
          maxWidth: 760,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }),
        children: faqs.map((faq, i) =>
          createPageNode('card', {
            name: `FAQ ${i + 1}`,
            props: { title: faq.q, body: faq.a },
            styles: createResponsiveStyles({
              padding: 20,
              borderRadius: preset.card.radius,
              background: preset.card.background,
              border: preset.card.border,
              color: preset.palette.text,
              fontFamily: preset.typography.bodyFont,
            }),
          }),
        ),
      }),
    ],
  });
};

const buildGallery = (preset: VisualPreset): PageNode => {
  const images = [
    {
      src: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80',
      alt: 'Studio workspace with warm light',
    },
    {
      src: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80',
      alt: 'Architectural geometric facade',
    },
    {
      src: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
      alt: 'Interface design on laptop',
    },
    {
      src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
      alt: 'Premium interior scene',
    },
    {
      src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80',
      alt: 'Modern building exterior',
    },
    {
      src: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80',
      alt: 'Landscape with atmospheric depth',
    },
  ];

  return createPageNode('section', {
    name: 'Gallery Section',
    styles: createResponsiveStyles({
      width: '100%',
      padding: 'clamp(56px, 8vw, 112px) clamp(20px, 5vw, 72px)',
      background: preset.palette.background,
      color: preset.palette.text,
    }),
    children: [
      createPageNode('text', {
        name: 'Gallery Heading',
        props: { text: 'Galeria', as: 'h2' },
        styles: createResponsiveStyles({
          maxWidth: 640,
          margin: '0 auto 36px',
          textAlign: 'center',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: preset.typography.headingWeight,
          color: preset.palette.text,
          fontFamily: preset.typography.headingFont,
        }),
      }),
      createPageNode('container', {
        name: 'Gallery Grid',
        styles: createResponsiveStyles({
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          gap: 16,
        }, { gridTemplateColumns: 'repeat(2, 1fr)' }),
        children: images.map((image, i) =>
          createPageNode('image', {
            name: `Gallery Image ${i + 1}`,
            props: { src: image.src, alt: image.alt },
            styles: createResponsiveStyles({
              width: '100%',
              minHeight: 220,
              borderRadius: 12,
              objectFit: 'cover',
              background: `linear-gradient(135deg, ${preset.palette.surfaceAlt}, ${preset.palette.surface})`,
              border: `1px solid ${preset.palette.border}`,
              overflow: 'hidden',
            }),
          }),
        ),
      }),
    ],
  });
};

const buildContactForm = (preset: VisualPreset): PageNode =>
  createPageNode('section', {
    name: 'Contact Section',
    styles: createResponsiveStyles({
      width: '100%',
      padding: 'clamp(56px, 8vw, 112px) clamp(20px, 5vw, 72px)',
      background: preset.palette.surface,
      color: preset.palette.text,
    }),
    children: [
      createPageNode('container', {
        name: 'Contact Layout',
        styles: createResponsiveStyles({
          maxWidth: 760,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
          alignItems: 'center',
        }),
        children: [
          createPageNode('text', {
            name: 'Contact Heading',
            props: { text: 'Fale conosco', as: 'h2' },
            styles: createResponsiveStyles({
              textAlign: 'center',
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: preset.typography.headingWeight,
              color: preset.palette.text,
              fontFamily: preset.typography.headingFont,
            }),
          }),
          createPageNode('form', {
            name: 'Contact Form',
            props: { name: 'contact-form', action: '#', method: 'POST' },
            styles: createResponsiveStyles({
              width: '100%',
              maxWidth: 560,
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              borderRadius: 14,
              background: preset.card.background,
              border: preset.card.border,
            }),
            children: [
              createPageNode('input', {
                name: 'Name Field',
                props: { name: 'name', label: 'Nome', placeholder: 'Seu nome', type: 'text', required: true },
                styles: createResponsiveStyles({
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `1px solid ${preset.palette.border}`,
                  background: preset.palette.background,
                  color: preset.palette.text,
                  fontSize: 14,
                }),
              }),
              createPageNode('input', {
                name: 'Email Field',
                props: { name: 'email', label: 'E-mail', placeholder: 'vo@exemplo.com', type: 'email', required: true },
                styles: createResponsiveStyles({
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `1px solid ${preset.palette.border}`,
                  background: preset.palette.background,
                  color: preset.palette.text,
                  fontSize: 14,
                }),
              }),
              createPageNode('textarea', {
                name: 'Message Field',
                props: { name: 'message', label: 'Mensagem', placeholder: 'Como podemos ajudar?', rows: 4 },
                styles: createResponsiveStyles({
                  width: '100%',
                  minHeight: 120,
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `1px solid ${preset.palette.border}`,
                  background: preset.palette.background,
                  color: preset.palette.text,
                  fontSize: 14,
                }),
              }),
              createPageNode('button', {
                name: 'Submit Button',
                props: { label: 'Enviar mensagem', href: '#' },
                styles: createResponsiveStyles({
                  width: '100%',
                  padding: preset.button.padding,
                  borderRadius: preset.button.radius,
                  background: preset.button.background,
                  color: preset.button.color,
                  border: preset.button.border,
                  fontFamily: preset.typography.bodyFont,
                  fontWeight: 600,
                }),
              }),
            ],
          }),
        ],
      }),
    ],
  });

const buildNewsletter = (preset: VisualPreset): PageNode =>
  createPageNode('section', {
    name: 'Newsletter Section',
    styles: createResponsiveStyles({
      width: '100%',
      padding: 'clamp(48px, 7vw, 96px) clamp(20px, 5vw, 72px)',
      background: `linear-gradient(135deg, ${preset.palette.primary}18, ${preset.palette.accent}14), ${preset.palette.background}`,
      color: preset.palette.text,
    }),
    children: [
      createPageNode('container', {
        name: 'Newsletter Layout',
        styles: createResponsiveStyles({
          maxWidth: 720,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 18,
        }),
        children: [
          createPageNode('text', {
            name: 'Newsletter Heading',
            props: { text: 'Receba novidades 3D', as: 'h2' },
            styles: createResponsiveStyles({
              fontSize: 'clamp(26px, 4vw, 36px)',
              fontWeight: preset.typography.headingWeight,
              color: preset.palette.text,
              fontFamily: preset.typography.headingFont,
            }),
          }),
          createPageNode('text', {
            name: 'Newsletter Subtitle',
            props: { text: 'Updates mensais, sem spam.', as: 'p' },
            styles: createResponsiveStyles({
              fontSize: preset.typography.bodySize,
              color: preset.palette.textMuted,
              fontFamily: preset.typography.bodyFont,
            }),
          }),
          createPageNode('container', {
            name: 'Newsletter Form',
            styles: createResponsiveStyles({
              display: 'flex',
              gap: 10,
              width: '100%',
              maxWidth: 460,
            }, { flexDirection: 'column' }),
            children: [
              createPageNode('input', {
                name: 'Newsletter Email',
                props: { name: 'email', label: '', placeholder: 'Seu e-mail', type: 'email', required: true },
                styles: createResponsiveStyles({
                  flex: 1,
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: `1px solid ${preset.palette.border}`,
                  background: preset.palette.background,
                  color: preset.palette.text,
                  fontSize: 14,
                }),
              }),
              createPageNode('button', {
                name: 'Subscribe Button',
                props: { label: 'Inscrever', href: '#' },
                styles: createResponsiveStyles({
                  padding: preset.button.padding,
                  borderRadius: preset.button.radius,
                  background: preset.button.background,
                  color: preset.button.color,
                  border: preset.button.border,
                  fontFamily: preset.typography.bodyFont,
                  fontWeight: 600,
                }),
              }),
            ],
          }),
        ],
      }),
    ],
  });

const buildLogosStrip = (preset: VisualPreset): PageNode =>
  createPageNode('section', {
    name: 'Logos Strip',
    styles: createResponsiveStyles({
      width: '100%',
      padding: '40px clamp(20px, 5vw, 72px)',
      background: preset.palette.background,
      color: preset.palette.text,
    }),
    children: [
      createPageNode('container', {
        name: 'Logos Row',
        styles: createResponsiveStyles({
          maxWidth: 1080,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 36,
        }, { gap: 24 }),
        children: ['Vortex', 'Nimbus', 'Quantum', 'Helio', 'Orbit'].map((brand) =>
          createPageNode('text', {
            name: `${brand} Logo`,
            props: { text: brand, as: 'span' },
            styles: createResponsiveStyles({
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: preset.palette.textMuted,
              fontFamily: preset.typography.headingFont,
              opacity: 0.8,
            }),
          }),
        ),
      }),
    ],
  });

const buildTeam = (preset: VisualPreset): PageNode => {
  const members = [
    { name: 'Ana Souza', role: 'Design Lead', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80' },
    { name: 'Carlos Lima', role: 'Creative Director', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80' },
    { name: 'Júlia Reis', role: 'Engineer', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=320&q=80' },
    { name: 'Bruno Andrade', role: 'Founder', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=320&q=80' },
  ];
  return createPageNode('section', {
    name: 'Team Section',
    styles: createResponsiveStyles({
      width: '100%',
      padding: 'clamp(56px, 8vw, 112px) clamp(20px, 5vw, 72px)',
      background: preset.palette.surface,
      color: preset.palette.text,
    }),
    children: [
      createPageNode('text', {
        name: 'Team Heading',
        props: { text: 'Nosso time', as: 'h2' },
        styles: createResponsiveStyles({
          maxWidth: 640,
          margin: '0 auto 40px',
          textAlign: 'center',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: preset.typography.headingWeight,
          color: preset.palette.text,
          fontFamily: preset.typography.headingFont,
        }),
      }),
      createPageNode('container', {
        name: 'Team Grid',
        styles: createResponsiveStyles({
          maxWidth: 1080,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
          gap: 20,
        }, { gridTemplateColumns: 'repeat(2, 1fr)' }),
        children: members.map((m) =>
          createPageNode('container', {
            name: `${m.name} Member`,
            styles: createResponsiveStyles({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 10,
            }),
            children: [
              createPageNode('image', {
                name: `${m.name} Avatar`,
                props: { src: m.avatar, alt: m.name },
                styles: createResponsiveStyles({
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  background: `linear-gradient(135deg, ${preset.palette.primary}, ${preset.palette.accent})`,
                  border: `1px solid ${preset.palette.border}`,
                }),
              }),
              createPageNode('text', {
                name: `${m.name} Name`,
                props: { text: m.name, as: 'div' },
                styles: createResponsiveStyles({
                  fontSize: 16,
                  fontWeight: 600,
                  color: preset.palette.text,
                  fontFamily: preset.typography.headingFont,
                }),
              }),
              createPageNode('text', {
                name: `${m.name} Role`,
                props: { text: m.role, as: 'div' },
                styles: createResponsiveStyles({
                  fontSize: 13,
                  color: preset.palette.textMuted,
                  fontFamily: preset.typography.bodyFont,
                }),
              }),
            ],
          }),
        ),
      }),
    ],
  });
};

const buildSplitContent = (preset: VisualPreset): PageNode =>
  createPageNode('section', {
    name: 'Split Content Section',
    styles: createResponsiveStyles({
      width: '100%',
      padding: 'clamp(56px, 8vw, 112px) clamp(20px, 5vw, 72px)',
      background: preset.palette.background,
      color: preset.palette.text,
    }),
    children: [
      createPageNode('container', {
        name: 'Split Layout',
        styles: createResponsiveStyles({
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
          alignItems: 'center',
          gap: 40,
        }, { display: 'flex', flexDirection: 'column', gap: 28 }),
        children: [
          createPageNode('container', {
            name: 'Split Copy',
            styles: createResponsiveStyles({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 16,
            }),
            children: [
              createPageNode('text', {
                name: 'Split Heading',
                props: { text: 'Conteúdo + cena lado a lado', as: 'h2' },
                styles: createResponsiveStyles({
                  fontSize: 'clamp(26px, 4vw, 38px)',
                  fontWeight: preset.typography.headingWeight,
                  lineHeight: 1.05,
                  color: preset.palette.text,
                  fontFamily: preset.typography.headingFont,
                }),
              }),
              createPageNode('text', {
                name: 'Split Body',
                props: { text: 'Descreva seu produto ou recurso enquanto a cena 3D interage ao lado.', as: 'p' },
                styles: createResponsiveStyles({
                  fontSize: preset.typography.bodySize,
                  lineHeight: 1.6,
                  color: preset.palette.textMuted,
                  fontFamily: preset.typography.bodyFont,
                }),
              }),
              createPageNode('button', {
                name: 'Split CTA',
                props: { label: 'Ver mais', href: '#' },
                styles: createResponsiveStyles({
                  padding: preset.button.padding,
                  borderRadius: preset.button.radius,
                  background: preset.button.background,
                  color: preset.button.color,
                  border: preset.button.border,
                  fontFamily: preset.typography.bodyFont,
                  fontWeight: 600,
                }),
              }),
            ],
          }),
          createPageNode('sceneCanvas', {
            name: 'Split Scene',
            props: { placement: 'side', interactive: true, transparent: true, linkedSceneId: 'current-scene' },
            styles: createResponsiveStyles({
              width: '100%',
              height: 420,
              borderRadius: 14,
              overflow: 'hidden',
              background: `radial-gradient(circle at 50% 40%, ${preset.palette.primary}22, ${preset.palette.background})`,
            }, { height: 320 }),
          }),
        ],
      }),
    ],
  });

/* ------------------------------------------------------------- Atomic builders */

const buildButtonPrimary = (preset: VisualPreset): PageNode =>
  createPageNode('button', {
    name: 'Botão Primário',
    props: { label: 'Explorar', href: '#' },
    styles: createResponsiveStyles({
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

const buildButtonSecondary = (preset: VisualPreset): PageNode =>
  createPageNode('button', {
    name: 'Botão Secundário',
    props: { label: 'Saiba mais', href: '#' },
    styles: createResponsiveStyles({
      padding: preset.button.padding,
      borderRadius: preset.button.radius,
      background: 'transparent',
      color: preset.palette.text,
      border: `1px solid ${preset.palette.primary}`,
      fontFamily: preset.typography.bodyFont,
      fontWeight: 600,
    }),
  });

const buildButtonGhost = (preset: VisualPreset): PageNode =>
  createPageNode('button', {
    name: 'Botão Ghost',
    props: { label: 'Fechar', href: '#' },
    styles: createResponsiveStyles({
      padding: '8px 14px',
      borderRadius: 6,
      background: 'transparent',
      color: preset.palette.textMuted,
      border: '1px solid transparent',
      fontFamily: preset.typography.bodyFont,
      fontWeight: 500,
    }),
  });

const buildCardFeature = (preset: VisualPreset): PageNode =>
  createPageNode('card', {
    name: 'Feature Card',
    props: { title: 'Recurso', body: 'Descrição curta do recurso em destaque.' },
    styles: createResponsiveStyles({
      padding: preset.card.padding,
      borderRadius: preset.card.radius,
      background: preset.card.background,
      border: preset.card.border,
      boxShadow: preset.card.boxShadow,
      color: preset.palette.text,
      fontFamily: preset.typography.bodyFont,
    }),
  });

const buildCardOutline = (preset: VisualPreset): PageNode =>
  createPageNode('card', {
    name: 'Outline Card',
    props: { title: 'Card', body: 'Card com borda destacada, sem sombra.' },
    styles: createResponsiveStyles({
      padding: 22,
      borderRadius: 12,
      background: 'transparent',
      border: `1px solid ${preset.palette.primary}`,
      color: preset.palette.text,
      fontFamily: preset.typography.bodyFont,
    }),
  });

const buildCardGlass = (preset: VisualPreset): PageNode =>
  createPageNode('card', {
    name: 'Glass Card',
    props: { title: 'Glass', body: 'Card com efeito glassmorphism.' },
    styles: createResponsiveStyles({
      padding: 24,
      borderRadius: 16,
      background: `${preset.palette.surfaceAlt}66`,
      border: `1px solid ${preset.palette.border}`,
      backdropFilter: 'blur(14px)',
      boxShadow: `0 18px 48px rgba(0,0,0,0.18)`,
      color: preset.palette.text,
      fontFamily: preset.typography.bodyFont,
    }),
  });

const buildInputField = (preset: VisualPreset): PageNode =>
  createPageNode('input', {
    name: 'Input Field',
    props: { name: 'field', label: 'Campo', placeholder: 'Digite aqui...', type: 'text', required: false },
    styles: createResponsiveStyles({
      width: '100%',
      padding: '12px 14px',
      borderRadius: 8,
      border: `1px solid ${preset.palette.border}`,
      background: preset.palette.background,
      color: preset.palette.text,
      fontSize: 14,
    }),
  });

const buildNavbarMinimal = (preset: VisualPreset): PageNode =>
  buildNavbar(preset, 'Brand', ['Início', 'Recursos', 'Contato']);

/* ------------------------------------------------------------------- Catalog */

const heroVariants: Array<{ id: string; variant: HeroVariant; name: string; description: string }> = [
  { id: 'hero-split', variant: 'split', name: 'Hero Split 3D', description: 'Texto + cena 3D lado a lado' },
  { id: 'hero-centered', variant: 'centered', name: 'Hero Centralizado', description: 'Headline centralizado com CTA' },
  { id: 'hero-background', variant: 'background', name: 'Hero Background', description: 'Copy sobre background imersivo' },
  { id: 'hero-immersive', variant: 'immersive', name: 'Hero Imersivo', description: 'Seção alta para cenas WebGL' },
];

export const BLOCK_LIBRARY: BlockDefinition[] = [
  /* Hero */
  ...heroVariants.map((v) => ({
    id: v.id,
    name: v.name,
    description: v.description,
    category: 'hero' as const,
    keywords: ['hero', 'headline', 'cta', '3d', v.variant],
    build: (preset: VisualPreset) =>
      buildHero(preset, {
        variant: v.variant,
        title: 'Crie experiências 3D que respondem ao usuário',
        subtitle: 'Monte a cena, posicione na página e conecte HTML com WebGL.',
        cta: 'Explorar',
        ctaHref: '#',
      }),
  })),
  /* Sections */
  {
    id: 'navbar',
    name: 'Navbar',
    description: 'Cabeçalho de navegação com marca e links',
    category: 'sections',
    keywords: ['navbar', 'header', 'navegação', 'menu'],
    build: (preset) => buildNavbar(preset, '3D Web', ['Produto', 'Experiência', 'Contato']),
  },
  {
    id: 'features-grid',
    name: 'Grid de Recursos',
    description: 'Seção com 3 cards de features',
    category: 'sections',
    keywords: ['features', 'recursos', 'grid', 'cards'],
    build: (preset) =>
      buildFeaturesGrid(preset, [
        { title: 'Performance', body: 'Efeitos reais com controle de FPS e fallback sem WebGL.' },
        { title: 'Interação', body: 'Conecte elementos HTML a objetos, luzes e câmera.' },
        { title: 'Exportação', body: 'Next, React, Vite ou HTML/CSS/JS com assets organizados.' },
      ]),
  },
  {
    id: 'stats-row',
    name: 'Linha de Stats',
    description: 'Métricas em destaque (4 colunas)',
    category: 'sections',
    keywords: ['stats', 'métricas', 'números', 'kpi'],
    build: (preset) =>
      buildStatsRow(preset, [
        { value: '120+', label: 'Projetos' },
        { value: '60fps', label: 'Performance' },
        { value: '5', label: 'Plataformas' },
        { value: '∞', label: 'Possibilidades' },
      ]),
  },
  {
    id: 'showcase',
    name: 'Showcase 3D',
    description: 'Título + viewer 3D centralizado',
    category: 'sections',
    keywords: ['showcase', '3d', 'modelo', 'viewer'],
    build: (preset) =>
      buildShowcase(preset, {
        title: 'Veja em 3D',
        subtitle: 'Interaja com o modelo diretamente no navegador.',
        height: 520,
      }),
  },
  {
    id: 'split-content',
    name: 'Conteúdo Split',
    description: 'Texto + cena 3D lado a lado',
    category: 'sections',
    keywords: ['split', 'conteúdo', '3d', 'texto'],
    build: (preset) => buildSplitContent(preset),
  },
  {
    id: 'testimonials',
    name: 'Depoimentos',
    description: 'Grid de 3 testimonials de clientes',
    category: 'content',
    keywords: ['testimonials', 'depoimentos', 'reviews', 'quotes'],
    build: (preset) => buildTestimonials(preset),
  },
  {
    id: 'pricing',
    name: 'Tabela de Preços',
    description: '3 planos com plano destacado',
    category: 'content',
    keywords: ['pricing', 'preços', 'planos', 'tabela'],
    build: (preset) => buildPricing(preset),
  },
  {
    id: 'faq',
    name: 'FAQ',
    description: 'Lista de perguntas frequentes',
    category: 'content',
    keywords: ['faq', 'perguntas', 'duvidas', 'ajuda'],
    build: (preset) => buildFAQ(preset),
  },
  {
    id: 'gallery',
    name: 'Galeria',
    description: 'Grid responsivo de 6 imagens',
    category: 'content',
    keywords: ['gallery', 'galeria', 'imagens', 'grid', 'fotos'],
    build: (preset) => buildGallery(preset),
  },
  {
    id: 'team',
    name: 'Time',
    description: 'Grid com avatar + nome + papel',
    category: 'content',
    keywords: ['team', 'time', 'pessoas', 'equipe', 'avatar'],
    build: (preset) => buildTeam(preset),
  },
  {
    id: 'logos-strip',
    name: 'Faixa de Logos',
    description: 'Marcas em linha, estilo social proof',
    category: 'content',
    keywords: ['logos', 'marcas', 'social proof', 'strip'],
    build: (preset) => buildLogosStrip(preset),
  },
  {
    id: 'cta',
    name: 'CTA Section',
    description: 'Call-to-action centralizado com botão',
    category: 'sections',
    keywords: ['cta', 'call to action', 'conversão', 'botão'],
    build: (preset) =>
      buildCTA(preset, {
        title: 'Pronto para publicar?',
        body: 'Teste no Preview, ajuste a responsividade e exporte.',
        cta: 'Começar agora',
        ctaHref: '#export',
      }),
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    description: 'Captura de e-mail com heading',
    category: 'forms',
    keywords: ['newsletter', 'email', 'captura', 'inscrição'],
    build: (preset) => buildNewsletter(preset),
  },
  {
    id: 'contact-form',
    name: 'Formulário de Contato',
    description: 'Form com nome, e-mail, mensagem',
    category: 'forms',
    keywords: ['form', 'contato', 'formulário', 'email'],
    build: (preset) => buildContactForm(preset),
  },
  {
    id: 'footer',
    name: 'Footer',
    description: 'Rodapé com texto de copyright',
    category: 'sections',
    keywords: ['footer', 'rodapé', 'copyright'],
    build: (preset) => buildFooter(preset, '© 2026 3D Web Experience'),
  },
  /* Atomic */
  {
    id: 'button-primary',
    name: 'Botão Primário',
    description: 'CTA com estilo principal do preset',
    category: 'atomic',
    keywords: ['button', 'botão', 'cta', 'primário'],
    build: (preset) => buildButtonPrimary(preset),
  },
  {
    id: 'button-secondary',
    name: 'Botão Secundário',
    description: 'Botão outline com cor primária',
    category: 'atomic',
    keywords: ['button', 'botão', 'secundário', 'outline'],
    build: (preset) => buildButtonSecondary(preset),
  },
  {
    id: 'button-ghost',
    name: 'Botão Ghost',
    description: 'Botão discreto sem fundo',
    category: 'atomic',
    keywords: ['button', 'botão', 'ghost', 'sutil'],
    build: (preset) => buildButtonGhost(preset),
  },
  {
    id: 'card-feature',
    name: 'Card Feature',
    description: 'Card padrão do preset',
    category: 'atomic',
    keywords: ['card', 'feature', 'recurso'],
    build: (preset) => buildCardFeature(preset),
  },
  {
    id: 'card-outline',
    name: 'Card Outline',
    description: 'Card com borda destacada',
    category: 'atomic',
    keywords: ['card', 'outline', 'borda'],
    build: (preset) => buildCardOutline(preset),
  },
  {
    id: 'card-glass',
    name: 'Card Glass',
    description: 'Card com efeito glassmorphism',
    category: 'atomic',
    keywords: ['card', 'glass', 'glassmorphism', 'blur'],
    build: (preset) => buildCardGlass(preset),
  },
  {
    id: 'input-field',
    name: 'Input Field',
    description: 'Campo de texto estilizado',
    category: 'atomic',
    keywords: ['input', 'campo', 'form', 'texto'],
    build: (preset) => buildInputField(preset),
  },
  {
    id: 'navbar-minimal',
    name: 'Navbar Minimal',
    description: 'Navbar enxuta com marca e 3 links',
    category: 'atomic',
    keywords: ['navbar', 'minimal', 'header'],
    build: (preset) => buildNavbarMinimal(preset),
  },
];

export const BLOCK_CATEGORIES: Array<{ id: BlockCategory | 'all'; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'hero', label: 'Hero' },
  { id: 'sections', label: 'Seções' },
  { id: 'content', label: 'Conteúdo' },
  { id: 'forms', label: 'Formulários' },
  { id: 'atomic', label: 'Atômicos' },
];

/** Resolve the preset to use for theming inserted blocks. */
export const resolveBlockPreset = (presetId?: VisualPresetId): VisualPreset =>
  getVisualPreset(presetId ?? 'dark-premium');

/** Builds a fresh node tree for the given block, themed by the preset. */
export const buildBlock = (blockId: string, preset: VisualPreset): PageNode => {
  const def = BLOCK_LIBRARY.find((b) => b.id === blockId);
  if (!def) throw new Error(`Block "${blockId}" not found in library`);
  return cloneWithNewIds(def.build(preset));
};

const cloneWithNewIds = (node: PageNode): PageNode => {
  const clone: PageNode = {
    ...node,
    id: createId(),
    props: { ...node.props },
    styles: Object.fromEntries(
      Object.entries(node.styles).map(([key, value]) => [key, value ? { ...value } : undefined]),
    ) as PageNode['styles'],
    children: node.children?.map((child) => cloneWithNewIds(child)),
  };
  return clone;
};
