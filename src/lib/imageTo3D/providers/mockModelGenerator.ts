import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type {
  ImageTo3DModelType,
  ImageTo3DQuality,
  ImageTo3DRequest,
  ImageTo3DStyle,
  GeneratedModelStats,
} from '../types';

type StyleProfile = {
  color: string;
  metalness: number;
  roughness: number;
  flatShading: boolean;
  emissive: string;
};

const styleProfiles: Record<ImageTo3DStyle, StyleProfile> = {
  realistic: { color: '#c9a98c', metalness: 0.05, roughness: 0.65, flatShading: false, emissive: '#000000' },
  gameReady: { color: '#bfae9a', metalness: 0.1, roughness: 0.55, flatShading: false, emissive: '#000000' },
  stylized: { color: '#e0b894', metalness: 0.05, roughness: 0.5, flatShading: false, emissive: '#1a1208' },
  lowPoly: { color: '#d8c4a8', metalness: 0.0, roughness: 0.85, flatShading: true, emissive: '#000000' },
  cartoon: { color: '#f2c79c', metalness: 0.0, roughness: 0.95, flatShading: false, emissive: '#000000' },
};

const qualitySegments: Record<ImageTo3DQuality, { capsule: number; sphere: number; cylinder: number; box: number }> = {
  fast: { capsule: 4, sphere: 12, cylinder: 8, box: 1 },
  balanced: { capsule: 8, sphere: 24, cylinder: 16, box: 1 },
  high: { capsule: 16, sphere: 48, cylinder: 32, box: 1 },
};

const accentColors = ['#7c5cff', '#34d399', '#f59e0b', '#38bdf8', '#fb7185'];

const makeMaterial = (style: ImageTo3DStyle, hex: string) => {
  const profile = styleProfiles[style];
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    metalness: profile.metalness,
    roughness: profile.roughness,
    flatShading: profile.flatShading,
    emissive: new THREE.Color(profile.emissive),
    emissiveIntensity: profile.emissive === '#000000' ? 0 : 0.25,
  });
};

const addMesh = (
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
  position: [number, number, number],
  name: string,
) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
};

const buildHuman = (request: ImageTo3DRequest): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'GeneratedAvatar';
  const { style, quality } = request.settings;
  const seg = qualitySegments[quality];
  const skin = makeMaterial(style, styleProfiles[style].color);
  const cloth = makeMaterial(style, accentColors[0]);
  const pants = makeMaterial(style, accentColors[3]);

  const hasSideViews = request.images.some((i) => i.slot === 'left' || i.slot === 'right');

  addMesh(group, new THREE.SphereGeometry(0.28, seg.sphere, Math.max(8, seg.sphere / 2)), skin, [0, 1.62, 0], 'Head');
  addMesh(group, new THREE.CylinderGeometry(0.09, 0.11, 0.12, seg.cylinder), skin, [0, 1.42, 0], 'Neck');

  const torsoRadiusTop = 0.22;
  const torsoRadiusBottom = 0.2;
  addMesh(
    group,
    new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBottom, 0.62, seg.cylinder),
    cloth,
    [0, 1.0, 0],
    'Torso',
  );

  const armLength = 0.62;
  const armRadius = 0.075;
  const armX = torsoRadiusTop + armRadius;
  const armTilt = hasSideViews ? 0.06 : 0.12;
  const leftArm = new THREE.CapsuleGeometry(armRadius, armLength, seg.capsule, Math.max(6, seg.cylinder));
  const leftArmMesh = new THREE.Mesh(leftArm, cloth);
  leftArmMesh.name = 'ArmLeft';
  leftArmMesh.position.set(-armX, 1.0, 0);
  leftArmMesh.rotation.z = armTilt;
  leftArmMesh.castShadow = true;
  group.add(leftArmMesh);

  const rightArm = new THREE.CapsuleGeometry(armRadius, armLength, seg.capsule, Math.max(6, seg.cylinder));
  const rightArmMesh = new THREE.Mesh(rightArm, cloth);
  rightArmMesh.name = 'ArmRight';
  rightArmMesh.position.set(armX, 1.0, 0);
  rightArmMesh.rotation.z = -armTilt;
  rightArmMesh.castShadow = true;
  group.add(rightArmMesh);

  addMesh(group, new THREE.SphereGeometry(0.085, seg.sphere, seg.sphere), skin, [-armX, 0.62, 0], 'HandLeft');
  addMesh(group, new THREE.SphereGeometry(0.085, seg.sphere, seg.sphere), skin, [armX, 0.62, 0], 'HandRight');

  const legLength = 0.74;
  const legRadius = 0.1;
  const legX = 0.11;
  addMesh(group, new THREE.CapsuleGeometry(legRadius, legLength, seg.capsule, seg.cylinder), pants, [-legX, 0.22, 0], 'LegLeft');
  addMesh(group, new THREE.CapsuleGeometry(legRadius, legLength, seg.capsule, seg.cylinder), pants, [legX, 0.22, 0], 'LegRight');
  addMesh(group, new THREE.SphereGeometry(0.12, seg.sphere, Math.max(6, seg.sphere / 2)), pants, [-legX, -0.18, 0.04], 'FootLeft');
  addMesh(group, new THREE.SphereGeometry(0.12, seg.sphere, Math.max(6, seg.sphere / 2)), pants, [legX, -0.18, 0.04], 'FootRight');

  if (style === 'cartoon' || style === 'stylized') {
    const eyeMat = makeMaterial(style, '#1c1c1c');
    addMesh(group, new THREE.SphereGeometry(0.035, 12, 12), eyeMat, [-0.1, 1.65, 0.25], 'EyeLeft');
    addMesh(group, new THREE.SphereGeometry(0.035, 12, 12), eyeMat, [0.1, 1.65, 0.25], 'EyeRight');
  }

  return group;
};

