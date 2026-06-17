export type Vec3 = [number, number, number];

export type Vec2 = [number, number];

export type ActiveTool = 'select' | 'translate' | 'rotate' | 'scale' | 'edit' | 'sculpt';

export type ViewportDisplayMode = 'textured' | 'solid' | 'wireframe' | 'vertices' | 'polygons' | 'primitive';

export type MeshSelectionMode = 'vertex' | 'edge' | 'face';

export type SculptMode =
  | 'push'
  | 'pull'
  | 'grab'
  | 'inflate'
  | 'smooth'
  | 'clay'
  | 'crease'
  | 'flatten'
  | 'pinch'
  | 'mask';

export type SculptFalloff = 'smooth' | 'sphere' | 'sharp' | 'linear';

export type PrimitiveKind = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane';

export type EffectKind = 'fireworks' | 'fire' | 'smoke' | 'sparkle' | 'lightGlow';

export type EffectConfig = {
  kind: EffectKind;
  color: string;
  intensity: number;
  size: number;
  count: number;
};

export type SceneObjectKind = 'model' | 'primitive' | 'effect';

export type PrimitiveGeometry = Partial<{
  width: number;
  height: number;
  depth: number;
  radius: number;
  radiusTop: number;
  radiusBottom: number;
  tube: number;
  radialSegments: number;
  tubularSegments: number;
  widthSegments: number;
  heightSegments: number;
  depthSegments: number;
}>;

export type EditableMesh = {
  vertices: Vec3[];
  indices: number[];
  uvs?: Vec2[];
  mask?: number[];
  faceMaterialIds?: Array<string | null>;
};

export type BehaviorKind = 'jump' | 'walk' | 'accelerate' | 'roll' | 'gravity' | 'bubble' | 'massDeform';

export type BehaviorConfig = {
  type: BehaviorKind;
  enabled: boolean;
  jumpHeight?: number;
  jumpCooldown?: number;
  walkSpeed?: number;
  walkAmplitude?: number;
  walkFrequency?: number;
  acceleration?: number;
  maxSpeed?: number;
  rollSpeed?: number;
  rollAxis?: 'x' | 'z';
  gravityStrength?: number;
  groundY?: number;
  bubbleAmplitude?: number;
  bubbleFrequency?: number;
  deformStrength?: number;
  deformReturnSpeed?: number;
};

export type SceneObject = {
  uuid: string;
  name: string;
  kind: SceneObjectKind;
  source?: string;
  sourceType?: 'public' | 'upload';
  primitive?: PrimitiveKind;
  geometry?: PrimitiveGeometry;
  editableMesh?: EditableMesh;
  effect?: EffectConfig;
  behaviors?: BehaviorConfig[];
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  visible: boolean;
  parent: string | null;
  materialId: string;
  createdAt: number;
};

export type EditorMaterial = {
  uuid: string;
  objectId: string;
  name: string;
  color: string;
  metalness: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
  textureUrl: string | null;
  textureName: string | null;
  normalMapUrl: string | null;
  roughnessMapUrl: string | null;
  displacementMapUrl: string | null;
  textureRepeatX: number;
  textureRepeatY: number;
  textureOffsetX: number;
  textureOffsetY: number;
  textureRotation: number;
};

export type SceneObjectInput = Partial<
  Pick<SceneObject, 'uuid' | 'position' | 'rotation' | 'scale' | 'visible' | 'parent' | 'materialId' | 'createdAt'>
> &
  Pick<SceneObject, 'name' | 'kind'> &
  Pick<SceneObject, 'source' | 'sourceType' | 'primitive' | 'geometry' | 'editableMesh' | 'effect' | 'behaviors'>;

export const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const cloneVec3 = (value: Vec3): Vec3 => [value[0], value[1], value[2]];

export const cloneEditableMesh = (mesh: EditableMesh): EditableMesh => ({
  vertices: mesh.vertices.map(cloneVec3),
  indices: [...mesh.indices],
  uvs: mesh.uvs?.map((uv) => [uv[0], uv[1]]),
  mask: mesh.mask ? [...mesh.mask] : undefined,
  faceMaterialIds: mesh.faceMaterialIds ? [...mesh.faceMaterialIds] : undefined,
});

export const cloneSceneObject = (object: SceneObject): SceneObject => ({
  ...object,
  geometry: object.geometry ? { ...object.geometry } : undefined,
  editableMesh: object.editableMesh ? cloneEditableMesh(object.editableMesh) : undefined,
  effect: object.effect ? { ...object.effect } : undefined,
  behaviors: object.behaviors ? object.behaviors.map((b) => ({ ...b })) : undefined,
  position: cloneVec3(object.position),
  rotation: cloneVec3(object.rotation),
  scale: cloneVec3(object.scale),
});

export const cloneMaterial = (material: EditorMaterial): EditorMaterial => ({ ...material });
