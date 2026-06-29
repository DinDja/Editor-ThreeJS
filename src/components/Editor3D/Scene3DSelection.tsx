'use client';

import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import { TransformControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { flattenPageNodes } from '@/lib/page-builder/tree';
import { useEditorStore } from '@/store/editorStore';
import { useExperienceStore } from '@/store/experienceStore';
import { useSceneStore } from '@/store/sceneStore';

type Scene3DSelectionProps = {
  enabled: boolean;
  objectRefs: React.MutableRefObject<Map<string, THREE.Object3D>>;
  setOrbitEnabled: Dispatch<SetStateAction<boolean>>;
};

const HIGHLIGHT_COLOR = '#34d399';
const HIGHLIGHT_OPACITY = 0.5;
const OUTLINE_PULSE_SPEED = 1.8;

export default function Scene3DSelection({ enabled, objectRefs, setOrbitEnabled }: Scene3DSelectionProps) {
  const selectedObjectIds = useEditorStore((state) => state.selectedObjectIds);
  const setSelectedObject = useEditorStore((state) => state.setSelectedObject);
  const clearSelectedObjects = useEditorStore((state) => state.clearSelectedObjects);
  const scene3DGizmoMode = useEditorStore((state) => state.scene3DGizmoMode);
  const { gl, scene, camera } = useThree();
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const pointerRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const highlightGroupRef = useRef<THREE.Group>(new THREE.Group());
  const transformRef = useRef<any>(null);
  const draggingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(false);

  const targetObject = useMemo<THREE.Object3D | null>(() => {
    if (selectedObjectIds.length !== 1) return null;
    return objectRefs.current.get(selectedObjectIds[0]) ?? null;
  }, [selectedObjectIds, objectRefs]);

  // Build a list of selectable meshes (group children that aren't lights/groups)
  const getSelectableMeshes = (): THREE.Object3D[] => {
    const meshes: THREE.Object3D[] = [];
    for (const object of objectRefs.current.values()) {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) meshes.push(child);
      });
    }
    return meshes;
  };

  // Click on the canvas: raycast against meshes; click on background clears selection
  useEffect(() => {
    if (!enabled) return;
    const dom = gl.domElement;
    let downX = 0;
    let downY = 0;
    const onPointerDown = (event: PointerEvent) => {
      // Only respond to primary button and not when the user is dragging the gizmo
      if (event.button !== 0) return;
      if (draggingRef.current) return;
      downX = event.clientX;
      downY = event.clientY;
    };
    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (draggingRef.current) return;
      // Only treat as a click if pointer didn't move much (otherwise it was a drag/orbit)
      const dx = event.clientX - downX;
      const dy = event.clientY - downY;
      if (dx * dx + dy * dy > 16) return;

      const rect = dom.getBoundingClientRect();
      pointerRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(pointerRef.current, camera);
      const meshes = getSelectableMeshes();
      const hits = raycasterRef.current.intersectObjects(meshes, true);
      if (hits.length === 0) {
        clearSelectedObjects();
        return;
      }
      // Walk up to find the scene object root (registered in objectRefs)
      let hitObject: THREE.Object3D | null = hits[0].object;
      let sceneUuid: string | null = null;
      while (hitObject) {
        // objectRefs stores the top-level THREE.Group for each scene object
        for (const [uuid, ref] of objectRefs.current.entries()) {
          if (ref === hitObject) {
            sceneUuid = uuid;
            break;
          }
        }
        if (sceneUuid) break;
        hitObject = hitObject.parent;
      }
      if (sceneUuid) {
        setSelectedObject(sceneUuid, event.shiftKey);
        // Sync: select the corresponding sceneCanvas page node in the 2D builder
        const page = useExperienceStore.getState().page;
        const allNodes = flattenPageNodes(page);
        const canvasNode = allNodes.find((entry) => entry.node.type === 'sceneCanvas');
        if (canvasNode) {
          useExperienceStore.getState().setSelectedPageNode(canvasNode.node.id);
        }
      } else {
        clearSelectedObjects();
      }
    };
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointerup', onPointerUp);
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointerup', onPointerUp);
    };
  }, [enabled, gl, camera, objectRefs, setSelectedObject, clearSelectedObjects]);

  // Build and update the selection highlight (wireframe outline)
  useFrame(({ clock }) => {
    const group = highlightGroupRef.current;
    if (!group) return;
    // Wipe previous highlight children
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) (child as any).material.dispose();
    }
    if (!enabled) return;
    const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * OUTLINE_PULSE_SPEED);
    const opacity = HIGHLIGHT_OPACITY * (0.5 + 0.5 * pulse);
    for (const uuid of selectedObjectIds) {
      const target = objectRefs.current.get(uuid);
      if (!target) continue;
      target.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const edges = new THREE.EdgesGeometry(child.geometry, 30);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: HIGHLIGHT_COLOR,
          transparent: true,
          opacity,
          depthTest: true,
        });
        const lines = new THREE.LineSegments(edges, lineMaterial);
        // The mesh's world transform is what we want
        child.getWorldPosition(lines.position);
        child.getWorldQuaternion(lines.quaternion);
        child.getWorldScale(lines.scale);
        lines.renderOrder = 999;
        group.add(lines);
      });
    }
  });

  // Attach the highlight group to the main scene so transforms follow world space
  useEffect(() => {
    if (!isMountedRef.current) {
      scene.add(highlightGroupRef.current);
      isMountedRef.current = true;
    }
    return () => {
      scene.remove(highlightGroupRef.current);
      isMountedRef.current = false;
    };
  }, [scene]);

  // Disable orbit while gizmo is being dragged; sync transformed object to store
  useEffect(() => {
    const controls = transformRef.current;
    if (!controls || !targetObject) return;
    const onDraggingChange = (event: { value: boolean }) => {
      draggingRef.current = event.value;
      setOrbitEnabled(!event.value);
    };
    const onChange = () => {
      if (!draggingRef.current) return;
      // Push the new world position/rotation/scale back into the scene store
      useSceneStore.getState().updateObject(targetObject.uuid, {
        position: [targetObject.position.x, targetObject.position.y, targetObject.position.z],
        rotation: [targetObject.rotation.x, targetObject.rotation.y, targetObject.rotation.z],
        scale: [targetObject.scale.x, targetObject.scale.y, targetObject.scale.z],
      });
    };
    controls.addEventListener?.('dragging-changed', onDraggingChange);
    controls.addEventListener?.('change', onChange);
    return () => {
      controls.removeEventListener?.('dragging-changed', onDraggingChange);
      controls.removeEventListener?.('change', onChange);
    };
  }, [targetObject, setOrbitEnabled]);

  // Hotkeys for gizmo mode (V/R/S) when a 3D object is selected inside the page builder
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (useEditorStore.getState().selectedObjectIds.length === 0) return;
      const setMode = useEditorStore.getState().setScene3DGizmoMode;
      if (event.key.toLowerCase() === 'v') {
        event.preventDefault();
        setMode('translate');
      } else if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        setMode('rotate');
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        setMode('scale');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);

  if (!enabled) return null;
  if (!targetObject) return null;
  // Show the gizmo in translate / rotate / scale modes only
  return (
    <TransformControls
      ref={transformRef}
      object={targetObject}
      mode={scene3DGizmoMode}
      size={0.8}
      showX
      showY
      showZ
    />
  );
}
