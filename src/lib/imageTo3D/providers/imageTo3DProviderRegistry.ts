import { defaultHttpProviderConfig, httpImageTo3DProvider } from './httpImageTo3DProvider';
import { defaultMockProviderConfig, mockImageTo3DProvider } from './mockImageTo3DProvider';
import type { ImageTo3DProvider, ImageTo3DProviderConfig, ProviderId } from '../types';

const providers: Record<ProviderId, ImageTo3DProvider> = {
  mock: mockImageTo3DProvider,
  http: httpImageTo3DProvider,
};

const defaultConfigs: Record<ProviderId, ImageTo3DProviderConfig> = {
  mock: defaultMockProviderConfig,
  http: defaultHttpProviderConfig,
};

export const getProvider = (id: ProviderId): ImageTo3DProvider => providers[id];

export const getDefaultProviderConfig = (id: ProviderId): ImageTo3DProviderConfig => defaultConfigs[id];

export const listProviders = (): ImageTo3DProvider[] => Object.values(providers);

export const resolveProviderConfig = (
  id: ProviderId,
  overrides?: Partial<ImageTo3DProviderConfig>,
): ImageTo3DProviderConfig => ({
  ...defaultConfigs[id],
  ...overrides,
  id,
});

export const isProviderConfigured = (
  id: ProviderId,
  overrides?: Partial<ImageTo3DProviderConfig>,
): boolean => {
  const provider = providers[id];
  const config = resolveProviderConfig(id, overrides);
  return provider.isConfigured(config);
};
