import type { TransformKeyframe } from '@/lib/animation';
import {
  cloneLayer,
  cloneMaterial,
  cloneReferenceImage,
  cloneSceneObject,
  createId,
  type EditorMaterial,
  type Layer,
  type ReferenceImage,
  type SceneObject,
} from '@/store/types';
import type { SceneCamera, SceneDocument, SceneLight } from './types';

export const createSceneDocument = ({
  objects,
  materials,
  keyframes,
  layers,
  referenceImages,
  id = createId(),
  name = 'Main Scene',
}: {
  objects: SceneObject[];
  materials: Record<string, EditorMaterial>;
  keyframes: TransformKeyframe[];
  layers: Layer[];
  referenceImages: ReferenceImage[];
  id?: string;
  name?: string;
}): SceneDocument => {
  const clonedObjects = objects.map(cloneSceneObject);
  return {
    id,
    name,
    objects: clonedObjects,
    cameras: clonedObjects.filter((object): object is SceneCamera => object.kind === 'camera'),
    lights: clonedObjects.filter((object): object is SceneLight => object.kind === 'light'),
    materials: Object.values(materials).map(cloneMaterial),
    animations: keyframes.map((keyframe) => ({ ...keyframe })),
    layers: layers.map(cloneLayer),
    referenceImages: referenceImages.map(cloneReferenceImage),
  };
};
