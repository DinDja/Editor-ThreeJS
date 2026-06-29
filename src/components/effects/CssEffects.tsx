'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, JSX } from 'react';
import type { PageEffect } from '@/lib/effects-system/types';
import type { PerformanceProfile } from '@/lib/performance/device';
import Cursorly from 'cursorly.js';
import type { CursorlyInstance } from 'cursorly.js';

const prop = (effect: PageEffect, key: string, fallback: unknown): unknown =>
  effect.props[key] ?? fallback;
const num = (e: PageEffect, k: string, f: number) => (typeof prop(e, k, f) === 'number' ? (prop(e, k, f) as number) : Number(prop(e, k, f)) || f);
const str = (e: PageEffect, k: string, f: string) => (typeof prop(e, k, f) === 'string' ? (prop(e, k, f) as string) : f);
const bool = (e: PageEffect, k: string, f: boolean) => (typeof prop(e, k, f) === 'boolean' ? (prop(e, k, f) as boolean) : f);

/* -------------------------------- Cursor Glow -------------------------------- */

export function CursorGlow({ effect, profile }: { effect: PageEffect; profile: PerformanceProfile }) {
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const color = str(effect, 'color', '#34d399');
  const size = num(effect, 'size', 320);
  const opacity = num(effect, 'opacity', 0.35);
  const smooth = num(effect, 'smooth', 0.14);

  useEffect(() => {
    if (profile.reducedMotion) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };
    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * smooth;
      current.current.y += (target.current.y - current.current.y) * smooth;
      if (ref.current) {
        ref.current.style.transform = `translate3d(${current.current.x - size / 2}px, ${current.current.y - size / 2}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [smooth, size, profile.reducedMotion]);

  if (profile.reducedMotion) return null;
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        opacity,
        zIndex: 45,
        mixBlendMode: 'screen',
        left: 0,
        top: 0,
      }}
    />
  );
}

/* -------------------------------- Noise Overlay -------------------------------- */

export function NoiseOverlay({ effect }: { effect: PageEffect; profile: PerformanceProfile }) {
  const opacity = num(effect, 'opacity', 0.08);
  const grain = num(effect, 'grain', 4);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='${grain}' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='1'/></svg>`;
  const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{ backgroundImage: url, opacity, zIndex: 42, mixBlendMode: 'overlay' }}
    />
  );
}

/* -------------------------------- Gradient Mesh -------------------------------- */

export function GradientMesh({ effect, profile }: { effect: PageEffect; profile: PerformanceProfile }) {
  const colorA = str(effect, 'color', '#7c3aed');
  const colorB = str(effect, 'colorB', '#06b6d4');
  const colorC = str(effect, 'colorC', '#ec4899');
  const blur = num(effect, 'blur', 80);
  const opacity = num(effect, 'opacity', 0.5);
  const speed = num(effect, 'speed', 0.4);
  const paused = profile.reducedMotion;
  const animDuration = paused ? 0 : `${30 / Math.max(speed, 0.05)}s`;

  const blob = (color: string, x: string, y: string, delay: string): CSSProperties => ({
    position: 'absolute',
    width: '40vw',
    height: '40vw',
    borderRadius: '50%',
    background: color,
    filter: `blur(${blur}px)`,
    left: x,
    top: y,
    animation: paused ? 'none' : `effectMeshDrift ${animDuration} ${delay} infinite ease-in-out`,
  });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity, zIndex: 0 }}>
      <div style={blob(colorA, '10%', '20%', '0s')} />
      <div style={blob(colorB, '55%', '10%', '-6s')} />
      <div style={blob(colorC, '35%', '55%', '-12s')} />
    </div>
  );
}

/* -------------------------------- Aurora Background -------------------------------- */

export function AuroraBackground({ effect, profile }: { effect: PageEffect; profile: PerformanceProfile }) {
  const colorA = str(effect, 'color', '#34d399');
  const colorB = str(effect, 'colorB', '#22d3ee');
  const colorC = str(effect, 'colorC', '#a78bfa');
  const opacity = num(effect, 'opacity', 0.6);
  const speed = num(effect, 'speed', 0.4);
  const paused = profile.reducedMotion;
  const dur = paused ? 0 : `${24 / Math.max(speed, 0.05)}s`;

  const layer = (color: string, delay: string, top: string): CSSProperties => ({
    position: 'absolute',
    left: '-20%',
    right: '-20%',
    top,
    height: '60%',
    background: `radial-gradient(ellipse at center, ${color}, transparent 70%)`,
    filter: 'blur(50px)',
    animation: paused ? 'none' : `effectAurora ${dur} ${delay} infinite ease-in-out alternate`,
    mixBlendMode: 'screen',
  });

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity, zIndex: 0 }}>
      <div style={layer(colorA, '0s', '0%')} />
      <div style={layer(colorB, '-8s', '20%')} />
      <div style={layer(colorC, '-16s', '40%')} />
    </div>
  );
}

