import type { InteractionDocument } from '@/lib/interaction-engine/types';
import type { PageEffectsConfig } from '@/lib/effects-system/types';
import type { DataSchema } from '@/lib/data-model/types';
import type { VariableDocument } from '@/lib/variables/types';
import type { SceneDocument } from '@/lib/scene-engine/types';

export type { PageEffect, PageEffectsConfig } from '@/lib/effects-system/types';

export type EditorMode = 'scene' | 'page' | 'data' | 'interactions' | 'preview' | 'export';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

export type ExportTarget = 'next' | 'react' | 'vite' | 'html' | 'json';

export type Breakpoint = 'base' | 'tablet' | 'mobile' | (string & {});

export type BreakpointDef = {
  name: string;
  width: number;
};

export type ResponsiveSettings = BreakpointDef[];

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
  | 'sceneCanvas'
  | 'form'
  | 'input'
  | 'select'
  | 'textarea'
  | 'label'
  | 'modal'
  | 'menu'
  | 'menuitem'
  | 'dataTable'
  | 'dataForm'
  | 'dataList'
  | 'dataChart'
  | 'dataStat'
  | 'pageRoute';

export type CSSLength = string | number;

export type PageStyle = Partial<{
  width: CSSLength;
  height: CSSLength;
  minWidth: CSSLength;
  minHeight: CSSLength;
  maxWidth: CSSLength;
  padding: CSSLength;
  margin: CSSLength;
  marginTop: CSSLength;
  marginBottom: CSSLength;
  display: 'block' | 'flex' | 'grid' | 'none';
  flex: string | number;
  flexWrap: 'wrap' | 'nowrap' | 'wrap-reverse';
  flexDirection: 'row' | 'column';
  alignItems: string;
  justifyContent: string;
  alignSelf: string;
  placeItems: string;
  gap: CSSLength;
  gridTemplateColumns: string;
  position: 'static' | 'relative' | 'absolute' | 'sticky' | 'fixed';
  top: CSSLength;
  right: CSSLength;
  bottom: CSSLength;
  left: CSSLength;
  inset: CSSLength;
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
  textDecoration: string;
  borderRadius: CSSLength;
  border: string;
  borderTop: string;
  boxShadow: string;
  transition: string;
  overflow: 'visible' | 'hidden' | 'auto' | 'clip';
  objectFit: 'cover' | 'contain' | 'fill';
}>;

export type ResponsiveStyles = {
  base: PageStyle;
  tablet?: PageStyle;
  mobile?: PageStyle;
  [breakpoint: string]: PageStyle | undefined;
};

export type PseudoClass = 'hover' | 'active' | 'focus';

export type ComponentDefinition = {
  id: string;
  name: string;
  description?: string;
  nodes: PageNode[];
  createdAt: string;
};

export type ComponentOverride = Partial<{
  props: Record<string, unknown>;
  styles: ResponsiveStyles;
}>;

export type PageNode = {
  id: string;
  type: PageNodeType;
  name: string;
  props: Record<string, unknown>;
  styles: ResponsiveStyles;
  pseudo?: Partial<Record<PseudoClass, ResponsiveStyles>>;
  responsive?: Record<string, { visible: boolean }>;
  scrollBehavior?: ScrollBehavior;
  children?: PageNode[];
  /** If set, this node is a component instance linked to ComponentDefinition.id */
  componentId?: string;
  /** Per-child overrides keyed by the child's original definition-node ID */
  instanceOverrides?: Record<string, ComponentOverride>;
  /** When true, the element cannot be selected, dragged or edited in the builder */
  locked?: boolean;
  /** When true, the element is omitted from the rendered canvas (kept in tree) */
  hidden?: boolean;
};

export type PageDocument = {
  id: string;
  type: 'page';
  name: string;
  path?: string;
  title?: string;
  description?: string;
  protected?: boolean;
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
  pages?: PageDocument[];
  activePageId?: string;
  scene: SceneDocument;
  interactions: InteractionDocument[];
  settings: ProjectSettings;
  assets?: ProjectAsset[];
  seo?: ProjectSeoSettings;
  renderer?: ProjectRendererSettings;
  components?: ComponentDefinition[];
  dataSchema?: DataSchema;
  variables?: VariableDocument;
};
