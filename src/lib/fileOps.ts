'use client';

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { TransformKeyframe } from '@/lib/animation';
import type { SceneObject } from '@/store/types';

export const MODEL_FILE_ACCEPT = '.glb,.gltf';
export const TEXTURE_FILE_ACCEPT = 'image/*';

export const isModelFile = (file: File) => /\.(glb|gltf)$/i.test(file.name);

export const createObjectUrl = (file: File) => URL.createObjectURL(file);

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

function buildAnimationClips(keyframes: TransformKeyframe[], objects: SceneObject[], fps: number): THREE.AnimationClip[] {
  const byObject = new Map<string, TransformKeyframe[]>();
  for (const kf of keyframes) {
    const list = byObject.get(kf.objectId);
    if (list) list.push(kf);
    else byObject.set(kf.objectId, [kf]);
  }

  const clips: THREE.AnimationClip[] = [];
  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();

  for (const [objectId, kfs] of byObject) {
    const sceneObj = objects.find((o) => o.uuid === objectId);
    if (!sceneObj) continue;

    kfs.sort((a, b) => a.frame - b.frame);
    const times = kfs.map((kf) => kf.frame / fps);

    const posValues: number[] = [];
    const rotValues: number[] = [];
    const sclValues: number[] = [];

    for (const kf of kfs) {
      posValues.push(kf.position[0], kf.position[1], kf.position[2]);
      euler.set(kf.rotation[0], kf.rotation[1], kf.rotation[2]);
      quat.setFromEuler(euler);
      rotValues.push(quat.x, quat.y, quat.z, quat.w);
      sclValues.push(kf.scale[0], kf.scale[1], kf.scale[2]);
    }

    const tracks: THREE.KeyframeTrack[] = [];
    const name = sceneObj.name;

    const stepOrLinear = (kfs: TransformKeyframe[]) =>
      kfs.some((k) => k.interpolation === 'hold') ? THREE.InterpolateDiscrete : THREE.InterpolateSmooth;

    tracks.push(new THREE.VectorKeyframeTrack(`${name}.position`, times, posValues, stepOrLinear(kfs)));
    tracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, rotValues, stepOrLinear(kfs)));
    tracks.push(new THREE.VectorKeyframeTrack(`${name}.scale`, times, sclValues, stepOrLinear(kfs)));

    clips.push(new THREE.AnimationClip(sceneObj.name, undefined, tracks));
  }

  return clips;
}

type ExportOptions = {
  keyframes?: TransformKeyframe[];
  objects?: SceneObject[];
  fps?: number;
};

function stripHelpers(obj: THREE.Object3D) {
  const toRemove: THREE.Object3D[] = [];
  obj.traverse((child) => {
    if (child.userData?.isHelper && child.parent) {
      toRemove.push(child);
    }
  });
  for (const child of toRemove) {
    child.parent?.remove(child);
    child.traverse((c) => {
      if (c instanceof THREE.Mesh || c instanceof THREE.LineSegments || c instanceof THREE.Points) {
        c.geometry?.dispose();
        if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
        else c.material?.dispose();
      }
    });
  }
}

export const exportObjectAsGLB = async (root: THREE.Object3D, filename = 'editor-scene.glb', options?: ExportOptions) => {
  const exporter = new GLTFExporter();
  const clone = root.clone(true);
  stripHelpers(clone);

  let animations: THREE.AnimationClip[] = [];
  if (options?.keyframes && options.keyframes.length > 0 && options?.objects) {
    animations = buildAnimationClips(options.keyframes, options.objects, options.fps ?? 30);
  }

  const result = await exporter.parseAsync(clone, {
    binary: true,
    trs: false,
    onlyVisible: true,
    animations,
  });

  if (result instanceof ArrayBuffer) {
    downloadBlob(new Blob([result], { type: 'model/gltf-binary' }), filename);
    return;
  }

  downloadBlob(new Blob([JSON.stringify(result, null, 2)], { type: 'model/gltf+json' }), filename.replace(/\.glb$/i, '.gltf'));
};
