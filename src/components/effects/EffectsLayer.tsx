'use client';

import { useEffect, useState } from 'react';
import type { PageEffect } from '@/lib/effects-system/types';
import { EFFECT_REGISTRY } from '@/lib/effects-system/registry';
import { getPerformanceProfile, type PerformanceProfile } from '@/lib/performance/device';
import EffectsCanvas from './EffectsCanvas';
import { CSS_EFFECT_COMPONENTS } from './CssEffects';

type EffectsLayerProps = {
  effects: PageEffect[];
  globalIntensity?: number;
  /** In edit mode we skip behaviour modifiers that hide/move content. */
  mode?: 'edit' | 'preview';
};

/**
 * Orchestrates all page-level visual effects.
 * WebGL effects render inside a single shared canvas (performant).
 * CSS/DOM effects render as overlays or attach behaviour modifiers.
 *
 * Effects respect `prefers-reduced-motion`, device tier and WebGL
 * availability automatically (see lib/performance/device).
 */
export default function EffectsLayer({ effects, globalIntensity = 1, mode = 'preview' }: EffectsLayerProps) {
  const [profile, setProfile] = useState<PerformanceProfile>(() => getPerformanceProfile());

  useEffect(() => {
    setProfile({ ...getPerformanceProfile() });
  }, []);

  // In edit mode, skip modifiers that hide or move content (would break editing).
  const editSkipTypes = new Set<PageEffect['type']>(['scrollReveal', 'parallaxLayer', 'magneticButton']);
  const enabledEffects = effects.filter((effect) => effect.enabled && !(mode === 'edit' && editSkipTypes.has(effect.type)));
  const webglEffects = enabledEffects.filter((effect) => EFFECT_REGISTRY[effect.type]?.renderer === 'webgl');
  const cssEffects = enabledEffects.filter((effect) => EFFECT_REGISTRY[effect.type]?.renderer === 'css');

  return (
    <>
      {webglEffects.length > 0 && profile.webglAvailable && (
        <EffectsCanvas effects={webglEffects} globalIntensity={globalIntensity} />
      )}
      {cssEffects.map((effect) => {
        const Comp = CSS_EFFECT_COMPONENTS[effect.type];
        if (!Comp) return null;
        return <Comp key={effect.id} effect={effect} profile={profile} />;
      })}
    </>
  );
}