/* -------------------------------- Light Beams -------------------------------- */

export function LightBeams({ effect, profile }: { effect: PageEffect; profile: PerformanceProfile }) {
  const color = str(effect, 'color', '#fbbf24');
  const count = Math.round(num(effect, 'count', 3));
  const width = num(effect, 'width', 180);
  const speed = num(effect, 'speed', 0.3);
  const opacity = num(effect, 'opacity', 0.35);
  const angle = num(effect, 'angle', -12);
  const paused = profile.reducedMotion;
  const dur = paused ? 0 : `${18 / Math.max(speed, 0.05)}s`;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity, zIndex: 40 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '-30%',
            left: `${10 + i * (80 / Math.max(count, 1))}%`,
            width,
            height: '160%',
            background: `linear-gradient(to bottom, transparent, ${color}, transparent)`,
            filter: 'blur(24px)',
            transform: `rotate(${angle}deg)`,
            opacity: 0.6,
            animation: paused ? 'none' : `effectBeam ${dur} ${-i * 4}s infinite ease-in-out`,
            mixBlendMode: 'screen',
          }}
        />
      ))}
    </div>
  );
}

/* -------------------------------- Holographic Panel -------------------------------- */

export function HolographicPanel({ effect }: { effect: PageEffect; profile: PerformanceProfile }) {
  const color = str(effect, 'color', '#22d3ee');
  const opacity = num(effect, 'opacity', 0.5);
  const scanlines = bool(effect, 'scanlines', true);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: 41,
        opacity,
        background: scanlines
          ? `repeating-linear-gradient(0deg, ${color}00 0px, ${color}00 2px, ${color}22 3px, ${color}00 4px)`
          : `radial-gradient(circle at 50% 0%, ${color}22, transparent 60%)`,
        mixBlendMode: 'screen',
      }}
    />
  );
}

/* -------------------------------- Glass Card (modifier) -------------------------------- */

export function GlassCard({ effect }: { effect: PageEffect; profile: PerformanceProfile }) {
  const blur = num(effect, 'blur', 14);
  const opacity = num(effect, 'opacity', 0.6);
  const border = str(effect, 'border', '#ffffff');
  useEffect(() => {
    const id = 'effect-glass-card-style';
    const style = document.getElementById(id) ?? document.createElement('style');
    style.id = id;
    style.textContent = `
      [data-experience-node][data-node-type="card"] {
        background: rgba(255,255,255,${opacity * 0.12}) !important;
        backdrop-filter: blur(${blur}px) !important;
        -webkit-backdrop-filter: blur(${blur}px) !important;
        border: 1px solid ${border}33 !important;
        box-shadow: 0 18px 50px rgba(0,0,0,0.25) !important;
      }
    `;
    if (!style.parentElement) document.head.appendChild(style);
    return () => {
      const s = document.getElementById(id);
      if (s) s.remove();
    };
  }, [blur, opacity, border]);
  return null;
}

/* -------------------------------- Magnetic Button (modifier) -------------------------------- */

export function MagneticButton({ effect, profile }: { effect: PageEffect; profile: PerformanceProfile }) {
  const strength = num(effect, 'strength', 0.4);
  const radius = num(effect, 'radius', 120);
  useEffect(() => {
    if (profile.reducedMotion) return;
    const handlers: Array<{ el: HTMLElement; move: (e: PointerEvent) => void; leave: () => void }> = [];
    const attach = () => {
      const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-experience-node][data-node-type="button"]'));
      buttons.forEach((el) => {
        const move = (e: PointerEvent) => {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          const dist = Math.hypot(dx, dy);
          if (dist < radius) {
            el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
            el.style.transition = 'transform 0.12s ease-out';
          } else {
            el.style.transform = 'translate(0,0)';
          }
        };
        const leave = () => {
          el.style.transform = 'translate(0,0)';
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        handlers.push({ el, move, leave });
      });
    };
    const t = window.setTimeout(attach, 200);
    return () => {
      window.clearTimeout(t);
      handlers.forEach(({ el, move, leave }) => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
        el.style.transform = '';
      });
    };
  }, [strength, radius, profile.reducedMotion]);
  return null;
}

/* -------------------------------- Scroll Reveal (modifier) -------------------------------- */

