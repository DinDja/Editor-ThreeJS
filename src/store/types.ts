export type Vec3 = [number, number, number];

export type Vec2 = [number, number];

export type ActiveTool = 'select' | 'translate' | 'rotate' | 'scale' | 'edit' | 'sculpt'
  | 'drawPolygon' | 'knife';

export type ViewportDisplayMode = 'textured' | 'solid' | 'wireframe' | 'vertices' | 'polygons' | 'primitive';

export type MeshSelectionMode = 'vertex' | 'edge' | 'face';

export type MeshEditMode = 'object' | 'edit' | 'drawPolygon' | 'knife';

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

export type PointerType = 'mouse' | 'pen' | 'touch';

export type MobilePanel = 'scene' | 'properties' | 'timeline';

export type PrimitiveKind = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane';

export type EffectKind = 'fireworks' | 'fire' | 'smoke' | 'sparkle' | 'lightGlow' | 'fluid';

export type EffectConfig = {
  kind: EffectKind;
  color: string;
  intensity: number;
  size: number;
  count: number;
};

export type LightKind = 'spot' | 'point' | 'directional' | 'ambient';

export type LightConfig = {
  kind: LightKind;
  color: string;
  intensity: number;
  distance: number;
  decay: number;
  angle: number;
  penumbra: number;
  castShadow: boolean;
  shadowBias: number;
  shadowRadius: number;
  target: Vec3;
};

export const DEFAULT_LIGHT_CONFIG: LightConfig = {
  kind: 'spot',
  color: '#ffffff',
  intensity: 10,
  distance: 15,
  decay: 1,
  angle: 0.5,
  penumbra: 0.3,
  castShadow: true,
  shadowBias: -0.001,
  shadowRadius: 2,
  target: [0, 0, -3],
};

export type SceneObjectKind = 'group' | 'object3d' | 'mesh' | 'model' | 'primitive' | 'effect' | 'svg' | 'text' | 'light' | 'camera';

export type SceneObjectType = 'Group' | 'Object3D' | 'Mesh' | 'Light' | 'Camera';

export type ObjectSelectionMode = 'object' | 'subelement' | 'mesh';

export type MaterialApplicationScope = 'self' | 'children' | 'subtree';

export type SceneTransform = {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
};

export type SceneObjectMetadata = {
  importRootId?: string;
  gltfSource?: string;
  gltfNodePath?: number[];
  gltfNodeType?: string;
  sourceMaterialNames?: string[];
  materialOverrides?: Record<string, boolean>;
  physics?: ScenePhysicsConfig;
  flatShading?: boolean;
  [key: string]: unknown;
};

export type PhysicsBodyType = 'static' | 'dynamic' | 'kinematic';

export type PhysicsColliderType = 'box' | 'sphere' | 'capsule' | 'cylinder' | 'mesh' | 'convexHull';

export type PhysicsAxisLocks = {
  x: boolean;
  y: boolean;
  z: boolean;
};

export type ScenePhysicsConfig = {
  enabled: boolean;
  bodyType: PhysicsBodyType;
  colliderType: PhysicsColliderType;
  mass: number;
  friction: number;
  restitution: number;
  linearDamping: number;
  angularDamping: number;
  gravityScale: number;
  isTrigger: boolean;
  lockTranslation: PhysicsAxisLocks;
  lockRotation: PhysicsAxisLocks;
};

export const DEFAULT_PHYSICS_CONFIG: ScenePhysicsConfig = {
  enabled: false,
  bodyType: 'dynamic',
  colliderType: 'box',
  mass: 1,
  friction: 0.5,
  restitution: 0.2,
  linearDamping: 0,
  angularDamping: 0,
  gravityScale: 1,
  isTrigger: false,
  lockTranslation: {
    x: false,
    y: false,
    z: false,
  },
  lockRotation: {
    x: false,
    y: false,
    z: false,
  },
};

export type Text3DConfig = {
  text: string;
  size: number;
  depth: number;
  curveSegments: number;
  bevelEnabled: boolean;
  bevelThickness: number;
  bevelSize: number;
  bevelSegments: number;
};

export const DEFAULT_TEXT_CONFIG: Text3DConfig = {
  text: '3D',
  size: 1,
  depth: 0.3,
  curveSegments: 8,
  bevelEnabled: false,
  bevelThickness: 0.05,
  bevelSize: 0.05,
  bevelSegments: 4,
};

export type SvgConfig = {
  depth: number;
  bevelEnabled: boolean;
  bevelThickness: number;
  bevelSize: number;
};

export const DEFAULT_SVG_CONFIG: SvgConfig = {
  depth: 0.3,
  bevelEnabled: false,
  bevelThickness: 0.05,
  bevelSize: 0.05,
};

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

export type Script = {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
};

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

