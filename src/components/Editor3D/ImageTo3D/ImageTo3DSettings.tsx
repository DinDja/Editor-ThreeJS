'use client';

import {
  Boxes,
  Cpu,
  Gem,
  Leaf,
  Palette,
  Settings2,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';
import {
  MODEL_TYPE_DESCRIPTIONS,
  MODEL_TYPE_LABELS,
  QUALITY_DESCRIPTIONS,
  QUALITY_LABELS,
  STYLE_LABELS,
  type ImageTo3DModelType,
  type ImageTo3DQuality,
  type ImageTo3DSettings,
  type ImageTo3DStyle,
  type ProviderId,
} from '@/lib/imageTo3D/types';
import { useImageTo3DStore } from '@/store/imageTo3DStore';
import { isProviderConfigured } from '@/lib/imageTo3D/providers/imageTo3DProviderRegistry';

const modelTypeIcons: Record<ImageTo3DModelType, typeof Boxes> = {
  human: Boxes,
  head: Sparkles,
  object: Cpu,
  prop: Gem,
};

const styleIcons: Record<ImageTo3DStyle, typeof Palette> = {
  realistic: Sparkles,
  gameReady: Cpu,
  stylized: Palette,
  lowPoly: Leaf,
  cartoon: Wand2,
};

const qualityIcons: Record<ImageTo3DQuality, typeof Zap> = {
  fast: Zap,
  balanced: Settings2,
  high: Gem,
};

const modelTypes = Object.keys(MODEL_TYPE_LABELS) as ImageTo3DModelType[];
const styles = Object.keys(STYLE_LABELS) as ImageTo3DStyle[];
const qualities = Object.keys(QUALITY_LABELS) as ImageTo3DQuality[];

const optionCard = (active: boolean) =>
  `flex cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition ${
    active
      ? 'border-emerald-400/60 bg-emerald-400/8 text-emerald-100'
      : 'border-neutral-700/60 bg-neutral-950/40 text-neutral-400 hover:border-neutral-600 hover:bg-neutral-900/60 hover:text-neutral-200'
  }`;

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
      {icon}
      {children}
    </div>
  );
}

export default function ImageTo3DSettings() {
  const settings = useImageTo3DStore((s) => s.settings);
  const updateSettings = useImageTo3DStore((s) => s.updateSettings);
  const providerId = useImageTo3DStore((s) => s.providerId);
  const providerConfig = useImageTo3DStore((s) => s.providerConfig);
  const setProviderId = useImageTo3DStore((s) => s.setProviderId);
  const updateProviderConfig = useImageTo3DStore((s) => s.updateProviderConfig);

  const providerOk = isProviderConfigured(providerId, providerConfig);
  const patch = (p: Partial<ImageTo3DSettings>) => updateSettings(p);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <SectionLabel icon={<Boxes size={11} />}>Tipo de modelo</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {modelTypes.map((type) => {
            const Icon = modelTypeIcons[type];
            const active = settings.modelType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => patch({ modelType: type })}
                className={optionCard(active)}
                title={MODEL_TYPE_DESCRIPTIONS[type]}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <Icon size={13} className={active ? 'text-emerald-300' : 'text-neutral-400'} />
                  {MODEL_TYPE_LABELS[type]}
                </span>
                <span className="text-[9px] leading-tight text-neutral-500">
                  {MODEL_TYPE_DESCRIPTIONS[type]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <SectionLabel icon={<Palette size={11} />}>Estilo</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {styles.map((style) => {
            const Icon = styleIcons[style];
            const active = settings.style === style;
            return (
              <button
                key={style}
                type="button"
                onClick={() => patch({ style })}
                className={optionCard(active)}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <Icon size={12} className={active ? 'text-emerald-300' : 'text-neutral-400'} />
                  {STYLE_LABELS[style]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <SectionLabel icon={<Zap size={11} />}>Qualidade</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {qualities.map((quality) => {
            const Icon = qualityIcons[quality];
            const active = settings.quality === quality;
            return (
              <button
                key={quality}
                type="button"
                onClick={() => patch({ quality })}
                className={optionCard(active)}
                title={QUALITY_DESCRIPTIONS[quality]}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <Icon size={12} className={active ? 'text-emerald-300' : 'text-neutral-400'} />
                  {QUALITY_LABELS[quality]}
                </span>
                <span className="text-[9px] leading-tight text-neutral-500">
                  {QUALITY_DESCRIPTIONS[quality]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <SectionLabel icon={<Cpu size={11} />}>Provedor de geracao</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {(['mock', 'http'] as ProviderId[]).map((id) => {
            const active = providerId === id;
            const label = id === 'mock' ? 'Mock (local)' : 'HTTP / API';
            return (
              <button
                key={id}
                type="button"
                onClick={() => setProviderId(id)}
                className={optionCard(active)}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <Cpu size={12} className={active ? 'text-emerald-300' : 'text-neutral-400'} />
                  {label}
                </span>
                <span className="text-[9px] leading-tight text-neutral-500">
                  {id === 'mock' ? 'Demonstracao local' : 'Backend / API externa'}
                </span>
              </button>
            );
          })}
        </div>
        {providerId === 'http' && (
          <div className="space-y-1.5 rounded-lg border border-neutral-800 bg-neutral-950/40 p-2.5">
            <label className="block text-[10px] font-medium text-neutral-500">Endpoint</label>
            <input
              value={providerConfig.endpoint ?? ''}
              onChange={(e) => updateProviderConfig({ endpoint: e.target.value })}
              placeholder="/api/image-to-3d/generate"
              className="h-8 w-full rounded-md border border-neutral-700/80 bg-[#0d0f10] px-2.5 text-xs text-neutral-100 outline-none transition focus:border-emerald-400"
            />
            <label className="mt-1 block text-[10px] font-medium text-neutral-500">API Key (opcional)</label>
            <input
              type="password"
              value={providerConfig.apiKey ?? ''}
              onChange={(e) => updateProviderConfig({ apiKey: e.target.value })}
              placeholder="deixe vazio se nao usar"
              className="h-8 w-full rounded-md border border-neutral-700/80 bg-[#0d0f10] px-2.5 text-xs text-neutral-100 outline-none transition focus:border-emerald-400"
            />
            {!providerOk && (
              <p className="text-[9px] text-amber-400">
                Configure a URL do endpoint para usar o provedor HTTP.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-1.5 rounded-lg border border-neutral-800 bg-neutral-950/40 p-3">
        <SectionLabel icon={<Settings2 size={11} />}>Apos gerar</SectionLabel>
        {[
          { key: 'autoImport', label: 'Importar automaticamente para a cena' },
          { key: 'centerPivot', label: 'Centralizar pivo na origem' },
          { key: 'normalizeScale', label: 'Normalizar escala (~2m)' },
          { key: 'renameAutomatically', label: 'Renomear como Generated Avatar/Model' },
        ].map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={() => patch({ [row.key]: !settings[row.key as keyof ImageTo3DSettings] } as Partial<ImageTo3DSettings>)}
            className={`flex w-full items-center justify-between rounded-md border px-2.5 py-1.5 text-[11px] transition ${
              settings[row.key as keyof ImageTo3DSettings]
                ? 'border-emerald-400/30 bg-emerald-400/8 text-emerald-100'
                : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
            }`}
          >
            <span>{row.label}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                settings[row.key as keyof ImageTo3DSettings]
                  ? 'bg-emerald-400/20 text-emerald-300'
                  : 'bg-neutral-800 text-neutral-500'
              }`}
            >
              {settings[row.key as keyof ImageTo3DSettings] ? 'On' : 'Off'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
