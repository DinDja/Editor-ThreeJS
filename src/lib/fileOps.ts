'use client';

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

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

export const exportObjectAsGLB = async (root: THREE.Object3D, filename = 'editor-scene.glb') => {
  const exporter = new GLTFExporter();
  const clone = root.clone(true);

  const result = await exporter.parseAsync(clone, {
    binary: true,
    trs: false,
    onlyVisible: true,
    animations: [],
  });

  if (result instanceof ArrayBuffer) {
    downloadBlob(new Blob([result], { type: 'model/gltf-binary' }), filename);
    return;
  }

  downloadBlob(new Blob([JSON.stringify(result, null, 2)], { type: 'model/gltf+json' }), filename.replace(/\.glb$/i, '.gltf'));
};
