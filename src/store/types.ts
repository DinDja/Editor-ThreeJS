export type Vec3 = [number, number, number];

export type Vec2 = [number, number];

export type ActiveTool = 'select' | 'translate' | 'rotate' | 'scale' | 'edit' | 'sculpt';

export type MeshSelectionMode = 'vertex' | 'face';

export type SculptMode = 'push' | 'pull' | 'inflate' | 'smooth';

export type PrimitiveKind = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane';

export type SceneObjectKind = 'model' | 'primitive';

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
  Pick<SceneObject, 'source' | 'sourceType' | 'primitive' | 'geometry' | 'editableMesh'>;

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
});

export const cloneSceneObject = (object: SceneObject): SceneObject => ({
  ...object,
  geometry: object.geometry ? { ...object.geometry } : undefined,
  editableMesh: object.editableMesh ? cloneEditableMesh(object.editableMesh) : undefined,
  position: cloneVec3(object.position),
  rotation: cloneVec3(object.rotation),
  scale: cloneVec3(object.scale),
});

export const cloneMaterial = (material: EditorMaterial): EditorMaterial => ({ ...material });
