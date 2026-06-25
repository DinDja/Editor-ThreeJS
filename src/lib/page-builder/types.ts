import type { InteractionDocument } from '@/lib/interaction-engine/types';
import type { PageEffectsConfig } from '@/lib/effects-system/types';
import type { SceneDocument } from '@/lib/scene-engine/types';

export type { PageEffect, PageEffectsConfig } from '@/lib/effects-system/types';

export type EditorMode = 'scene' | 'page' | 'interactions' | 'preview' | 'export';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

export type ExportTarget = 'next' | 'react' | 'vite' | 'html' | 'json';

export type Breakpoint = 'base' | 'tablet' | 'mobile';

export type ResponsiveSettings = {
  desktop: number;
  tablet: number;
  mobile: number;
};

export type ScrollBehavior = 'normal' | 'sticky' | 'parallax' | 'pinned' | 'none';

export type PageNodeType =
  | 'section'
  | 'container'
  | 'text'
  | 'button'
  | 'image'
  | 'video'
  | 'card'
  | 'navbar'
  | 'footer'
  | 'sceneCanvas';

export type CSSLength = string | number;

export type PageStyle = Partial<{
  width: CSSLength;
  height: CSSLength;
  minHeight: CSSLength;
  maxWidth: CSSLength;
  padding: CSSLength;
  margin: CSSLength;
  display: 'block' | 'flex' | 'grid' | 'none';
  flexDirection: 'row' | 'column';
  alignItems: string;
  justifyContent: string;
  placeItems: string;
  gap: CSSLength;
  gridTemplateColumns: string;
  position: 'static' | 'relative' | 'absolute' | 'sticky' | 'fixed';
  top: CSSLength;
  right: CSSLength;
  bottom: CSSLength;
  left: CSSLength;
  zIndex: number;
  transform: string;
  opacity: number | string;
  cursor: string;
  background: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
  backdropFilter: string;
  color: string;
  fontFamily: string;
  fontSize: CSSLength;
  fontWeight: string | number;
  lineHeight: CSSLength;
  letterSpacing: CSSLength;
  textAlign: 'left' | 'center' | 'right';
  textTransform: string;
  borderRadius: CSSLength;
  border: string;
  borderTop: string;
  boxShadow: string;
  transition: string;
  overflow: 'visible' | 'hidden' | 'auto' | 'clip';
  objectFit: 'cover' | 'contain' | 'fill';
}>;

export type ResponsiveStyles = Partial<Record<Breakpoint, PageStyle>> & {
  base: PageStyle;
};

export type PageNode = {
  id: string;
  type: PageNodeType;
  name: string;
  props: Record<string, unknown>;
  styles: ResponsiveStyles;
  responsive?: Partial<Record<Breakpoint, { visible: boolean }>>;
  scrollBehavior?: ScrollBehavior;
  children?: PageNode[];
};

export type PageDocument = {
  id: string;
  type: 'page';
  name: string;
  children: PageNode[];
  responsive: ResponsiveSettings;
  /**
   * Optional page-level visual effects (particles, shaders, overlays...).
   * Absent on legacy project files — remains fully backward compatible.
   */
  effects?: PageEffectsConfig;
};

export type ProjectSettings = {
  id: string;
  name: string;
  exportTarget: ExportTarget;
  tailwind: boolean;
  performanceBudget: {
    maxModelMb: number;
    maxTextureSize: number;
    targetFps: number;
  };
};

export type ProjectAssetKind = 'model' | 'texture' | 'image' | 'video' | 'reference' | 'unknown';

export type ProjectAssetSource = 'scene' | 'material' | 'page' | 'reference';

export type ProjectAsset = {
  id: string;
  kind: ProjectAssetKind;
  source: ProjectAssetSource;
  url: string;
  name?: string;
  objectId?: string;
  materialId?: string;
  pageNodeId?: string;
};

export type ProjectSeoSettings = {
  title: string;
  description: string;
  lang: string;
};

export type ProjectRendererSettings = {
  shadows: boolean;
  dpr: [number, number];
  background: string | null;
  toneMapping: 'default' | 'aces' | 'none';
};

export type ProjectExperience = {
  schemaVersion?: number;
  savedAt?: string;
  editorVersion?: string;
  id: string;
  name: string;
  page: PageDocument;
  scene: SceneDocument;
  interactions: InteractionDocument[];
  settings: ProjectSettings;
  assets?: ProjectAsset[];
  seo?: ProjectSeoSettings;
  renderer?: ProjectRendererSettings;
};
