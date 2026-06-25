'use client';

import { useEffect, useRef, useState } from 'react';
import type { EffectPerformanceTier } from '@/lib/effects-system/types';

export type PerformanceProfile = {
  tier: EffectPerformanceTier;
  webglAvailable: boolean;
  webgl2Available: boolean;
  reducedMotion: boolean;
  isMobile: boolean;
  hardwareCores: number;
  /** Multiplier applied to particle counts / heavy work (0..1). */
  particleScale: number;
  /** Suggested max particles for the current device. */
  maxParticles: number;
  /** Measured FPS (rolling). Null until first sample. */
  fps: number | null;
  setFps: (fps: number) => void;
};

const detectWebGL = (): { webgl: boolean; webgl2: boolean } => {
  if (typeof window === 'undefined') return { webgl: false, webgl2: false };
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (gl) return { webgl: true, webgl2: true };
    const gl1 = canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
    return { webgl: Boolean(gl1), webgl2: false };
  } catch {
    return { webgl: false, webgl2: false };
  }
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const detectMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia && window.matchMedia('(max-width: 820px)').matches) return true;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
};

const detectTier = (webgl: boolean, webgl2: boolean, isMobile: boolean, cores: number): EffectPerformanceTier => {
  if (!webgl) return 'low';
  if (isMobile || cores <= 4) return webgl2 ? 'low' : 'low';
  if (cores >= 12) return 'high';
  if (cores >= 8) return 'medium';
  return 'low';
};

const tierToParticleScale = (tier: EffectPerformanceTier): number =>
  tier === 'high' ? 1 : tier === 'medium' ? 0.55 : 0.28;

let cachedProfile: PerformanceProfile | null = null;

const buildProfile = (): PerformanceProfile => {
  const { webgl, webgl2 } = detectWebGL();
  const isMobile = detectMobile();
  const cores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 8;
  const tier = detectTier(webgl, webgl2, isMobile, cores);
  return {
    tier,
    webglAvailable: webgl,
    webgl2Available: webgl2,
    reducedMotion: prefersReducedMotion(),
    isMobile,
    hardwareCores: cores,
    particleScale: tierToParticleScale(tier),
    maxParticles: tier === 'high' ? 6000 : tier === 'medium' ? 2400 : 900,
    fps: null,
    setFps: () => {},
  };
};

export const getPerformanceProfile = (): PerformanceProfile => {
  if (cachedProfile) return cachedProfile;
  cachedProfile = buildProfile();
  return cachedProfile;
};

/**
 * React hook returning the live performance profile plus a rolling FPS meter.
 * FPS is sampled from requestAnimationFrame while mounted.
 */
export const usePerformanceProfile = (): PerformanceProfile => {
  const [profile, setProfile] = useState<PerformanceProfile>(() => getPerformanceProfile());
  const [fps, setFps] = useState<number | null>(null);
  const frameCount = useRef(0);
  const lastTime = useRef(0);

  useEffect(() => {
    setProfile({ ...getPerformanceProfile(), fps, setFps });
  }, [fps]);

  useEffect(() => {
    let raf = 0;
    let active = true;
    lastTime.current = performance.now();

    const tick = (now: number) => {
      if (!active) return;
      frameCount.current += 1;
      const elapsed = now - lastTime.current;
      if (elapsed >= 500) {
        const measured = Math.round((frameCount.current * 1000) / elapsed);
        setFps(measured);
        frameCount.current = 0;
        lastTime.current = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onMotionChange = () => {
      cachedProfile = null;
      setProfile({ ...getPerformanceProfile(), fps, setFps });
    };
    const motionMedia = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    motionMedia?.addEventListener?.('change', onMotionChange);

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      motionMedia?.removeEventListener?.('change', onMotionChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...profile, fps, setFps };
};

/**
 * Scales a requested particle count by the device's particle scale,
 * and clamps it to the supported maximum.
 */
export const scaleParticleCount = (requested: number, profile: PerformanceProfile): number => {
  const scaled = Math.round(requested * profile.particleScale);
  return Math.max(40, Math.min(scaled, profile.maxParticles));
};

/** Returns true when heavy animation should be skipped (reduced motion + low tier). */
export const shouldDegradeAnimation = (profile: PerformanceProfile): boolean =>
  profile.reducedMotion || !profile.webglAvailable || profile.tier === 'low';
