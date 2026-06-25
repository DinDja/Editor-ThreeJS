'use client';

import { useEffect, useMemo, useState } from 'react';
import PageExperience from './PageExperience';
import {
  collectAllAssetUrls,
  collectAssetSizes,
  collectTextureResolutions,
  computePreviewRuntimeMetrics,
  formatBytes,
  type AssetSizeInfo,
  type TextureResolutionInfo,
} from '@/lib/preview-runtime/metrics';
import { usePreviewStatsStore } from '@/store/previewStatsStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';

const deviceWidths = {
  desktop: '100%',
  tablet: '820px',
  mobile: '390px',
};

type ExtendedStats = {
  assetSizes: AssetSizeInfo[];
  totalAssetBytes: number;
  textureResolutions: TextureResolutionInfo[];
  largestTextureUrl: string | null;
  largestTexturePixels: number;
};

export default function PreviewWorkspace() {
  const page = useExperienceStore((state) => state.page);
  const interactions = useExperienceStore((state) => state.interactions);
  const previewDevice = useExperienceStore((state) => state.previewDevice);
  const objects = useSceneStore((state) => state.objects);
  const materials = useMaterialStore((state) => state.materials);
  const rendererStats = usePreviewStatsStore((state) => state.stats);

  const baseMetrics = useMemo(
    () => computePreviewRuntimeMetrics({ page, objects, materials, settings: useExperienceStore.getState().settings }),
    [page, objects, materials],
  );

  const [extended, setExtended] = useState<ExtendedStats | null>(null);
  const assetUrls = useMemo(() => collectAllAssetUrls({ page, objects, materials }), [page, objects, materials]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const [sizes, resolutions] = await Promise.all([
        collectAssetSizes(assetUrls.all),
        collectTextureResolutions([...assetUrls.textureUrls, ...assetUrls.imageUrls]),
      ]);
      if (cancelled) return;
      const totalAssetBytes = sizes.reduce((sum, info) => sum + (info.ok ? info.bytes : 0), 0);
      let largestTextureUrl: string | null = null;
      let largestTexturePixels = 0;
      for (const res of resolutions) {
        const pixels = res.width * res.height;
        if (pixels > largestTexturePixels) {
          largestTexturePixels = pixels;
          largestTextureUrl = res.url;
        }
      }
      setExtended({ assetSizes: sizes, totalAssetBytes, textureResolutions: resolutions, largestTextureUrl, largestTexturePixels });
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [assetUrls]);

  const stats: Array<{ label: string; value: string; warn?: boolean }> = [
    { label: 'FPS', value: String(rendererStats.fps || '—'), warn: rendererStats.fps > 0 && rendererStats.fps < 30 },
    { label: 'Draw calls', value: String(rendererStats.drawCalls || '—'), warn: rendererStats.drawCalls > 120 },
    { label: 'Triangulos', value: rendererStats.triangles.toLocaleString() },
    { label: 'Geometrias', value: String(rendererStats.geometries) },
    { label: 'Texturas GL', value: String(rendererStats.textures) },
    { label: 'Vertices', value: baseMetrics.knownVertexCount.toLocaleString() },
    { label: 'Objetos', value: String(baseMetrics.objectCount) },
    { label: 'Luzes', value: String(baseMetrics.lightCount) },
    {
      label: 'Assets',
      value: extended ? formatBytes(extended.totalAssetBytes) : '…',
      warn: extended ? extended.totalAssetBytes > 20 * 1024 * 1024 : false,
    },
    {
      label: 'Maior textura',
      value: extended?.largestTexturePixels
        ? `${Math.sqrt(extended.largestTexturePixels).toFixed(0)}px²`
        : baseMetrics.textureCount > 0
          ? '—'
          : '0',
      warn: extended ? extended.largestTexturePixels > 2048 * 2048 : false,
    },
    { label: 'Heap JS', value: rendererStats.jsHeapUsedMB ? `${rendererStats.jsHeapUsedMB.toFixed(1)} MB` : '—' },
  ];

  return (
    <div className="relative h-full overflow-auto bg-[#0d0f10] p-5">
      <div className="pointer-events-none sticky top-0 z-20 mb-3 flex flex-wrap justify-end gap-1.5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-md border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] backdrop-blur ${
              stat.warn
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                : 'border-neutral-800 bg-neutral-950/75 text-neutral-400'
            }`}
          >
            <span className="text-neutral-500">{stat.label}</span>{' '}
            <span className="tabular-nums text-neutral-200">{stat.value}</span>
          </div>
        ))}
      </div>
      <div
        className="mx-auto min-h-full overflow-hidden rounded-md border border-neutral-800 bg-[#101214] shadow-2xl transition-[width]"
        style={{ width: deviceWidths[previewDevice], maxWidth: '100%' }}
      >
        <PageExperience page={page} interactions={interactions} mode="preview" device={previewDevice} />
      </div>
      {baseMetrics.warnings.length > 0 && (
        <div className="mx-auto mt-3 max-w-3xl rounded-md border border-neutral-800 bg-neutral-950/60 p-3 text-[11px] text-neutral-400">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Avisos de performance</div>
          <ul className="grid gap-1">
            {baseMetrics.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
