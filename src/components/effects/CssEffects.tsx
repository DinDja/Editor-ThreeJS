'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, JSX } from 'react';
import type { PageEffect } from '@/lib/effects-system/types';
import type { PerformanceProfile } from '@/lib/performance/device';

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

/* -------------------------------- Custom Cursor -------------------------------- */

const CURSOR_SVGS: Record<string, string> = {
  neoGlow: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="10" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="16" cy="16" r="4" fill="currentColor" opacity="0.8"/><circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="0.5" opacity="0.3"/></svg>`,
  crosshair: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="8" stroke="currentColor" stroke-width="1.5"/><line x1="16" y1="2" x2="16" y2="10" stroke="currentColor" stroke-width="1.5"/><line x1="16" y1="22" x2="16" y2="30" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="16" x2="10" y2="16" stroke="currentColor" stroke-width="1.5"/><line x1="22" y1="16" x2="30" y2="16" stroke="currentColor" stroke-width="1.5"/></svg>`,
  cosmic: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 2L20 12L30 16L20 20L16 30L12 20L2 16L12 12Z" fill="currentColor" opacity="0.6"/><circle cx="16" cy="16" r="4" fill="currentColor"/></svg>`,
  nature: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 2C16 2 8 10 8 16C8 20.4183 11.5817 24 16 24C20.4183 24 24 20.4183 24 16C24 10 16 2 16 2Z" fill="currentColor" opacity="0.5"/><circle cx="16" cy="16" r="3" fill="currentColor"/></svg>`,
  luxury: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="20" height="20" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M16 6L18 12L24 14L18 16L16 22L14 16L8 14L14 12Z" fill="currentColor" opacity="0.5"/></svg>`,
  tech: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="8" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="16" cy="16" r="4" fill="currentColor"/><path d="M16 4V8M16 24V28M4 16H8M24 16H28" stroke="currentColor" stroke-width="1" opacity="0.5"/></svg>`,
  game: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><polygon points="16,4 28,28 16,22 4,28" fill="currentColor" opacity="0.7"/><circle cx="16" cy="16" r="3" fill="currentColor"/></svg>`,
  glass: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="10" stroke="currentColor" stroke-width="1" opacity="0.6"/><circle cx="16" cy="16" r="6" stroke="currentColor" stroke-width="0.5" opacity="0.4"/><circle cx="16" cy="16" r="2" fill="currentColor" opacity="0.8"/></svg>`,
  editorial: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="4" y1="16" x2="28" y2="16" stroke="currentColor" stroke-width="1.5"/><line x1="16" y1="4" x2="16" y2="28" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="16" r="3" fill="currentColor"/></svg>`,
};

export function CustomCursor({ effect, profile }: { effect: PageEffect; profile: PerformanceProfile }) {
  const cursorStyle = str(effect, 'cursorStyle', 'default');
  const cursorColor = str(effect, 'cursorColor', '#ffffff');
  const cursorSize = num(effect, 'cursorSize', 28);
  const showTrail = bool(effect, 'showTrail', true);
  const trailLength = Math.round(num(effect, 'trailLength', 8));
  const showLight = bool(effect, 'showLight', false);
  const lightColor = str(effect, 'lightColor', '#00f0ff');
  const lightIntensity = num(effect, 'lightIntensity', 5);
  const lightRadius = num(effect, 'lightRadius', 8);

  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<HTMLDivElement[]>([]);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const trailPositions = useRef<Array<{ x: number; y: number }>>([]);

  // Inject global cursor style
  useEffect(() => {
    const styleId = 'effect-cursor-style';
    let style = document.getElementById(styleId) as HTMLStyleElement;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = `
      body *, body *:hover {
        cursor: none !important;
      }
    `;
    return () => {
      if (style.parentElement) style.remove();
    };
  }, []);

  useEffect(() => {
    if (profile.reducedMotion) return;
    let raf = 0;

    // Initialize trail positions
    trailPositions.current = Array.from({ length: trailLength }, () => ({ x: 0, y: 0 }));

    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };

    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.14;
      current.current.y += (target.current.y - current.current.y) * 0.14;

      // Update trail
      trailPositions.current.unshift({ x: current.current.x, y: current.current.y });
      trailPositions.current = trailPositions.current.slice(0, trailLength);

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${current.current.x - cursorSize / 2}px, ${current.current.y - cursorSize / 2}px, 0)`;
      }

      // Update trail dots
      if (showTrail) {
        trailRefs.current.forEach((dot, i) => {
          if (dot && trailPositions.current[i]) {
            const pos = trailPositions.current[i];
            const alpha = 1 - i / trailLength;
            const scale = 1 - i / trailLength * 0.6;
            dot.style.transform = `translate3d(${pos.x - (cursorSize * 0.15 * scale) / 2}px, ${pos.y - (cursorSize * 0.15 * scale) / 2}px, 0) scale(${scale})`;
            dot.style.opacity = String(alpha * 0.6);
          }
        });
      }

      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [cursorSize, showTrail, trailLength, profile.reducedMotion]);

  // Create light source in 3D canvas if showLight is enabled
  useEffect(() => {
    if (!showLight || profile.reducedMotion) return;

    const lightId = 'effect-cursor-light';
    let lightContainer = document.getElementById(lightId) as HTMLDivElement;
    if (!lightContainer) {
      lightContainer = document.createElement('div');
      lightContainer.id = lightId;
      lightContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:44;';
      document.body.appendChild(lightContainer);
    }

    // Create a radial gradient light following cursor
    const glow = document.createElement('div');
    glow.style.cssText = `
      position: absolute;
      width: ${lightRadius * 2}px;
      height: ${lightRadius * 2}px;
      border-radius: 50%;
      background: radial-gradient(circle, ${lightColor}33 0%, ${lightColor}11 40%, transparent 70%);
      pointer-events: none;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    lightContainer.appendChild(glow);

    const moveGlow = (e: PointerEvent) => {
      glow.style.left = `${e.clientX}px`;
      glow.style.top = `${e.clientY}px`;
    };
    window.addEventListener('pointermove', moveGlow);

    return () => {
      window.removeEventListener('pointermove', moveGlow);
      if (lightContainer.parentElement) lightContainer.remove();
    };
  }, [showLight, lightColor, lightRadius, profile.reducedMotion]);

  if (profile.reducedMotion) return null;

  // Default cursor type: just hide the cursor and show nothing custom
  if (cursorStyle === 'default') {
    return (
      <style>{`body *, body *:hover { cursor: none !important; }`}</style>
    );
  }

  const svgContent = CURSOR_SVGS[cursorStyle] || CURSOR_SVGS.neoGlow;
  const encodedSvg = encodeURIComponent(svgContent.replace(/currentColor/g, cursorColor));
  const cursorUrl = `url("data:image/svg+xml;utf8,${encodedSvg}") ${cursorSize / 2} ${cursorSize / 2}, auto`;

  return (
    <>
      <style>{`body *, body *:hover { cursor: ${cursorUrl} !important; }`}</style>
      {showTrail && (
        <div aria-hidden className="pointer-events-none fixed" style={{ zIndex: 46 }}>
          {Array.from({ length: trailLength }).map((_, i) => (
            <div
              key={i}
              ref={(el) => { if (el) trailRefs.current[i] = el; }}
              className="absolute"
              style={{
                width: cursorSize * 0.15,
                height: cursorSize * 0.15,
                borderRadius: '50%',
                background: cursorColor,
                opacity: 0,
                transition: 'opacity 0.1s ease',
              }}
            />
          ))}
        </div>
      )}
    </>
  );
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
