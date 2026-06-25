import type { TransformKeyframe } from '@/lib/animation';
import type { EditorMaterial, Layer, ReferenceImage, SceneObject } from '@/store/types';

export type SceneCamera = SceneObject & { kind: 'camera' };
export type SceneLight = SceneObject & { kind: 'light' };
export type SceneMaterial = EditorMaterial;
export type SceneAnimation = TransformKeyframe;

export type SceneDocument = {
  id: string;
  name: string;
  objects: SceneObject[];
  cameras: SceneCamera[];
  lights: SceneLight[];
  materials: SceneMaterial[];
  animations: SceneAnimation[];
  layers: Layer[];
  referenceImages: ReferenceImage[];
};