const buildHead = (request: ImageTo3DRequest): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'GeneratedBust';
  const { style, quality } = request.settings;
  const seg = qualitySegments[quality];
  const skin = makeMaterial(style, styleProfiles[style].color);
  const baseMat = makeMaterial(style, accentColors[2]);

  addMesh(group, new THREE.SphereGeometry(0.4, seg.sphere, Math.max(10, seg.sphere / 1.5)), skin, [0, 0.5, 0], 'Head');
  addMesh(group, new THREE.CylinderGeometry(0.14, 0.2, 0.18, seg.cylinder), skin, [0, 0.18, 0], 'Neck');
  addMesh(group, new THREE.CylinderGeometry(0.26, 0.34, 0.22, seg.cylinder), baseMat, [0, 0.02, 0], 'BustBase');

  const eyeMat = makeMaterial(style, '#1c1c1c');
  addMesh(group, new THREE.SphereGeometry(0.045, 12, 12), eyeMat, [-0.14, 0.54, 0.34], 'EyeLeft');
  addMesh(group, new THREE.SphereGeometry(0.045, 12, 12), eyeMat, [0.14, 0.54, 0.34], 'EyeRight');
  const browMat = makeMaterial(style, '#3a2a1a');
  addMesh(group, new THREE.BoxGeometry(0.1, 0.015, 0.02), browMat, [-0.14, 0.62, 0.36], 'BrowLeft');
  addMesh(group, new THREE.BoxGeometry(0.1, 0.015, 0.02), browMat, [0.14, 0.62, 0.36], 'BrowRight');
  addMesh(group, new THREE.BoxGeometry(0.08, 0.02, 0.04), browMat, [0, 0.4, 0.36], 'Mouth');

  return group;
};

const buildObject = (request: ImageTo3DRequest): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'GeneratedObject';
  const { style, quality } = request.settings;
  const seg = qualitySegments[quality];
  const mat = makeMaterial(style, accentColors[1]);

  addMesh(group, new THREE.BoxGeometry(0.7, 0.7, 0.7), mat, [0, 0.4, 0], 'Body');
  addMesh(group, new THREE.SphereGeometry(0.18, seg.sphere, seg.sphere), mat, [0, 0.85, 0], 'Cap');
  addMesh(group, new THREE.CylinderGeometry(0.06, 0.06, 0.2, seg.cylinder), mat, [0, 1.02, 0], 'Antenna');

  return group;
};

const buildProp = (request: ImageTo3DRequest): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'GeneratedProp';
  const { style, quality } = request.settings;
  const seg = qualitySegments[quality];
  const mat = makeMaterial(style, accentColors[4]);

  const handle = new THREE.CylinderGeometry(0.04, 0.05, 0.5, seg.cylinder);
  const handleMesh = new THREE.Mesh(handle, mat);
  handleMesh.name = 'Handle';
  handleMesh.position.set(0, 0.25, 0);
  handleMesh.castShadow = true;
  group.add(handleMesh);

  const head = new THREE.TorusGeometry(0.18, 0.05, Math.max(6, seg.sphere / 3), seg.sphere);
  const headMesh = new THREE.Mesh(head, mat);
  headMesh.name = 'Head';
  headMesh.position.set(0, 0.55, 0);
  headMesh.rotation.x = Math.PI / 2;
  headMesh.castShadow = true;
  group.add(headMesh);

  return group;
};

const builders: Record<ImageTo3DModelType, (request: ImageTo3DRequest) => THREE.Group> = {
  human: buildHuman,
  head: buildHead,
  object: buildObject,
  prop: buildProp,
};

export const buildMockGeneratedGroup = (request: ImageTo3DRequest): THREE.Group => {
  const builder = builders[request.settings.modelType] ?? buildObject;
  const group = builder(request);

  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.sub(new THREE.Vector3(0, box.min.y, 0));

  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    const scale = 1.6 / maxDim;
    group.scale.setScalar(scale);
  }
  group.position.x = -center.x * (group.scale.x || 1);
  group.position.z = -center.z * (group.scale.z || 1);

  group.updateMatrixWorld(true);
  return group;
};

export const computeModelStats = (group: THREE.Group): GeneratedModelStats => {
  let polycount = 0;
  let meshCount = 0;
  let materialCount = 0;
  let textureCount = 0;
  const materialSet = new Set<THREE.Material>();

  group.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    meshCount += 1;
    const geometry = node.geometry as THREE.BufferGeometry | undefined;
    if (geometry && geometry.index) {
      polycount += geometry.index.count / 3;
    } else if (geometry && geometry.attributes.position) {
      polycount += geometry.attributes.position.count / 3;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((m) => {
      if (!m) return;
      materialSet.add(m);
      const std = m as THREE.MeshStandardMaterial;
      if (std.map) textureCount += 1;
    });
  });
  materialCount = materialSet.size;

  return {
    polycount: Math.round(polycount),
    meshCount,
    textureCount,
    materialCount,
    hasTextures: textureCount > 0,
  };
};

export const exportGroupAsGlb = (group: THREE.Object3D): Promise<ArrayBuffer> => {
  const exporter = new GLTFExporter();
  return exporter.parseAsync(group, {
    binary: true,
    trs: false,
    onlyVisible: true,
  }) as Promise<ArrayBuffer>;
};

export const buildMockRequestSummary = (request: ImageTo3DRequest) => ({
  modelType: request.settings.modelType,
  style: request.settings.style,
  quality: request.settings.quality,
  imageSlots: request.images.map((i) => i.slot),
});