export type ReferenceImage = {
  id: string;
  name: string;
  imageUrl: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  opacity: number;
  visible: boolean;
};

export type Layer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color: string;
  order: number;
};

export type SceneObject = {
  id: string;
  uuid: string;
  name: string;
  kind: SceneObjectKind;
  type: SceneObjectType;
  source?: string;
  sourceType?: 'public' | 'upload';
  primitive?: PrimitiveKind;
  geometry?: PrimitiveGeometry;
  editableMesh?: EditableMesh;
  svgConfig?: SvgConfig;
  textConfig?: Text3DConfig;
  effect?: EffectConfig;
  lightConfig?: LightConfig;
  behaviors?: BehaviorConfig[];
  scripts?: Script[];
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  transform: SceneTransform;
  visible: boolean;
  locked: boolean;
  parent: string | null;
  parentId: string | null;
  children: string[];
  materialId: string;
  materialIds?: string[];
  layerId: string;
  metadata: SceneObjectMetadata;
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
  Pick<
    SceneObject,
    | 'id'
    | 'uuid'
    | 'type'
    | 'position'
    | 'rotation'
    | 'scale'
    | 'transform'
    | 'visible'
    | 'locked'
    | 'parent'
    | 'parentId'
    | 'children'
    | 'materialId'
    | 'materialIds'
    | 'layerId'
    | 'metadata'
    | 'createdAt'
  >
> &
  Pick<SceneObject, 'name' | 'kind'> &
  Pick<SceneObject, 'source' | 'sourceType' | 'primitive' | 'geometry' | 'editableMesh' | 'svgConfig' | 'textConfig' | 'effect' | 'lightConfig' | 'behaviors' | 'scripts'>;

export const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const cloneVec3 = (value: Vec3): Vec3 => [value[0], value[1], value[2]];

export const cloneTransform = (transform: SceneTransform): SceneTransform => ({
  position: cloneVec3(transform.position),
  rotation: cloneVec3(transform.rotation),
  scale: cloneVec3(transform.scale),
});

export const cloneEditableMesh = (mesh: EditableMesh): EditableMesh => ({
  vertices: mesh.vertices.map(cloneVec3),
  indices: [...mesh.indices],
  uvs: mesh.uvs?.map((uv) => [uv[0], uv[1]]),
  mask: mesh.mask ? [...mesh.mask] : undefined,
  faceMaterialIds: mesh.faceMaterialIds ? [...mesh.faceMaterialIds] : undefined,
});

export const clonePhysicsConfig = (physics: ScenePhysicsConfig): ScenePhysicsConfig => ({
  ...physics,
  lockTranslation: { ...physics.lockTranslation },
  lockRotation: { ...physics.lockRotation },
});

export const cloneSceneObjectMetadata = (metadata: SceneObjectMetadata): SceneObjectMetadata => ({
  ...metadata,
  materialOverrides: metadata.materialOverrides ? { ...metadata.materialOverrides } : undefined,
  physics: metadata.physics ? clonePhysicsConfig(metadata.physics) : undefined,
});

export const cloneSceneObject = (object: SceneObject): SceneObject => ({
  ...object,
  id: object.id ?? object.uuid,
  geometry: object.geometry ? { ...object.geometry } : undefined,
  editableMesh: object.editableMesh ? cloneEditableMesh(object.editableMesh) : undefined,
  svgConfig: object.svgConfig ? { ...object.svgConfig } : undefined,
  textConfig: object.textConfig ? { ...object.textConfig } : undefined,
  effect: object.effect ? { ...object.effect } : undefined,
  lightConfig: object.lightConfig ? { ...object.lightConfig } : undefined,
  behaviors: object.behaviors ? object.behaviors.map((b) => ({ ...b })) : undefined,
  scripts: object.scripts ? object.scripts.map((s) => ({ ...s })) : undefined,
  position: cloneVec3(object.position),
  rotation: cloneVec3(object.rotation),
  scale: cloneVec3(object.scale),
  transform: cloneTransform(object.transform ?? { position: object.position, rotation: object.rotation, scale: object.scale }),
  parent: object.parentId ?? object.parent ?? null,
  parentId: object.parentId ?? object.parent ?? null,
  children: [...(object.children ?? [])],
  materialIds: object.materialIds ? [...object.materialIds] : undefined,
  metadata: cloneSceneObjectMetadata(object.metadata ?? {}),
  layerId: object.layerId,
});

export const cloneLayer = (layer: Layer): Layer => ({ ...layer });

export const cloneReferenceImage = (ref: ReferenceImage): ReferenceImage => ({
  ...ref,
  position: cloneVec3(ref.position),
  rotation: cloneVec3(ref.rotation),
  scale: cloneVec3(ref.scale),
});

export const cloneMaterial = (material: EditorMaterial): EditorMaterial => ({ ...material });
