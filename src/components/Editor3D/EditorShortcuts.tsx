'use client';

import { useEffect, useRef } from 'react';
import { sampleObjectTransform } from '@/lib/animation';
import { createPrimitiveEditableMesh, deleteFace, extrudeFace } from '@/lib/meshOps';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useMaterialStore } from '@/store/materialStore';
import { useSceneStore } from '@/store/sceneStore';
import { useTimelineStore } from '@/store/timelineStore';
import { cloneEditableMesh, type EditorMaterial, type SceneObject } from '@/store/types';
import { getSubtreeIds, type SceneDuplicateResult } from '@/store/sceneTree';

type ClipboardObject = {
  material: EditorMaterial | null;
  object: SceneObject;
};

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};

const cloneMaterialPatch = (material: EditorMaterial): Partial<Omit<EditorMaterial, 'uuid' | 'objectId'>> => ({
  name: material.name,
  color: material.color,
  metalness: material.metalness,
  roughness: material.roughness,
  emissive: material.emissive,
  emissiveIntensity: material.emissiveIntensity,
  opacity: material.opacity,
  textureUrl: material.textureUrl,
  textureName: material.textureName,
  normalMapUrl: material.normalMapUrl,
  roughnessMapUrl: material.roughnessMapUrl,
  displacementMapUrl: material.displacementMapUrl,
});

const cloneDuplicateMaterials = (
  duplicate: SceneDuplicateResult,
  materials: ReturnType<typeof useMaterialStore.getState>,
  suffix: string,
) => {
  duplicate.materialIdMap.forEach((newMaterialId, oldMaterialId) => {
    const sourceMaterial = materials.materials[oldMaterialId];
    if (!sourceMaterial) return;
    const newObjectId = duplicate.idMap.get(sourceMaterial.objectId);
    if (!newObjectId) return;
    const newMaterial = materials.createMaterialForObject(newObjectId, newMaterialId, `${sourceMaterial.name} ${suffix}`);
    materials.updateMaterial(newMaterial.uuid, cloneMaterialPatch(sourceMaterial));
  });
};

const applyTimelineFrame = (frame: number) => {
  const timeline = useTimelineStore.getState();
  const scene = useSceneStore.getState();
  const animatedObjectIds = Array.from(new Set(timeline.keyframes.map((keyframe) => keyframe.objectId)));

  timeline.setPlayheadFrame(frame);
  animatedObjectIds.forEach((objectId) => {
    const sample = sampleObjectTransform(timeline.keyframes, objectId, frame);
    if (sample) scene.updateObject(objectId, sample);
  });
};

const duplicateObject = (object: SceneObject) => {
  const scene = useSceneStore.getState();
  const materials = useMaterialStore.getState();
  const editor = useEditorStore.getState();
  const duplicate = scene.duplicateObject(object.uuid);
  if (!duplicate) return null;
  cloneDuplicateMaterials(duplicate, materials, 'Copy');
  const copy = useSceneStore.getState().objects.find((item) => item.uuid === duplicate.rootId) ?? null;
  editor.setSelectedObject(duplicate.rootId);
  return copy;
};

