'use client';

import { useCallback } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { useEditorStore } from '@/store/editorStore';
import { useHistoryStore } from '@/store/historyStore';
import { useSceneStore } from '@/store/sceneStore';
import { useTimelineStore } from '@/store/timelineStore';

type TransformGizmoProps = {
  objectId: string | null;
  object: THREE.Object3D | null;
};

const toVec3 = (value: THREE.Vector3 | THREE.Euler): [number, number, number] => [value.x, value.y, value.z];

export default function TransformGizmo({ objectId, object }: TransformGizmoProps) {
  const activeTool = useEditorStore((state) => state.activeTool);
  const snapping = useEditorStore((state) => state.snapping);
  const snapStep = useEditorStore((state) => state.snapStep);
  const updateObject = useSceneStore((state) => state.updateObject);
  const pushSnapshot = useHistoryStore((state) => state.pushSnapshot);
  const autoKey = useTimelineStore((state) => state.autoKey);
  const addTransformKeyframe = useTimelineStore((state) => state.addTransformKeyframe);

  const syncTransform = useCallback(() => {
    if (!object || !objectId) return;

    const transform = {
      position: toVec3(object.position),
      rotation: toVec3(object.rotation),
      scale: toVec3(object.scale),
    };

    updateObject(objectId, transform);

    if (autoKey) {
      const sceneObject = useSceneStore.getState().objects.find((item) => item.uuid === objectId);
      if (sceneObject) addTransformKeyframe({ ...sceneObject, ...transform });
    }
  }, [addTransformKeyframe, autoKey, object, objectId, updateObject]);

  if (!object || !objectId || activeTool === 'select' || activeTool === 'edit' || activeTool === 'sculpt') return null;

  return (
    <TransformControls
      object={object}
      mode={activeTool}
      translationSnap={snapping ? snapStep : null}
      rotationSnap={snapping ? THREE.MathUtils.degToRad(15) : null}
      scaleSnap={snapping ? snapStep : null}
      onMouseDown={pushSnapshot}
      onObjectChange={syncTransform}
    />
  );
}