export function ScrollReveal({ effect, profile }: { effect: PageEffect; profile: PerformanceProfile }) {
  const distance = num(effect, 'distance', 48);
  const duration = num(effect, 'duration', 700);
  const easing = str(effect, 'easing', 'cubic-bezier(0.16,1,0.3,1)');
  const once = bool(effect, 'once', true);
  const [styleId] = useState(`effect-reveal-${effect.id}`);

  useEffect(() => {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      [data-reveal] { opacity: 0; transform: translateY(${distance}px); transition: opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}; }
      [data-reveal].is-visible { opacity: 1; transform: translateY(0); }
    `;
    document.head.appendChild(style);

    if (profile.reducedMotion) {
      document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
      return () => style.remove();
    }

    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-experience-node]'));
    targets.forEach((el) => el.setAttribute('data-reveal', ''));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            entry.target.classList.remove('is-visible');
          }
        });
      },
      { threshold: 0.12 },
    );
    targets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      style.remove();
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        el.classList.remove('is-visible');
        el.removeAttribute('data-reveal');
      });
    };
  }, [distance, duration, easing, once, profile.reducedMotion, styleId]);

  return null;
}

/* -------------------------------- Parallax Layer (modifier) -------------------------------- */

export function ParallaxLayer({ effect, profile }: { effect: PageEffect; profile: PerformanceProfile }) {
  const strength = num(effect, 'strength', 0.25);
  const image = str(effect, 'image', '');
  useEffect(() => {
    if (profile.reducedMotion) return;
    let raf = 0;
    const apply = () => {
      const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-experience-node][data-node-type="section"]'));
      sections.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * strength * (i % 2 === 0 ? 1 : -1);
        el.style.setProperty('--parallax-y', `${offset.toFixed(1)}px`);
      });
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [strength, profile.reducedMotion]);

  useEffect(() => {
    if (!image) return;
    const id = 'effect-parallax-bg-style';
    const style = document.getElementById(id) ?? document.createElement('style');
    style.id = id;
    style.textContent = `
      [data-experience-node][data-node-type="section"] {
        background-image: url('${image}') !important;
        background-size: cover !important;
        background-position: center !important;
        background-attachment: fixed !important;
      }
    `;
    if (!style.parentElement) document.head.appendChild(style);
    return () => {
      const s = document.getElementById(id);
      if (s) s.remove();
    };
  }, [image]);

  return null;
}

/* -------------------------------- Custom Cursor (Cursorly.js) -------------------------------- */

export function CustomCursor({ effect, profile }: { effect: PageEffect; profile: PerformanceProfile }) {
  const cursorRef = useRef<CursorlyInstance | null>(null);

  useEffect(() => {
    if (profile.reducedMotion) return;

    const iconIndex = Math.round(num(effect, 'iconIndex', 0));
    const effectName = str(effect, 'effect', 'trail');
    const effectColor = str(effect, 'effectColor', '#ffffff');
    const cursorSize = num(effect, 'cursorSize', 32);

    const cursor = Cursorly.init({
      cursor: Math.max(0, Math.min(iconIndex, 41)),
      cursorSize,
      effect: {
        name: effectName === 'none' ? 'none' : effectName,
        color: effectColor,
      },
    });

    cursorRef.current = cursor;

    return () => {
      cursor.disable();
      const canvases = document.querySelectorAll('canvas');
      canvases.forEach((c) => {
        if (c.style.zIndex === '9999' || c.style.zIndex === '99999') c.remove();
      });
      cursorRef.current = null;
    };
  }, [effect.id, profile.reducedMotion]);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    const iconIndex = Math.round(num(effect, 'iconIndex', 0));
    const effectName = str(effect, 'effect', 'trail');
    const effectColor = str(effect, 'effectColor', '#ffffff');
    const cursorSize = num(effect, 'cursorSize', 32);

    cursor.setIcon(Math.max(0, Math.min(iconIndex, 41)));
    if (cursorSize > 0) {
      cursor.options.cursorSize = cursorSize;
      if (cursor.cursorImage) {
        cursor.cursorImage.style.width = `${cursorSize}px`;
        cursor.cursorImage.style.height = `${cursorSize}px`;
      }
    }

    if (effectName === 'none') {
      cursor.disableEffect();
    } else {
      cursor.setEffect({ name: effectName, color: effectColor });
      cursor.enableEffect();
    }
  }, [effect.props]);

  if (profile.reducedMotion) return null;

  return null;
}

export const CSS_EFFECT_COMPONENTS: Record<string, (props: { effect: PageEffect; profile: PerformanceProfile }) => JSX.Element | null> = {
  cursorGlow: CursorGlow,
  customCursor: CustomCursor,
  noiseOverlay: NoiseOverlay,
  gradientMesh: GradientMesh,
  auroraBackground: AuroraBackground,
  lightBeams: LightBeams,
  holographicPanel: HolographicPanel,
  glassCard: GlassCard,
  magneticButton: MagneticButton,
  scrollReveal: ScrollReveal,
  parallaxLayer: ParallaxLayer,
};