export default function EditorShortcuts() {
  const clipboardRef = useRef<ClipboardObject | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const meta = event.ctrlKey || event.metaKey;
      const editor = useEditorStore.getState();
      const scene = useSceneStore.getState();
      const materials = useMaterialStore.getState();
      const history = useHistoryStore.getState();
      const timeline = useTimelineStore.getState();
      const selectedObject = scene.objects.find((object) => object.uuid === (editor.selectedObjectIds[0] ?? null)) ?? null;
      const selectedMaterial = selectedObject ? materials.materials[selectedObject.materialId] ?? null : null;

      if (key === ' ') {
        event.preventDefault();
        timeline.togglePlayback();
        return;
      }

      if (key === 'arrowleft' || key === 'arrowright') {
        event.preventDefault();
        const direction = key === 'arrowleft' ? -1 : 1;
        applyTimelineFrame(timeline.playheadFrame + direction * (event.shiftKey ? 10 : 1));
        return;
      }

      if (key === 'i' && selectedObject) {
        event.preventDefault();
        timeline.addTransformKeyframe(selectedObject);
        return;
      }

      if (meta && key === 'z' && !event.shiftKey) {
        event.preventDefault();
        history.undo();
        return;
      }

      if ((meta && key === 'y') || (meta && event.shiftKey && key === 'z')) {
        event.preventDefault();
        history.redo();
        return;
      }

      if (meta && key === 'c') {
        if (!selectedObject) return;
        event.preventDefault();
        clipboardRef.current = {
          object: {
            ...selectedObject,
            geometry: selectedObject.geometry ? { ...selectedObject.geometry } : undefined,
            editableMesh: selectedObject.editableMesh ? cloneEditableMesh(selectedObject.editableMesh) : undefined,
            position: [...selectedObject.position],
            rotation: [...selectedObject.rotation],
            scale: [...selectedObject.scale],
          },
          material: selectedMaterial ? { ...selectedMaterial } : null,
        };
        return;
      }

      if (meta && key === 'v') {
        const clipboard = clipboardRef.current;
        if (!clipboard) return;
        event.preventDefault();
        history.pushSnapshot();
        const copy = duplicateObject(clipboard.object);
        if (!copy) return;
        clipboardRef.current = {
          object: { ...copy, position: [...copy.position], rotation: [...copy.rotation], scale: [...copy.scale] },
          material: materials.materials[copy.materialId] ?? null,
        };
        return;
      }

      if ((meta && key === 'd') || (!meta && key === 'd' && event.shiftKey)) {
        if (!selectedObject) return;
        event.preventDefault();
        history.pushSnapshot();
        duplicateObject(selectedObject);
        return;
      }

      if (key === 'd' && !meta && !event.shiftKey) {
        event.preventDefault();
        editor.setActiveTool('draw3D');
        return;
      }

      if (key === 'delete' || key === 'backspace') {
        if (timeline.selectedKeyframeIds.length > 0) {
          event.preventDefault();
          timeline.removeSelectedKeyframes();
          return;
        }

        if (!selectedObject) return;
        event.preventDefault();
        history.pushSnapshot();

        if (editor.activeTool === 'edit' && selectedObject.editableMesh && editor.selectedFaceIndex !== null) {
          scene.updateObject(selectedObject.uuid, {
            editableMesh: deleteFace(selectedObject.editableMesh, editor.selectedFaceIndex),
          });
          editor.setSelectedFace(null);
          return;
        }

        const ids = getSubtreeIds(scene.objects, selectedObject.uuid);
        scene.removeObject(selectedObject.uuid);
        materials.removeMaterialsForObjects(ids);
        editor.clearSelectedObjects();
        return;
      }

      if (key === 'escape') {
        event.preventDefault();
        editor.clearMeshSelection();
        editor.setActiveTool('select');
        return;
      }

      if (key === 'g') {
        event.preventDefault();
        editor.setActiveTool('translate');
        return;
      }

      if (key === 'r') {
        event.preventDefault();
        editor.setActiveTool('rotate');
        return;
      }

      if (key === 's' && !meta) {
        event.preventDefault();
        editor.setActiveTool('scale');
        return;
      }

      if (key === 'e') {
        if (selectedObject?.editableMesh && editor.selectedFaceIndex !== null) {
          event.preventDefault();
          history.pushSnapshot();
          scene.updateObject(selectedObject.uuid, {
            editableMesh: extrudeFace(selectedObject.editableMesh, editor.selectedFaceIndex),
          });
          return;
        }

        event.preventDefault();
        editor.setActiveTool('edit');
        return;
      }

      if (key === 'v') {
        event.preventDefault();
        editor.setMeshSelectionMode('vertex');
        editor.setActiveTool('edit');
        return;
      }

      if (key === '2' && !meta && !event.shiftKey) {
        event.preventDefault();
        editor.setMeshSelectionMode('edge');
        editor.setActiveTool('edit');
        return;
      }

      if (key === 'f') {
        event.preventDefault();
        editor.setMeshSelectionMode('face');
        editor.setActiveTool('edit');
        return;
      }

      if (key === 'k' && !meta && !event.shiftKey) {
        event.preventDefault();
        editor.setActiveTool('knife');
        return;
      }

      if (key === 'b') {
        event.preventDefault();
        if (selectedObject && !selectedObject.editableMesh && selectedObject.kind === 'primitive' && selectedObject.primitive) {
          history.pushSnapshot();
          scene.updateObject(selectedObject.uuid, {
            editableMesh: createPrimitiveEditableMesh(selectedObject.primitive, selectedObject.geometry),
          });
        }
        editor.setActiveTool('sculpt');
        return;
      }

      if (key === '[') {
        event.preventDefault();
        editor.setSculptRadius(editor.sculptRadius - 0.05);
        return;
      }

      if (key === ']') {
        event.preventDefault();
        editor.setSculptRadius(editor.sculptRadius + 0.05);
        return;
      }

      if (key === 'arrowup' && !meta) {
        event.preventDefault();
        editor.setSculptStrength(Math.min(1, editor.sculptStrength + 0.02));
        return;
      }

      if (key === 'arrowdown' && !meta) {
        event.preventDefault();
        editor.setSculptStrength(Math.max(0.01, editor.sculptStrength - 0.02));
        return;
      }

      if (key === 'x' && !meta && editor.activeTool === 'sculpt') {
        event.preventDefault();
        const inverse: Record<string, string> = { push: 'pull', pull: 'push', inflate: 'pinch', pinch: 'inflate' };
        const next = inverse[editor.sculptMode];
        if (next) editor.setSculptMode(next as never);
        return;
      }

      if (key === 'f' && event.shiftKey && !meta) {
        event.preventDefault();
        const order = ['smooth', 'sphere', 'sharp', 'linear'] as const;
        const idx = order.indexOf(editor.sculptFalloff);
        editor.setSculptFalloff(order[(idx + 1) % order.length]);
        return;
      }

      if (key === 'p' && !meta) {
        event.preventDefault();
        if (editor.activeTool === 'sculpt') {
          editor.setSculptPressureStrength(!editor.sculptPressureStrength);
        } else {
          editor.setActiveTool('drawPolygon');
        }
        return;
      }

      if (key === ';') {
        event.preventDefault();
        editor.setSculptPenSmoothing(Math.min(0.9, editor.sculptPenSmoothing + 0.1));
        return;
      }

      if (key === "'") {
        event.preventDefault();
        editor.setSculptPenSmoothing(Math.max(0, editor.sculptPenSmoothing - 0.1));
        return;
      }

      if (key === 'l' && !meta && !event.shiftKey && selectedObject) {
        event.preventDefault();
        const layer = scene.layers.find((l) => l.id === selectedObject.layerId);
        if (!layer) return;
        history.pushSnapshot();
        scene.updateLayer(layer.id, { visible: !layer.visible });
        return;
      }

      if (key === 'l' && event.shiftKey && selectedObject) {
        event.preventDefault();
        const layer = scene.layers.find((l) => l.id === selectedObject.layerId);
        if (!layer) return;
        history.pushSnapshot();
        scene.updateLayer(layer.id, { locked: !layer.locked });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}
